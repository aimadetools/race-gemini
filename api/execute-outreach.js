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
  for (const email of emails) {
    const msg = {
      ...email,
      from: process.env.FROM_EMAIL,
    };
    try {
      console.log(`Sending email to ${email.to}`);
      await sgMail.send(msg);
      console.log(`Email sent to ${email.to}`);
    } catch (error) {
      console.error(`Error sending email to ${email.to}`, error);
      if (error.response) {
        console.error(error.response.body)
      }
    }
  }
}

module.exports = (req, res) => {
  const emails = parseGeneratedEmails(path.resolve(process.cwd(), 'generated_outreach_emails.txt'));
  sendEmails(emails);
  res.status(202).json({ message: 'Email sending process started.' });
};
