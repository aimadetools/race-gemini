const { logError, logInfo } = require('../lib/logger');

async function sendEmails(emails, sendgridApiKey, fromEmail) {
  const sgMail = require('@sendgrid/mail');
  
  if (!sendgridApiKey) {
    await logError(new Error('SendGrid API Key is missing. Please set SENDGRID_API_KEY environment variable.'), 'sendEmails');
    return {
      sentCount: 0,
      failedCount: emails.length,
      results: emails.map(email => ({
        status: 'rejected',
        reason: 'SendGrid API Key is missing',
        to: email.to
      }))
    };
  }
  
  sgMail.setApiKey(sendgridApiKey);

  if (!fromEmail) {
    await logError(new Error('FROM_EMAIL environment variable is missing. Please set FROM_EMAIL environment variable.'), 'sendEmails');
    return {
      sentCount: 0,
      failedCount: emails.length,
      results: emails.map(email => ({
        status: 'rejected',
        reason: 'FROM_EMAIL is missing',
        to: email.to
      }))
    };
  }

  await logInfo(`Preparing to send ${emails.length} emails.`, 'sendEmails');
  const emailPromises = emails.map(async (email) => {
    const msg = {
      ...email,
      from: fromEmail,
    };
    try {
      await logInfo(`Attempting to send email to ${email.to}`);
      await logInfo(`Email message content for ${email.to}: ${JSON.stringify(msg)}`);
      await sgMail.send(msg);
      await logInfo(`Email sent successfully to ${email.to}`);
      return { status: 'fulfilled', value: email.to };
    } catch (error) {
      // Log errors to the /tmp directory for Vercel debugging
      if (error.code === 401) {
        await logError(error, `Error sending email to ${email.to}: Invalid SendGrid API Key. Please verify the SENDGRID_API_KEY environment variable.`);

      } else {
        await logError(error, `Error sending email to ${email.to}. Response: ${error.response ? JSON.stringify(error.response.body) : 'N/A'}`);

      }
      return { status: 'rejected', reason: error.message, to: email.to };
    }
  });

  const results = await Promise.allSettled(emailPromises);
  const sentCount = results.filter(result => result.status === 'fulfilled').length;
  const failedCount = results.filter(result => result.status === 'rejected').length;

  await logInfo(`Email sending summary: ${sentCount} sent, ${failedCount} failed.`);
  return { sentCount, failedCount, results };
}

module.exports = async (req, res) => {
  try {
    // Log environment variables for debugging
    console.log('DEBUG (Handler): SENDGRID_API_KEY present:', !!process.env.SENDGRID_API_KEY);
    if (process.env.SENDGRID_API_KEY) {
      console.log('DEBUG (Handler): SENDGRID_API_KEY (partial):', process.env.SENDGRID_API_KEY.substring(0, 5) + '...');
    }
    console.log('DEBUG (Handler): FROM_EMAIL:', process.env.FROM_EMAIL);

    const emails = req.body.emails; // Expect emails in the request body

    await logInfo('execute-outreach.js received request', 'Handler');
    await logInfo(`Received emails: ${JSON.stringify(emails)}`, 'Handler');

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      await logInfo('No emails provided in request body, returning success.', 'Handler');
      return res.status(400).json({
        message: 'No emails array found in request body.',
        sent: 0,
        failed: 0,
        details: []
      });
    }

    await logInfo(`Received ${emails.length} emails in request body.`, 'Handler');
    
    const emailResults = await sendEmails(emails, process.env.SENDGRID_API_KEY, process.env.FROM_EMAIL);
    res.status(200).json({
      message: 'Email sending process completed.',
      sent: emailResults.sentCount,
      failed: emailResults.failedCount,
      details: emailResults.results.filter(result => result.status === 'rejected') // Only send details for failed emails
    });
  } catch (error) {
    await logError(error, 'Execute Outreach - General Handler Error');
    res.status(500).json({ message: 'Failed to send emails.', error: error.message });
  }

};
