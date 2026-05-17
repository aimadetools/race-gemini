const micro = require('micro'); // Import micro to access json parser
const { logError, logInfo } = require('../lib/logger');

async function sendEmails(emails, sendgridApiKey, sendgridFromEmail) {
  const sgMail = require('@sendgrid/mail');

  if (!sendgridApiKey) {
    logError(new Error('SendGrid API Key is missing'), 'sendEmails');
    return { sentCount: 0, failedCount: emails.length, details: emails.map(email => ({ status: 'rejected', reason: 'SendGrid API Key is missing', to: email.to })) };
  }

  try {
    sgMail.setApiKey(sendgridApiKey);
  } catch (error) {
    logError(error, 'sendEmails');
    return { sentCount: 0, failedCount: emails.length, details: emails.map(email => ({ status: 'rejected', reason: 'Invalid SendGrid API Key', to: email.to })) };
  }

  if (!sendgridFromEmail) {
    logError(new Error('SENDGRID_FROM_EMAIL is missing'), 'sendEmails');
    return { sentCount: 0, failedCount: emails.length, details: emails.map(email => ({ status: 'rejected', reason: 'SENDGRID_FROM_EMAIL is missing', to: email.to })) };
  }

  const emailPromises = emails.map(async (email) => {
    const msg = { ...email, from: sendgridFromEmail };
    try {
      await sgMail.send(msg);
      logInfo(`Email sent successfully to ${email.to}`, 'sendEmails'); // Log successful send
      return email; // Return the original email object on success
    } catch (error) {
      if (error.code === 401) {
        logError(error, `Error sending email to ${email.to}: Invalid SendGrid API Key`); // Log specific error for invalid API key
      } else {
        logError(error, `Error sending email to ${email.to}. Response: ${error.response ? JSON.stringify(error.response.body) : 'N/A'}`); // Log general error
      }
      throw { reason: error.message, to: email.to }; // Throw an object with details for rejection
    }
  });

  const allSettledResults = await Promise.allSettled(emailPromises);

  const sentCount = allSettledResults.filter(result => result.status === 'fulfilled').length;
  const failedCount = allSettledResults.filter(result => result.status === 'rejected').length;

  const details = allSettledResults
    .filter(result => result.status === 'rejected')
    .map(result => ({
      status: 'rejected',
      reason: result.reason.reason,
      to: result.reason.to,
    }));

  return { sentCount, failedCount, details };
}

module.exports = async (req, res) => {
  try {
    // Attempt to parse JSON body
    let requestBody;
    try {
      requestBody = await micro.json(req); // Use micro.json directly
    } catch (parseError) {
      return res.status(400).json({ message: 'Invalid JSON in request body.', error: parseError.message });
    }

    const emails = requestBody.emails || [];
    if (emails.length === 0) {
      return res.status(400).json({ message: 'No emails array found in request body.', sent: 0, failed: 0, details: [] });
    }

    const emailResults = await sendEmails(emails, process.env.SENDGRID_API_KEY, process.env.SENDGRID_FROM_EMAIL);

    res.status(200).json({
      message: 'Email sending process completed.',
      sent: emailResults.sentCount,
      failed: emailResults.failedCount,
      details: emailResults.details
    });
  } catch (error) {
    logError(error, 'Execute Outreach - General Handler Error');
    res.status(500).json({ message: 'Failed to process emails.', error: error.message });
  }
};