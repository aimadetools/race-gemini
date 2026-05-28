// tests/api/send-audit-report.test.js
import { jest } from '@jest/globals';
import sgMail from '@sendgrid/mail';
import { addMockUser, clearMockUsers } from '../../db/mockDb.js';
import jwt from 'jsonwebtoken';
import * as cookie from 'cookie';

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{}]),
}));

let handler;

describe('send-audit-report API', () => {
    let consoleErrorSpy;
    let setApiKeySpy;
    let sendSpy;

    beforeAll(async () => {
        handler = (await import('../../api/send-audit-report')).default;
        setApiKeySpy = sgMail.setApiKey;
        sendSpy = sgMail.send;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        clearMockUsers();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {});
        process.env.SENDGRID_API_KEY = 'SG.test_key';
        process.env.SENDGRID_FROM_EMAIL = 'hello@localseogen.com';
        process.env.JWT_SECRET = 'test_jwt_secret';
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
        jest.restoreAllMocks();
        delete process.env.SENDGRID_API_KEY;
        delete process.env.SENDGRID_FROM_EMAIL;
        delete process.env.JWT_SECRET;
    });

    it('should return 405 if not a POST request', async () => {
        const req = { method: 'GET' };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(405);
        expect(res.json).toHaveBeenCalledWith({ message: 'Method Not Allowed' });
    });

    it('should return 400 if email is missing', async () => {
        const req = { method: 'POST', body: { auditResults: { seo: 'good' } } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Email and audit results are required.' });
    });

    it('should return 400 if auditResults are missing', async () => {
        const req = { method: 'POST', body: { email: 'test@example.com' } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Email and audit results are required.' });
    });

    it('should return 200 and send email using SendGrid (default branding)', async () => {
        const mockEmail = 'user@example.com';
        const mockAuditResults = {
            'broken-links': { broken_links: [] },
            'alt-attributes': [{ tag: 'img', alt: '' }],
            'page-load-times': { load_time: 1.2 }
        };

        const req = { method: 'POST', body: { email: mockEmail, auditResults: mockAuditResults, url: 'https://example.com' } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await handler(req, res);

        expect(console.log).toHaveBeenCalledWith('Received audit report request:');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: 'Audit report request received successfully.' });
        expect(setApiKeySpy).toHaveBeenCalledWith('SG.test_key');
        expect(sendSpy).toHaveBeenCalledTimes(1);
        const sentMsg = sendSpy.mock.calls[0][0];
        expect(sentMsg.to).toBe(mockEmail);
        expect(sentMsg.from).toBe('hello@localseogen.com');
        expect(sentMsg.subject).toBe('SEO Audit Report for https://example.com');
        expect(sentMsg.html).toContain('LocalLeads');
        expect(sentMsg.html).toContain('1.2 seconds');
    });

    it('should send email with agency branding if authenticated as agency', async () => {
        const mockEmail = 'user@example.com';
        const mockAuditResults = {
            'broken-links': { broken_links: [] },
            'alt-attributes': [{ tag: 'img', alt: '' }]
        };

        // Create mock agency in mock db
        const agencyUser = {
            id: 999,
            name: 'Acme Marketing Agency',
            email: 'agency@acme.com',
            is_agency: true,
            logo_url: 'https://acme.com/logo.png',
            primary_color: '#ff5722'
        };
        addMockUser(agencyUser);

        const token = jwt.sign({ userId: 999 }, 'test_jwt_secret');

        const req = {
            method: 'POST',
            body: { email: mockEmail, auditResults: mockAuditResults, url: 'https://client.com' },
            headers: {
                cookie: `authToken=${token}`
            }
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(sendSpy).toHaveBeenCalledTimes(1);
        const sentMsg = sendSpy.mock.calls[0][0];
        expect(sentMsg.html).toContain('Acme Marketing Agency');
        expect(sentMsg.html).toContain('https://acme.com/logo.png');
        expect(sentMsg.html).toContain('#ff5722');
        expect(sentMsg.html).not.toContain('LocalLeads Logo');
    });

    it('should return 500 if SendGrid fails', async () => {
        sendSpy.mockRejectedValueOnce(new Error('SendGrid failure'));

        const req = {
            method: 'POST',
            body: {
                email: 'test@example.com',
                auditResults: {},
            },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await handler(req, res);

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error in send-audit-report API:', expect.any(Error));
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error', error: 'SendGrid failure' });
    });
});
