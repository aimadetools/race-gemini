import { logInfo, logError } from './logger.js';

export async function sendSmsNotification(to, body) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    await logInfo('Twilio credentials not configured. Skipping SMS notification.', 'SMS');
    return false;
  }

  if (!to) {
    await logInfo('No phone number provided. Skipping SMS notification.', 'SMS');
    return false;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const params = new URLSearchParams();
    params.append('To', to);
    params.append('From', fromNumber);
    params.append('Body', body);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await response.json();

    if (response.ok) {
      await logInfo(`SMS notification sent successfully to ${to}. Message SID: ${data.sid}`, 'SMS');
      return true;
    } else {
      await logError(new Error(`Twilio error response: ${data.message || response.statusText}`), 'SMS Error');
      return false;
    }
  } catch (error) {
    await logError(error, 'SMS Notification Error');
    return false;
  }
}
