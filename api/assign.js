export default function handler(req, res) {
  const { experiment } = req.query;
  if (!experiment) {
    return res.status(400).json({ error: 'Experiment name is required' });
  }

  // Basic validation for experiment name
  if (!/^[a-zA-Z0-9_-]+$/.test(experiment)) {
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
    res.setHeader('Set-Cookie', `${cookieName}=${variant}; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax`);
  }

  res.status(200).json({ experiment, variant });
}