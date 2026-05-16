const micro = require('micro'); // Import micro to access json parser

async function sendEmails(emails, sendgridApiKey, fromEmail) {
  const sgMail = require('@sendgrid/mail');

  if (!sendgridApiKey) {
    return { sentCount: 0, failedCount: emails.length, results: emails.map(email => ({ status: 'rejected', reason: 'SendGrid API Key is missing', to: email.to })) };
  }

  try {
    sgMail.setApiKey(sendgridApiKey);
  } catch (error) {
    return { sentCount: 0, failedCount: emails.length, results: emails.map(email => ({ status: 'rejected', reason: 'Invalid SendGrid API Key', to: email.to })) };
  }

  if (!fromEmail) {
    return { sentCount: 0, failedCount: emails.length, results: emails.map(email => ({ status: 'rejected', reason: 'FROM_EMAIL is missing', to: email.to })) };
  }

  const emailPromises = emails.map(async (email) => {
    const msg = { ...email, from: fromEmail };
    try {
      await sgMail.send(msg);
      return { status: 'fulfilled', value: email.to };
    } catch (error) {
      if (error.code === 401) {
        // Log this error to a more persistent logging solution if available
      } else {
        // Log this error to a more persistent logging solution if available
      }
      return { status: 'rejected', reason: error.message, to: email.to };
    }
  });

  const results = await Promise.allSettled(emailPromises);
  const sentCount = results.filter(result => result.status === 'fulfilled').length;
  const failedCount = results.filter(result => result.status === 'rejected').length;

  return { sentCount, failedCount, results };
}

module.exports = async (req, res) => {
  console.log('HANDLER: Entry');
  try {
    // Attempt to parse JSON body
    let requestBody;
    console.log('HANDLER: Before micro.json(req)');
    try {
      requestBody = await micro.json(req); // Use micro.json directly
      console.log('HANDLER: After micro.json(req) - Success');
    } catch (parseError) {
      console.error('HANDLER: After micro.json(req) - Error', parseError);
      return res.status(400).json({ message: 'Invalid JSON in request body.', error: parseError.message });
    }

    const emails = requestBody.emails || [];
    console.log(`HANDLER: Emails array length: ${emails.length}`);
    if (emails.length === 0) {
      console.log('HANDLER: No emails provided, returning 400 response.');
      return res.status(400).json({ message: 'No emails array found in request body.', sent: 0, failed: 0, details: [] });
    }

    console.log('HANDLER: Before sendEmails call');
    const emailResults = await sendEmails(emails, process.env.SENDGRID_API_KEY, process.env.FROM_EMAIL);
    console.log('HANDLER: After sendEmails call. Results:', JSON.stringify(emailResults));

    console.log('HANDLER: Before sending 200 JSON response');
    res.status(200).json({
      message: 'Email sending process completed.',
      sent: emailResults.sentCount,
      failed: emailResults.failedCount,
      details: emailResults.results.filter(result => result.status === 'rejected')
    });
    console.log('HANDLER: After sending 200 JSON response');
  } catch (error) {
    console.error('HANDLER: General Handler Error:', error);
    res.status(500).json({ message: 'Failed to process emails.', error: error.message });
  }
};