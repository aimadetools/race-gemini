import { logError } from '../../lib/logger';

export default async function handler(req, res) {
  try {
  const { experiment } = req.query;
  if (!experiment) {
    await logError(new Error('Experiment name is required.'), 'Assign API - Missing Experiment Name', 'assign_error.log');
    return res.status(400).json({ error: 'Experiment name is required' });
  }

  // Basic validation for experiment name
  if (!/^[a-zA-Z0-9_-]+$/.test(experiment)) {
    await logError(new Error(`Invalid experiment name format: ${experiment}`), 'Assign API - Invalid Experiment Name Format', 'assign_error.log');
    return res.status(400).json({ error: 'Invalid experiment name format' });
  }


  // Check for existing cookie
  const cookies = req.headers.cookie || '';
  const cookieName = `ab_${experiment}`;
  const match = cookies.match(new RegExp('(^| )' + cookieName + '=([^;]+)'));
  
  let variant = match ? match[2] : null;

  if (!variant) {
    // Simple 50/50 split
    variant = Math.random() < 0.5 ? 'A' : 'B';
    
    // Set cookie (valid for 30 days)
    // SameSite=Lax helps prevent CSRF attacks by not sending the cookie with cross-site requests
    res.setHeader('Set-Cookie', `${cookieName}=${variant}; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax`);
  }

  res.status(200).json({ experiment, variant });
  } catch (error) { // Catch for main logic
    await logError(error, 'Assign API - General Error', 'assign_error.log');
    return res.status(500).json({ message: 'Internal server error.' });
  }
}