What: Set environment variables for SendGrid integration.
Steps:
1. Go to your Vercel project settings.
2. Navigate to "Environment Variables".
3. Add the following environment variables:
   - `SENDGRID_API_KEY`: Your SendGrid API key.
   - `FROM_EMAIL`: The email address you want to send outreach emails from (must be a verified sender in SendGrid).
4. Redeploy the project for the changes to take effect.
Time: 5min
Priority: blocking
Budget: $0