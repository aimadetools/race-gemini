import { jest } from '@jest/globals';
import path from 'path';
const { sendEmail } = jest.requireActual(path.resolve(process.cwd(), 'lib/email.js'));

const mockSend = jest.fn();

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: (msg) => mockSend(msg),
}));

describe('sendEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SENDGRID_API_KEY = 'test_key';
    process.env.FROM_EMAIL = 'test@example.com';
  });

  afterEach(() => {
    delete process.env.SENDGRID_API_KEY;
    delete process.env.FROM_EMAIL;
  });

  it('should call SendGrid with the correct parameters', async () => {
    const to = 'recipient@example.com';
    const subject = 'Test Subject';
    const html = '<p>Test HTML</p>';

    await sendEmail(to, subject, html);

    expect(mockSend).toHaveBeenCalledWith({
      to,
      from: 'test@example.com',
      subject,
      html,
    });
  });

  it('should log an error if sending fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSend.mockRejectedValueOnce(new Error('SendGrid error'));

    const to = 'recipient@example.com';
    const subject = 'Test Subject';
    const html = '<p>Test HTML</p>';

    await sendEmail(to, subject, html);

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
