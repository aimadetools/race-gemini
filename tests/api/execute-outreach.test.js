import { jest } from '@jest/globals';
import httpMocks from 'node-mocks-http';
import executeOutreach from '../../api/execute-outreach.cjs';
import sgMail from '@sendgrid/mail';
import micro from 'micro';
import { logInfo, logError } from '../../lib/logger.js';

let setApiKeySpy;
let sendSpy;
let jsonSpy;

describe('api/execute-outreach', () => {
  let req;
  let res;

  beforeAll(() => {
    setApiKeySpy = jest.spyOn(sgMail, 'setApiKey').mockImplementation(() => {});
    sendSpy = jest.spyOn(sgMail, 'send').mockImplementation(() => Promise.resolve([{}]));
    jsonSpy = jest.spyOn(micro, 'json').mockImplementation((req) => Promise.resolve(req.body));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    setApiKeySpy.mockClear();
    sendSpy.mockClear();
    jsonSpy.mockClear();
    logInfo.mockClear();
    logError.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Set SendGrid API Key and From Email for testing
    process.env.SENDGRID_API_KEY = 'SG.test_api_key';
    process.env.SENDGRID_FROM_EMAIL = 'test@example.com';

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
  });

  afterEach(() => {
    delete process.env.SENDGRID_API_KEY;
    delete process.env.SENDGRID_FROM_EMAIL;
    console.error.mockRestore();
    console.log.mockRestore();
  });

  afterAll(() => {
    setApiKeySpy.mockRestore();
    sendSpy.mockRestore();
    jsonSpy.mockRestore();
  });

  test('should send emails successfully with valid input', async () => {
    sendSpy.mockResolvedValueOnce([{}]);

    await executeOutreach(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({
      message: 'Email sending process completed.',
      sent: 1,
      failed: 0,
      details: [],
    });
    expect(setApiKeySpy).toHaveBeenCalledWith('SG.test_api_key');
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledWith({
      to: 'recipient@example.com',
      from: 'test@example.com',
      subject: 'Test Subject',
      html: '<p>Test HTML</p>',
      message_id: 'test-message-id',
    });
    expect(logInfo).toHaveBeenCalledWith('Email sent successfully to recipient@example.com', 'sendEmails');
    expect(logError).not.toHaveBeenCalled();
  });

  test('should return 400 if no emails array is provided', async () => {
    req.body = {};

    await executeOutreach(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      message: 'No emails array found in request body.',
      sent: 0,
      failed: 0,
      details: [],
    });
    expect(sendSpy).not.toHaveBeenCalled();
    expect(logInfo).not.toHaveBeenCalled();
    expect(logError).not.toHaveBeenCalled();
  });

  test('should return 400 if emails array is empty', async () => {
    req.body = { emails: [] };

    await executeOutreach(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      message: 'No emails array found in request body.',
      sent: 0,
      failed: 0,
      details: [],
    });
    expect(sendSpy).not.toHaveBeenCalled();
    expect(logInfo).not.toHaveBeenCalled();
    expect(logError).not.toHaveBeenCalled();
  });

  test('should handle SendGrid API Key missing', async () => {
    delete process.env.SENDGRID_API_KEY;

    await executeOutreach(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData()).sent).toBe(0);
    expect(JSON.parse(res._getData()).failed).toBe(1);
    expect(JSON.parse(res._getData()).details[0].reason).toBe('SendGrid API Key is missing');
    expect(setApiKeySpy).not.toHaveBeenCalled();
    expect(sendSpy).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(expect.any(Error), 'sendEmails');
  });

  test('should handle FROM_EMAIL missing', async () => {
    process.env.SENDGRID_FROM_EMAIL = '';

    await executeOutreach(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData()).sent).toBe(0);
    expect(JSON.parse(res._getData()).failed).toBe(1);
    expect(JSON.parse(res._getData()).details[0].reason).toBe('SENDGRID_FROM_EMAIL is missing');
    expect(setApiKeySpy).toHaveBeenCalledWith('SG.test_api_key');
    expect(sendSpy).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(expect.any(Error), 'sendEmails');
  });

  test('should report failed emails when SendGrid send fails', async () => {
    const errorMessage = 'SendGrid error';
    sendSpy.mockRejectedValueOnce(new Error(errorMessage));

    await executeOutreach(req, res);

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
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith(expect.any(Error), 'Error sending email to recipient@example.com. Response: N/A');
  });

  test('should handle multiple emails with mixed success and failure', async () => {
    sendSpy
      .mockResolvedValueOnce([{}])
      .mockRejectedValueOnce(new Error('Second email failed'))
      .mockResolvedValueOnce([{}]);

    req.body.emails = [
      { to: 'success1@example.com', subject: 'Sub1', html: 'HTML1', message_id: 'id1' },
      { to: 'fail1@example.com', subject: 'Sub2', html: 'HTML2', message_id: 'id2' },
      { to: 'success2@example.com', subject: 'Sub3', html: 'HTML3', message_id: 'id3' },
    ];

    await executeOutreach(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData()).sent).toBe(2);
    expect(JSON.parse(res._getData()).failed).toBe(1);
    expect(JSON.parse(res._getData()).details[0].to).toBe('fail1@example.com');
    expect(sendSpy).toHaveBeenCalledTimes(3);
    expect(logError).toHaveBeenCalledTimes(1);
  });

  test('should correctly report failed emails with invalid recipient addresses', async () => {
    sendSpy.mockImplementation((msg) => {
      if (msg.to === 'invalid-recipient') {
        return Promise.reject(new Error('Invalid recipient address'));
      }
      return Promise.resolve([{}]);
    });

    req.body.emails = [
      { to: 'valid1@example.com', subject: 'Valid Sub 1', html: 'Valid HTML 1', message_id: 'id-valid1' },
      { to: 'invalid-recipient', subject: 'Invalid Sub', html: 'Invalid HTML', message_id: 'id-invalid' },
      { to: 'valid2@example.com', subject: 'Valid Sub 2', html: 'Valid HTML 2', message_id: 'id-valid2' },
    ];

    await executeOutreach(req, res);

    expect(res._getStatusCode()).toBe(200);
    const responseData = JSON.parse(res._getData());
    expect(responseData.sent).toBe(2);
    expect(responseData.failed).toBe(1);
    expect(responseData.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: 'rejected',
          reason: 'Invalid recipient address',
          to: 'invalid-recipient',
        }),
      ])
    );
    expect(sendSpy).toHaveBeenCalledTimes(3);
    expect(logError).toHaveBeenCalledWith(expect.any(Error), 'Error sending email to invalid-recipient. Response: N/A');
  });
});