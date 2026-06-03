import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import fs from 'fs';
import path from 'path';
import { logError } from '../lib/logger.js';
import { query } from '../db/index.js';
import slugify from 'slugify';



export default async function handler(req, res, currentKvClient) {
  const currentKv = currentKvClient || kv;
  if (req.method === 'GET') {
    try {
      const cookies = parse(req.headers.cookie || '');
      const token = cookies.authToken;

      if (!token) {
        return res.status(401).json({ message: 'Not authenticated. Please log in.' });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (error) {
        await logError(error, 'JWT Verification Error', 'dashboard_error.log');
        return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
      }

      const userId = decoded.userId;

      // Fetch user from PostgreSQL
      const userResult = await query('SELECT email, credits FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
          return res.status(404).json({ message: 'User profile not found. Please log in again.' });
      }
      const user = userResult.rows[0];

      // Retrieve generated pages for the user from PostgreSQL
      const pagesResult = await query(
        `SELECT id, file_name, slug, business_name, service, town, zip_code, created_at, updated_at, telephone, price_range, opening_hours, enable_ai_copy, ai_style 
         FROM seo_pages WHERE user_id = $1`,
        [userId]
      );
      const generatedPages = [];

      for (const row of pagesResult.rows) {
        const pageId = row.id;
        const views = await currentKv.get(`page:${pageId}:views`) || 0;
        const uniqueVisitors = await currentKv.scard(`page:${pageId}:unique_visitors`) || 0;
        const serviceSlug = slugify(row.service || '', { lower: true, strict: true });
        const townSlug = slugify(row.town || '', { lower: true, strict: true });
        const url = `/${userId}/${serviceSlug}-in-${townSlug}.html`;

        generatedPages.push({
          pageId,
          businessName: row.business_name,
          service: row.service,
          town: row.town,
          zipCode: row.zip_code,
          createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
          updatedAt: row.updated_at ? row.updated_at.toISOString() : new Date().toISOString(),
          telephone: row.telephone,
          priceRange: row.price_range,
          openingHours: row.opening_hours,
          enableAICopy: row.enable_ai_copy,
          aiStyle: row.ai_style,
          url,
          views: parseInt(views),
          uniqueVisitors: parseInt(uniqueVisitors),
        });
      }

      // Retrieve credit transaction history
      const transactionStrings = await currentKv.lrange(`user:${userId}:credittransactions`, 0, 100) || [];
      const creditTransactions = transactionStrings.map(t => JSON.parse(t));

      // Retrieve indexing notifications
      const notificationStrings = await currentKv.lrange(`user:${userId}:notifications`, 0, 49) || [];
      const indexingNotifications = notificationStrings.map(n => JSON.parse(n));

      // Retrieve captured leads for the user
      const leadsResult = await query(
          'SELECT id, name, email, phone, message, url, created_at FROM leads WHERE user_id = $1 ORDER BY created_at DESC',
          [userId]
      );
      const leads = leadsResult.rows;

      // Check if user has paid
      let isPaidUser = false;
      const agencyResult = await query('SELECT is_agency, subscription_status FROM users WHERE id = $1', [userId]);
      if (agencyResult.rows.length > 0) {
          const u = agencyResult.rows[0];
          if (u.is_agency || u.subscription_status === 'active') {
              isPaidUser = true;
          }
      }
      if (!isPaidUser) {
          isPaidUser = creditTransactions.some(t => t.amount > 0);
      }

      // Securely format and obscure leads if unpaid
      const formattedLeads = leads.map(lead => {
          if (isPaidUser) {
              return {
                  ...lead,
                  isLocked: false
              };
          } else {
              return {
                  ...lead,
                  email: lead.email ? lead.email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 5)) + c) : '',
                  phone: lead.phone ? lead.phone.slice(0, -4).replace(/\d/g, '*') + lead.phone.slice(-4) : '',
                  isLocked: true
              };
          }
      });

      let dailyStats = [];
      try {
        const viewsAnalyticsResult = await query(
          `SELECT DATE(timestamp) as date, COUNT(*) as count
           FROM user_events
           WHERE user_id = $1::text AND event_name = 'page_view' AND timestamp >= NOW() - INTERVAL '30 days'
           GROUP BY DATE(timestamp)
           ORDER BY DATE(timestamp) ASC`,
          [userId]
        );

        const leadsAnalyticsResult = await query(
          `SELECT DATE(created_at) as date, COUNT(*) as count
           FROM leads
           WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
           GROUP BY DATE(created_at)
           ORDER BY DATE(created_at) ASC`,
          [userId]
        );

        const now = new Date();
        for (let i = 29; i >= 0; i--) {
          const d = new Date();
          d.setDate(now.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          dailyStats.push({
            date: dateStr,
            views: 0,
            leads: 0
          });
        }

        viewsAnalyticsResult.rows.forEach(row => {
          const dStr = row.date instanceof Date ? row.date.toISOString().split('T')[0] : new Date(row.date).toISOString().split('T')[0];
          const stat = dailyStats.find(s => s.date === dStr);
          if (stat) {
            stat.views = parseInt(row.count || 0);
          }
        });

        leadsAnalyticsResult.rows.forEach(row => {
          const dStr = row.date instanceof Date ? row.date.toISOString().split('T')[0] : new Date(row.date).toISOString().split('T')[0];
          const stat = dailyStats.find(s => s.date === dStr);
          if (stat) {
            stat.leads = parseInt(row.count || 0);
          }
        });
      } catch (err) {
        console.error('Error fetching analytics data:', err);
      }

      return res.status(200).json({
        email: user.email,
        credits: user.credits,
        generatedPages,
        creditTransactions,
        indexingNotifications,
        leads: formattedLeads,
        isPaidUser,
        dailyStats
      });

    } catch (error) {
      await logError(error, 'Dashboard Data Fetch Error', 'dashboard_error.log');
      return res.status(500).json({ message: 'Internal server error.' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
