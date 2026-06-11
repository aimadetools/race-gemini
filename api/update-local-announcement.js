import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const cookies = parse(req.headers.cookie || '');
  const token = cookies.authToken || cookies.auth;

  if (!token) {
    return res.status(401).json({ message: 'Authorization required. Please log in.' });
  }

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.userId;
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
  }

  const { announcementText, announcementType, announcementCouponCode, expiresDays } = req.body;

  // Validation
  if (announcementText !== undefined && announcementText !== null && announcementText.length > 1000) {
    return res.status(400).json({ message: 'Announcement text must be under 1000 characters.' });
  }

  const validTypes = ['news', 'offer', 'event'];
  const type = validTypes.includes(announcementType) ? announcementType : 'news';
  const coupon = announcementCouponCode ? announcementCouponCode.trim().substring(0, 50) : null;
  const text = announcementText ? announcementText.trim() : null;

  let expiresAt = null;
  if (expiresDays && parseInt(expiresDays) > 0) {
    const days = parseInt(expiresDays);
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
  }

  try {
    const result = await query(
      `UPDATE users 
       SET announcement_text = $1, 
           announcement_type = $2, 
           announcement_coupon_code = $3, 
           announcement_updated_at = NOW(), 
           announcement_expires_at = $4 
       WHERE id = $5 
       RETURNING announcement_text, announcement_type, announcement_coupon_code, announcement_updated_at, announcement_expires_at`,
      [text, type, coupon, expiresAt, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const updated = result.rows[0];

    return res.status(200).json({
      message: 'Local update published successfully!',
      announcement: {
        text: updated.announcement_text,
        type: updated.announcement_type,
        couponCode: updated.announcement_coupon_code,
        updatedAt: updated.announcement_updated_at ? updated.announcement_updated_at.toISOString() : null,
        expiresAt: updated.announcement_expires_at ? updated.announcement_expires_at.toISOString() : null,
      }
    });
  } catch (error) {
    await logError(error, 'Update Local Announcement API - DB Failure', 'announcement_error.log');
    return res.status(500).json({ message: 'Internal server error while publishing update.' });
  }
}
