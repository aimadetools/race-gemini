console.log('--- TEST FILE START ---');
const httpMocks = require('node-mocks-http');
const executeOutreach = require('../../api/execute-outreach.cjs');
const sgMail = require('@sendgrid/mail');

// Mock SendGrid mail to prevent actual email sending
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn(),
}));

// Mock logger functions
jest.mock('../../lib/logger', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
}));

describe('api/execute-outreach', () => {
  let req;
  let res;
  let logError;
  let logInfo;

  beforeEach(() => {
    console.log('--- beforeEach START ---');
    // Reset mocks before each test
    const logger = require('../../lib/logger');
    logError = logger.logError;
    logInfo = logger.logInfo;
    sgMail.setApiKey.mockClear();
    sgMail.send.mockClear();
    logError.mockClear();
    logInfo.mockClear();

    // Set SendGrid API Key and From Email for testing
    process.env.SENDGRID_API_KEY = 'SG.test_api_key';
    process.env.FROM_EMAIL = 'test@example.com';

    // Initialize mock request and response
    req = httpMocks.createRequest({
      method: 'POST',
      url: '/api/execute-outreach',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        emails: [{
          to: 'recipient@example.com',
          subject: 'Test Subject',
          html: '<p>Test HTML</p>',
          message_id: 'test-message-id',
        }],
      },
    });
    res = httpMocks.createResponse();
    console.log('--- beforeEach END ---');
  });

  afterEach(() => {
    console.log('--- afterEach START ---');
    // Clean up environment variables
    delete process.env.SENDGRID_API_KEY;
    delete process.env.FROM_EMAIL;
    console.log('--- afterEach END ---');
  });

  test('should send emails successfully with valid input', async () => {
    console.log('--- TEST: should send emails successfully with valid input START ---');
    sgMail.send.mockResolvedValueOnce([{}]); // Mock successful SendGrid response

    await new Promise((resolve) => {
      res.on('end', resolve);
      executeOutreach(req, res);
    });

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({
      message: 'Email sending process completed.',
      sent: 1,
      failed: 0,
      details: [],
    });
    expect(sgMail.setApiKey).toHaveBeenCalledWith('SG.test_api_key');
    expect(sgMail.send).toHaveBeenCalledTimes(1);
    expect(sgMail.send).toHaveBeenCalledWith({
      to: 'recipient@example.com',
      from: 'test@example.com',
      subject: 'Test Subject',
      html: '<p>Test HTML</p>',
      message_id: 'test-message-id',
    });
    expect(logInfo).toHaveBeenCalledWith(expect.stringContaining('Email sent successfully to recipient@example.com'));
    expect(logError).not.toHaveBeenCalled();
    console.log('--- TEST: should send emails successfully with valid input END ---');
  });

  test('should return 400 if no emails array is provided', async () => {
    console.log('--- TEST: should return 400 if no emails array is provided START ---');
    req.body = {}; // No emails array

    await new Promise((resolve) => {
      res.on('end', resolve);
      executeOutreach(req, res);
    });

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      message: 'No emails array found in request body.',
      sent: 0,
      failed: 0,
      details: [],
    });
    expect(sgMail.send).not.toHaveBeenCalled();
    expect(logInfo).toHaveBeenCalledWith('No emails provided in request body, returning success.', 'Handler');
    expect(logError).not.toHaveBeenCalled();
    console.log('--- TEST: should return 400 if no emails array is provided END ---');
  });

  test('should return 400 if emails array is empty', async () => {
    console.log('--- TEST: should return 400 if emails array is empty START ---');
    req.body = { emails: [] }; // Empty emails array

    await new Promise((resolve) => {
      res.on('end', resolve);
      executeOutreach(req, res);
    });

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      message: 'No emails array found in request body.',
      sent: 0,
      failed: 0,
      details: [],
    });
    expect(sgMail.send).not.toHaveBeenCalled();
    expect(logInfo).toHaveBeenCalledWith('No emails provided in request body, returning success.', 'Handler');
    expect(logError).not.toHaveBeenCalled();
    console.log('--- TEST: should return 400 if emails array is empty END ---');
  });

  test('should handle SendGrid API Key missing', async () => {
    console.log('--- TEST: should handle SendGrid API Key missing START ---');
    delete process.env.SENDGRID_API_KEY; // Simulate missing API key

    await new Promise((resolve) => {
      res.on('end', resolve);
      executeOutreach(req, res);
    });

    expect(res._getStatusCode()).toBe(200); // Still 200 because the error is handled internally by sendEmails
    expect(res._getData().sent).toBe(0);
    expect(res._getData().failed).toBe(1);
    expect(res._getData().details[0].reason).toBe('SendGrid API Key is missing');
    expect(sgMail.setApiKey).not.toHaveBeenCalled();
    expect(sgMail.send).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(expect.any(Error), 'sendEmails');
    console.log('--- TEST: should handle SendGrid API Key missing END ---');
  });

  test('should handle FROM_EMAIL missing', async () => {
    console.log('--- TEST: should handle FROM_EMAIL missing START ---');
    delete process.env.FROM_EMAIL; // Simulate missing FROM_EMAIL

    await new Promise((resolve) => {
      res.on('end', resolve);
      executeOutreach(req, res);
    });

    expect(res._getStatusCode()).toBe(200); // Still 200 because the error is handled internally by sendEmails
    expect(res._getData().sent).toBe(0);
    expect(res._getData().failed).toBe(1);
    expect(res._getData().details[0].reason).toBe('FROM_EMAIL is missing');
    expect(sgMail.setApiKey).toHaveBeenCalledWith('SG.test_api_key'); // API key is present, so setApiKey is called
    expect(sgMail.send).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(expect.any(Error), 'sendEmails');
    console.log('--- TEST: should handle FROM_EMAIL missing END ---');
  });

  test('should report failed emails when SendGrid send fails', async () => {
    console.log('--- TEST: should report failed emails when SendGrid send fails START ---');
    const errorMessage = 'SendGrid error';
    sgMail.send.mockRejectedValueOnce(new Error(errorMessage)); // Mock SendGrid failure

    await new Promise((resolve) => {
      res.on('end', resolve);
      executeOutreach(req, res);
    });

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({
      message: 'Email sending process completed.',
      sent: 0,
      failed: 1,
      details: [{
        status: 'rejected',
        reason: errorMessage,
        to: 'recipient@example.com',
      }],
    });
    expect(sgMail.send).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith(expect.any(Error), expect.stringContaining('Error sending email to recipient@example.com'));
    console.log('--- TEST: should report failed emails when SendGrid send fails END ---');
  });

  test('should handle multiple emails with mixed success and failure', async () => {
    console.log('--- TEST: should handle multiple emails with mixed success and failure START ---');
    sgMail.send
      .mockResolvedValueOnce([{}]) // First email success
      .mockRejectedValueOnce(new Error('Second email failed')) // Second email failure
      .mockResolvedValueOnce([{}]); // Third email success

    req.body.emails = [
      { to: 'success1@example.com', subject: 'Sub1', html: 'HTML1', message_id: 'id1' },
      { to: 'fail1@example.com', subject: 'Sub2', html: 'HTML2', message_id: 'id2' },
      { to: 'success2@example.com', subject: 'Sub3', html: 'HTML3', message_id: 'id3' },
    ];

    await new Promise((resolve) => {
      res.on('end', resolve);
      executeOutreach(req, res);
    });

    expect(res._getStatusCode()).toBe(200);
    expect(res._getData().sent).toBe(2);
    expect(res._getData().failed).toBe(1);
    expect(res._getData().details[0].to).toBe('fail1@example.com');
    expect(sgMail.send).toHaveBeenCalledTimes(3);
    expect(logError).toHaveBeenCalledTimes(1); // Only for the failed email
    console.log('--- TEST: should handle multiple emails with mixed success and failure END ---');
  });
});
console.log('--- TEST FILE END ---');
