const { json } = require('micro');
    // Temporarily commenting out import { logError, logInfo } from '../lib/logger';
    // const { logError, logInfo } = require('../lib/logger'); // Revert logger import

async function sendEmails(emails, sendgridApiKey, fromEmail) {
  const sgMail = require('@sendgrid/mail'); // Revert SendGrid import
  
  if (!sendgridApiKey) {
    console.error('SendGrid API Key is missing. Please set SENDGRID_API_KEY environment variable.');
    // Original line: await logError(new Error('SendGrid API Key is missing. Please set SENDGRID_API_KEY environment variable.'), 'sendEmails');
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
  
  try {
    sgMail.setApiKey(sendgridApiKey);
  } catch (error) {
    console.error('Error setting SendGrid API Key. Please verify the SENDGRID_API_KEY environment variable.', error);
    
    // Original line: await logError(error, 'Error setting SendGrid API Key. Please verify the SENDGRID_API_KEY environment variable.'); // Revert logger usage
    return {
      sentCount: 0,
      failedCount: emails.length,
      results: emails.map(email => ({
        status: 'rejected',
        reason: 'Invalid SendGrid API Key',
        to: email.to
      }))
    };
  }

  if (!fromEmail) {
    console.error('FROM_EMAIL environment variable is missing. Please set FROM_EMAIL environment variable.');
    // Original line: await logError(new Error('FROM_EMAIL environment variable is missing. Please set FROM_EMAIL environment variable.'), 'sendEmails'); // Revert logger usage
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

  console.log(`Preparing to send ${emails.length} emails.`);
  // Original line: await logInfo(`Preparing to send ${emails.length} emails.`, 'sendEmails'); // Revert logger usage
  const emailPromises = emails.map(async (email) => {
    const msg = {
      ...email,
      from: fromEmail,
    };
    try {
      console.log(`Attempting to send email to ${email.to}`);
      // Original line: await logInfo(`Attempting to send email to ${email.to}`); // Revert logger usage
      console.log(`Email message content for ${email.to}: ${JSON.stringify(msg)}`);
      // Original line: await logInfo(`Email message content for ${email.to}: ${JSON.stringify(msg)}`); // Revert logger usage
      await sgMail.send(msg);
      console.log(`Email sent successfully to ${email.to}`);
      // Original line: await logInfo(`Email sent successfully to ${email.to}`); // Revert logger usage
      return { status: 'fulfilled', value: email.to };
    } catch (error) {
      // Log errors to the /tmp directory for Vercel debugging
      if (error.code === 401) {
        console.error(`Error sending email to ${email.to}: Invalid SendGrid API Key. Please verify the SENDGRID_API_KEY environment variable.`, error);
        // Original line: await logError(error, `Error sending email to ${email.to}: Invalid SendGrid API Key. Please verify the SENDGRID_API_KEY environment variable.`); // Revert logger usage

      } else {
        console.error(`Error sending email to ${email.to}. Response: ${error.response ? JSON.stringify(error.response.body) : 'N/A'}`, error);
        // Original line: await logError(error, `Error sending email to ${email.to}. Response: ${error.response ? JSON.stringify(error.response.body) : 'N/A'}`); // Revert logger usage

      }
      return { status: 'rejected', reason: error.message, to: email.to };
    }
  });

  const results = await Promise.allSettled(emailPromises);
  const sentCount = results.filter(result => result.status === 'fulfilled').length;
  const failedCount = results.filter(result => result.status === 'rejected').length;

  console.log(`Email sending summary: ${sentCount} sent, ${failedCount} failed.`);
  // Original line: await logInfo(`Email sending summary: ${sentCount} sent, ${failedCount} failed.`); // Revert logger usage
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

    const { emails } = await json(req); // Keep micro json parsing

    console.log('execute-outreach.js received request');
    // Original line: await logInfo('execute-outreach.js received request', 'Handler'); // Revert logger usage
    console.log(`Received emails: ${JSON.stringify(emails)}`);
    // Original line: await logInfo(`Received emails: ${JSON.stringify(emails)}`, 'Handler'); // Revert logger usage

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      console.log('No emails provided in request body, returning success.');
      // Original line: await logInfo('No emails provided in request body, returning success.', 'Handler'); // Revert logger usage
      return res.status(400).json({
        message: 'No emails array found in request body.',
        sent: 0,
        failed: 0,
        details: []
      });
    }

    console.log(`Received ${emails.length} emails in request body.`);
    // Original line: await logInfo(`Received ${emails.length} emails in request body.`, 'Handler'); // Revert logger usage
    
    const emailResults = await sendEmails(emails, process.env.SENDGRID_API_KEY, process.env.FROM_EMAIL);
    res.status(200).json({
      message: 'Email sending process completed.',
      sent: emailResults.sentCount,
      failed: emailResults.failedCount,
      details: emailResults.results.filter(result => result.status === 'rejected') // Only send details for failed emails
    });
  } catch (error) {
    console.error('Execute Outreach - General Handler Error', error);
    // Original line: await logError(error, 'Execute Outreach - General Handler Error'); // Revert logger usage
    res.status(500).json({ message: 'Failed to send emails.', error: error.message });
  }

};