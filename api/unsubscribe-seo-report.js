import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Method Not Allowed</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 50px; background: #111827; color: #f9fafb; }
        </style>
      </head>
      <body>
        <h1>Method Not Allowed</h1>
        <p>This endpoint only supports GET requests.</p>
      </body>
      </html>
    `);
  }

  const { email } = req.query;

  if (!email) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invalid Request - LocalLeads</title>
        <style>
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: radial-gradient(circle at top, #1e293b 0%, #0f172a 100%);
            color: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
          }
          .card {
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 16px;
            max-width: 480px;
            width: 100%;
            text-align: center;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
          }
          h1 { font-size: 24px; margin-top: 0; color: #ef4444; }
          p { color: #cbd5e1; line-height: 1.6; margin-bottom: 24px; }
          .btn {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            transition: all 0.2s ease;
          }
          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Invalid Link</h1>
          <p>No email address was provided in the unsubscribe request. Please use the original link in your email.</p>
          <a href="https://www.localseogen.com" class="btn">Go to LocalLeads</a>
        </div>
      </body>
      </html>
    `);
  }

  try {
    const cleanEmail = email.trim().toLowerCase();

    // Perform the database update
    const result = await query(
      'UPDATE users SET weekly_report_enabled = FALSE WHERE LOWER(email) = $1',
      [cleanEmail]
    );

    const isSuccess = result.rowCount && result.rowCount > 0;

    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Unsubscribed Successful - LocalLeads</title>
        <style>
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: radial-gradient(circle at top, #1e293b 0%, #0f172a 100%);
            color: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
          }
          .card {
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 16px;
            max-width: 480px;
            width: 100%;
            text-align: center;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
          }
          .icon {
            font-size: 48px;
            margin-bottom: 20px;
            color: #10b981;
          }
          .icon.warn {
            color: #f59e0b;
          }
          h1 { font-size: 24px; margin-top: 0; margin-bottom: 12px; }
          p { color: #cbd5e1; line-height: 1.6; margin-bottom: 28px; }
          .btn {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            transition: all 0.2s ease;
          }
          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          }
        </style>
      </head>
      <body>
        <div class="card">
          ${isSuccess ? `
            <div class="icon">✓</div>
            <h1>Unsubscribed</h1>
            <p>You have successfully unsubscribed from the Weekly SEO Performance Report for <strong>${email}</strong>.</p>
          ` : `
            <div class="icon warn">!</div>
            <h1>Already Unsubscribed</h1>
            <p>The email address <strong>${email}</strong> is not currently subscribed or was already removed from the mailing list.</p>
          `}
          <p style="font-size: 13px; color: #94a3b8; margin-top: -15px;">You can re-enable this report anytime under CRM & Webhook settings inside your dashboard.</p>
          <a href="https://www.localseogen.com/dashboard.html" class="btn">Go to Dashboard</a>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    await logError(error, `Unsubscribe exception for email: ${email}`);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error - LocalLeads</title>
        <style>
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: radial-gradient(circle at top, #1e293b 0%, #0f172a 100%);
            color: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
          }
          .card {
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 16px;
            max-width: 480px;
            width: 100%;
            text-align: center;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
          }
          h1 { font-size: 24px; margin-top: 0; color: #ef4444; }
          p { color: #cbd5e1; line-height: 1.6; margin-bottom: 24px; }
          .btn {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            transition: all 0.2s ease;
          }
          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Internal Server Error</h1>
          <p>We encountered an issue processing your unsubscribe request. Please try again later or reply directly to the email to request unsubscription.</p>
          <a href="https://www.localseogen.com/dashboard.html" class="btn">Go to Dashboard</a>
        </div>
      </body>
      </html>
    `);
  }
}
