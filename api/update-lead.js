import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { logError } from '../lib/logger.js';
import { query } from '../db/index.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  const cookies = parse(req.headers.cookie || '');
  const token = cookies.authToken;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated. Please log in.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    await logError(error, 'Update Lead - JWT Verification Error', 'update_lead_error.log');
    return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
  }

  const userId = decoded.userId;
  const { leadId, status, notes } = req.body;

  if (!leadId) {
    return res.status(400).json({ message: 'Missing required field: leadId' });
  }

  try {
    // 1. Fetch the lead to verify ownership
    const leadResult = await query(
      'SELECT id, user_id, is_unlocked FROM leads WHERE id = $1',
      [leadId]
    );

    if (leadResult.rows.length === 0) {
      return res.status(404).json({ message: 'Lead not found.' });
    }

    const lead = leadResult.rows[0];

    // Check ownership or agency permissions
    let isAuthorized = false;
    if (lead.user_id === userId) {
      isAuthorized = true;
    } else {
      // Check if user is the agency that manages the client who owns the lead
      const clientResult = await query('SELECT agency_id FROM users WHERE id = $1', [lead.user_id]);
      if (clientResult.rows.length > 0 && clientResult.rows[0].agency_id === userId) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized. You do not own this lead.' });
    }

    // 2. Check if lead is unlocked
    // Fetch user's billing status to determine if leads are auto-unlocked
    let isPaidUser = false;
    const agencyResult = await query('SELECT is_agency, subscription_status FROM users WHERE id = $1', [lead.user_id]);
    if (agencyResult.rows.length > 0) {
      const u = agencyResult.rows[0];
      if (u.is_agency || u.subscription_status === 'active') {
        isPaidUser = true;
      }
    }

    if (!isPaidUser) {
      if (!lead.is_unlocked) {
        return res.status(403).json({ message: 'Lead is locked. Please unlock it using credits first.' });
      }
    }

    // Validate status if provided
    const validStatuses = ['New', 'Contacted', 'Proposal Sent', 'Won', 'Lost'];
    let updateFields = [];
    let queryParams = [leadId];
    let paramIdx = 2;

    if (status !== undefined) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }
      updateFields.push(`status = $${paramIdx}`);
      queryParams.push(status);
      paramIdx++;
    }

    if (notes !== undefined) {
      if (typeof notes !== 'string') {
        return res.status(400).json({ message: 'Notes must be a string.' });
      }
      if (notes.length > 5000) {
        return res.status(400).json({ message: 'Notes must be less than 5000 characters.' });
      }
      updateFields.push(`notes = $${paramIdx}`);
      queryParams.push(notes);
      paramIdx++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update. Please provide status or notes.' });
    }

    const updateQuery = `
      UPDATE leads 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING id, status, notes
    `;

    const updatedResult = await query(updateQuery, queryParams);

    return res.status(200).json({
      success: true,
      message: 'Lead updated successfully.',
      lead: updatedResult.rows[0]
    });

  } catch (error) {
    await logError(error, 'Update Lead - General Error', 'update_lead_error.log');
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
