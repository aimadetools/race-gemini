import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { logError } from '../lib/logger.js';
import { query } from '../db/index.js';

function escapeCsvValue(val) {
  if (val === null || val === undefined) {
    return '';
  }
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default async function handler(req, res, currentKvClient) {
  const currentKv = currentKvClient || kv;
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

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
      await logError(error, 'JWT Verification Error in export-leads', 'export_leads_error.log');
      return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
    }

    const userId = decoded.userId;

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
      // Check credit transaction history in KV
      const transactionStrings = await currentKv.lrange(`user:${userId}:credittransactions`, 0, 100) || [];
      const creditTransactions = transactionStrings.map(t => JSON.parse(t));
      isPaidUser = creditTransactions.some(t => t.amount > 0);
    }

    if (!isPaidUser) {
      return res.status(403).json({
        message: 'Lead export is a premium feature. Please upgrade to a paid pack to unlock your leads.'
      });
    }

    // Retrieve captured leads for the user
    const leadsResult = await query(
      'SELECT name, email, phone, message, url, created_at FROM leads WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    const leads = leadsResult.rows;

    const format = (req.query && req.query.format) || 'csv';

    if (format === 'json' || format === 'pdf') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=localleads-captured-leads.json');
      return res.status(200).send(JSON.stringify(leads, null, 2));
    }

    // Build CSV Content
    const csvHeaders = ['Name', 'Email', 'Phone', 'Message', 'Source Page URL', 'Date Captured'];
    const csvRows = [csvHeaders.join(',')];

    for (const lead of leads) {
      const formattedDate = lead.created_at ? new Date(lead.created_at).toISOString() : '';
      const row = [
        escapeCsvValue(lead.name),
        escapeCsvValue(lead.email),
        escapeCsvValue(lead.phone),
        escapeCsvValue(lead.message),
        escapeCsvValue(lead.url),
        escapeCsvValue(formattedDate)
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=localleads-captured-leads.csv');
    return res.status(200).send(csvContent);

  } catch (error) {
    await logError(error, 'Lead Export Handler Error', 'export_leads_error.log');
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
