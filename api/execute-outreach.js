const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const path = require('path');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function parseGeneratedEmails(filePath) {
  const emails = [];
  const content = fs.readFileSync(filePath, 'utf8');
  const emailBlocks = content.split('--- EMAIL FOR:').slice(1);

  for (const block of emailBlocks) {
    const lines = block.trim().split('\n');
    const toMatch = lines[1].match(/To: (.*)/);
    const subjectMatch = lines[2].match(/Subject: (.*)/);

    if (toMatch && subjectMatch) {
      const to = toMatch[1].trim();
      const subject = subjectMatch[1].trim();
      const body = lines.slice(4).join('\n').trim();
      emails.push({ to, subject, html: body });
    }
  }

  return emails;
}

async function sendEmails(emails) {
  const emailPromises = emails.map(async (email) => {
    const msg = {
      ...email,
      from: process.env.FROM_EMAIL,
    };
    try {
      console.log(`Attempting to send email to ${email.to}`);
      await sgMail.send(msg);
      console.log(`Email sent successfully to ${email.to}`);
      return { status: 'fulfilled', value: email.to };
    } catch (error) {
      console.error(`Error sending email to ${email.to}`, error);
      if (error.response) {
        console.error(error.response.body);
      }
      return { status: 'rejected', reason: error.message, to: email.to };
    }
  });

  const results = await Promise.allSettled(emailPromises);
  const sentCount = results.filter(result => result.status === 'fulfilled').length;
  const failedCount = results.filter(result => result.status === 'rejected').length;

  console.log(`Email sending summary: ${sentCount} sent, ${failedCount} failed.`);
  return { sentCount, failedCount, results };
}

module.exports = async (req, res) => {
  try {
    const emails = parseGeneratedEmails(path.resolve(process.cwd(), 'generated_outreach_emails.txt'));
    const emailResults = await sendEmails(emails);
    res.status(200).json({
      message: 'Email sending process completed.',
      sent: emailResults.sentCount,
      failed: emailResults.failedCount,
      details: emailResults.results.filter(result => result.status === 'rejected') // Only send details for failed emails
    });
  } catch (error) {
    console.error('Error in execute-outreach.js handler:', error);
    res.status(500).json({ message: 'Failed to send emails.', error: error.message });
  }
};
