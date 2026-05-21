import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
console.log('sgMail in lib/email.js:', sgMail, 'send is mock:', jest && jest.isMockFunction && jest.isMockFunction(sgMail.send));

async function sendEmail(to, subject, html) {
  const msg = {
    to,
    from: process.env.FROM_EMAIL,
    subject,
    html,
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    if (error.response) {
      console.error(error.response.body);
    }
  }
}

export { sendEmail };
