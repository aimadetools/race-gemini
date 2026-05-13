const fs = require('fs');
fs.writeFileSync('/home/race/.gemini/tmp/race-gemini/outreach-start.log', 'Outreach script started');
const path = require('path');

process.on('uncaughtException', (err) => {
  console.error('--- DEBUG: Uncaught Exception ---');
  console.error(err);
  fs.writeFileSync('/home/race/.gemini/tmp/race-gemini/outreach-error.log', 'Uncaught exception in outreach script');
  console.error('--- DEBUG: Uncaught Exception ---');
  // In a serverless environment, re-throwing or exiting might lead to quicker restarts
  // or better error reporting by the platform.
  process.exit(1);
});

const sgMail = require('@sendgrid/mail');
const { logError, logInfo } = require('../../lib/logger');

console.log('--- DEBUG: Starting execute-outreach.js ---');
console.log('SENDGRID_API_KEY present:', !!process.env.SENDGRID_API_KEY);
console.log('SENDGRID_API_KEY length:', process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.length : 0);
console.log('FROM_EMAIL:', process.env.FROM_EMAIL);

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmails(emails) {
  await logInfo(`Preparing to send ${emails.length} emails.`, 'sendEmails');
  const emailPromises = emails.map(async (email) => {
    const msg = {
      ...email,
      from: process.env.FROM_EMAIL,
    };
    try {
      await logInfo(`Attempting to send email to ${email.to}`);
      await logInfo(`Email message content for ${email.to}: ${JSON.stringify(msg)}`); // Add this line
      await sgMail.send(msg);
      await logInfo(`Email sent successfully to ${email.to}`);
      return { status: 'fulfilled', value: email.to };
    } catch (error) {
      fs.writeFileSync('/home/race/.gemini/tmp/race-gemini/outreach-error.log', 'Error in outreach script');
      if (error.code === 401) {
        await logError(error, `Error sending email to ${email.to}: Invalid SendGrid API Key. Please verify the SENDGRID_API_KEY environment variable.`);
        console.error(`Failed to send email to ${email.to}: Invalid SendGrid API Key.`);
      } else {
        await logError(error, `Error sending email to ${email.to}. Response: ${error.response ? JSON.stringify(error.response.body) : 'N/A'}`);
        console.error(`Failed to send email to ${email.to}:`, error);
      }
      return { status: 'rejected', reason: error.message, to: email.to };
    }
  });

  const results = await Promise.allSettled(emailPromises);
  const sentCount = results.filter(result => result.status === 'fulfilled').length;
  const failedCount = results.filter(result => result.status === 'rejected').length;

  await logInfo(`Email sending summary: ${sentCount} sent, ${failedCount} failed.`);
  await logInfo(`Email sending summary: ${sentCount} sent, ${failedCount} failed.`, 'sendEmails Summary');
  return { sentCount, failedCount, results };
}

module.exports = async (req, res) => {
  try {
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
    
    const emailResults = await sendEmails(emails);
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
  await logInfo('execute-outreach.js ending', 'Handler');
};