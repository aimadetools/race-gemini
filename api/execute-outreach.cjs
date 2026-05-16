const micro = require('micro'); // Import micro to access json parser

async function sendEmails(emails, sendgridApiKey, fromEmail) {
  const sgMail = require('@sendgrid/mail');

  if (!sendgridApiKey) {
    console.error('SendGrid API Key is missing. Please set SENDGRID_API_KEY environment variable.');
    return { sentCount: 0, failedCount: emails.length, results: emails.map(email => ({ status: 'rejected', reason: 'SendGrid API Key is missing', to: email.to })) };
  }

  try {
    sgMail.setApiKey(sendgridApiKey);
  } catch (error) {
    console.error('Error setting SendGrid API Key. Please verify the SENDGRID_API_KEY environment variable.', error);
    return { sentCount: 0, failedCount: emails.length, results: emails.map(email => ({ status: 'rejected', reason: 'Invalid SendGrid API Key', to: email.to })) };
  }

  if (!fromEmail) {
    console.error('FROM_EMAIL environment variable is missing. Please set FROM_EMAIL environment variable.');
    return { sentCount: 0, failedCount: emails.length, results: emails.map(email => ({ status: 'rejected', reason: 'FROM_EMAIL is missing', to: email.to })) };
  }

  console.log(`Preparing to send ${emails.length} emails.`);
  const emailPromises = emails.map(async (email) => {
    const msg = { ...email, from: fromEmail };
    try {
      console.log(`Attempting to send email to ${email.to}`);
      console.log(`Email message content for ${email.to}: ${JSON.stringify(msg)}`);
      await sgMail.send(msg);
      console.log(`Email sent successfully to ${email.to}`);
      return { status: 'fulfilled', value: email.to };
    } catch (error) {
      if (error.code === 401) {
        console.error(`Error sending email to ${email.to}: Invalid SendGrid API Key. Please verify the SENDGRID_API_KEY environment variable.`, error);
      } else {
        console.error(`Error sending email to ${email.to}. Response: ${error.response ? JSON.stringify(error.response.body) : 'N/A'}`, error);
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
    console.log('--- execute-outreach.js START ---');
    console.log('Request Headers:', JSON.stringify(req.headers));
    console.log('Request Method:', req.method);

    // Attempt to parse JSON body
    let requestBody;
    try {
      requestBody = await micro.json(req); // Use micro.json directly
      console.log('Successfully parsed request body.');
      console.log('Request Body (partial):', JSON.stringify(requestBody).substring(0, 500)); // Log partial body to avoid excessive output
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return res.status(400).json({ message: 'Invalid JSON in request body.', error: parseError.message });
    }

    const emails = requestBody.emails || [];
    if (emails.length === 0) {
      console.log('No emails provided in request body, returning success.', 'Handler');
      return res.status(400).json({ message: 'No emails array found in request body.', sent: 0, failed: 0, details: [] });
    }

    const emailResults = await sendEmails(emails, process.env.SENDGRID_API_KEY, process.env.FROM_EMAIL);

    console.log('Email sending process completed.');
    res.status(200).json({
      message: 'Email sending process completed.',
      sent: emailResults.sentCount,
      failed: emailResults.failedCount,
      details: emailResults.results.filter(result => result.status === 'rejected')
    });
    console.log('--- execute-outreach.js END (Success) ---');
  } catch (error) {
    console.error('--- execute-outreach.js END (General Handler Error) ---');
    console.error('Execute Outreach - General Handler Error', error);
    res.status(500).json({ message: 'Failed to process emails.', error: error.message });
  }
};