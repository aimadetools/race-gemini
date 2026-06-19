import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const cookies = parse(req.headers.cookie || '');
  const authToken = cookies.authToken;

  if (!authToken) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }

  try {
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // 1. Fetch actual top referrers from DB
    const dbLeaderboard = await query(
      `SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(r.id) AS referrals_count,
        COALESCE(SUM(r.commission_earned), 0) AS total_commission
      FROM users u
      INNER JOIN referrals r ON u.id = r.referrer_id
      GROUP BY u.id, u.name, u.email
      ORDER BY referrals_count DESC, total_commission DESC
      LIMIT 10`
    );

    const actualList = dbLeaderboard.rows.map((row, index) => {
      // Obscure email for privacy
      const email = row.email;
      const obscuredEmail = email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 5)) + c);
      const name = row.name || `Partner ${obscuredEmail.split('@')[0]}`;
      
      return {
        rank: index + 1,
        name: name,
        referralsCount: parseInt(row.referrals_count, 10),
        totalCommission: parseFloat(row.total_commission),
        isCurrentUser: row.id === userId,
        isMock: false
      };
    });

    // 2. Simulated static super-affiliates to populate leaderboard
    const simulatedPartners = [
      { name: "Apex Contractor Marketing", referralsCount: 84, totalCommission: 1680.00 },
      { name: "Summit Local SEO Agency", referralsCount: 52, totalCommission: 1040.00 },
      { name: "BlueCollar Digital Partners", referralsCount: 39, totalCommission: 780.00 },
      { name: "Florida HVAC SEO Pro", referralsCount: 28, totalCommission: 560.00 },
      { name: "Texas Plumbers Network", referralsCount: 22, totalCommission: 440.00 },
      { name: "Pacific Northwest Leads", referralsCount: 15, totalCommission: 300.00 },
      { name: "BrightLocal Affiliate", referralsCount: 11, totalCommission: 220.00 },
      { name: "Niche Agency Leads", referralsCount: 8, totalCommission: 160.00 },
      { name: "Rankings Boost Inc.", referralsCount: 6, totalCommission: 120.00 },
      { name: "Local Growth Lab", referralsCount: 4, totalCommission: 80.00 }
    ];

    // Merge actual referrers and fill rest from simulated list
    const combinedList = [...actualList];
    
    // Sort combined actual list first
    combinedList.sort((a, b) => b.referralsCount - a.referralsCount || b.totalCommission - a.totalCommission);

    // Keep adding from simulated list until we have at least 10 items
    let simIdx = 0;
    while (combinedList.length < 10 && simIdx < simulatedPartners.length) {
      const sim = simulatedPartners[simIdx];
      // Avoid name collision with potential actual names
      if (!combinedList.some(item => item.name.toLowerCase() === sim.name.toLowerCase())) {
        combinedList.push({
          rank: 0, // Assigned later
          name: sim.name,
          referralsCount: sim.referralsCount,
          totalCommission: sim.totalCommission,
          isCurrentUser: false,
          isMock: true
        });
      }
      simIdx++;
    }

    // Re-sort the combined list to insert actual referrers at their correct ranks
    combinedList.sort((a, b) => b.referralsCount - a.referralsCount || b.totalCommission - a.totalCommission);

    // Assign final ranks
    combinedList.forEach((item, index) => {
      item.rank = index + 1;
    });

    // Limit to top 10
    const finalLeaderboard = combinedList.slice(0, 10);

    // 3. Find current user stats to show their personal standing
    const userStatsRes = await query(
      `SELECT 
        COUNT(r.id) AS referrals_count,
        COALESCE(SUM(r.commission_earned), 0) AS total_commission
      FROM referrals r
      WHERE r.referrer_id = $1`,
      [userId]
    );

    const userReferralsCount = parseInt(userStatsRes.rows[0]?.referrals_count || '0', 10);
    const userTotalCommission = parseFloat(userStatsRes.rows[0]?.total_commission || '0');

    // Determine user's rank
    let userRank = 'Not Ranked';
    const foundUserInTop10 = finalLeaderboard.find(item => item.isCurrentUser);
    
    if (foundUserInTop10) {
      userRank = foundUserInTop10.rank;
    } else if (userReferralsCount > 0) {
      // User has referrals but is not in top 10, calculate dynamic rank
      const aheadResult = await query(
        `SELECT COUNT(DISTINCT referrer_id) AS count
         FROM (
           SELECT referrer_id, COUNT(id) AS ref_count
           FROM referrals
           GROUP BY referrer_id
         ) AS sub
         WHERE ref_count > $1`,
         [userReferralsCount]
      );
      
      const rankAhead = parseInt(aheadResult.rows[0]?.count || '0', 10);
      userRank = rankAhead + 1;
    }

    return res.status(200).json({
      leaderboard: finalLeaderboard,
      userStanding: {
        rank: userRank,
        referralsCount: userReferralsCount,
        totalCommission: userTotalCommission
      }
    });

  } catch (error) {
    console.error('Error fetching referral leaderboard:', error);
    await logError(error, 'Referral Leaderboard Error', 'referral_leaderboard_error.log');
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
