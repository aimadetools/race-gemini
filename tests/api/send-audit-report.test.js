// tests/api/send-audit-report.test.js
import { jest } from '@jest/globals';

let handler;

describe('send-audit-report API', () => {
    let consoleErrorSpy;

    beforeAll(async () => {
        handler = (await import('../../api/send-audit-report')).default;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {}); // Mock console.log as well
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
        jest.restoreAllMocks(); // Restore all mocks, including console.log
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

    it('should return 200 for a successful audit report request', async () => {
        const mockEmail = 'user@example.com';
        const mockAuditResults = {
            broken_links: [],
            alt_attributes: [{ tag: 'img', alt: '' }],
            page_load_times: { desktop: '2s', mobile: '5s' }
        };

        const req = { method: 'POST', body: { email: mockEmail, auditResults: mockAuditResults } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await handler(req, res);

        expect(console.log).toHaveBeenCalledWith('Received audit report request:');
        expect(console.log).toHaveBeenCalledWith('Email:', mockEmail);
        expect(console.log).toHaveBeenCalledWith('Audit Results:', JSON.stringify(mockAuditResults, null, 2));
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: 'Audit report request received successfully.' });
    });

    it('should return 500 for an internal server error', async () => {
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

        // Simulate an error within the handler
        jest.spyOn(global.JSON, 'stringify').mockImplementationOnce(() => {
            throw new Error('Simulated JSON error');
        });


        await handler(req, res);

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error in send-audit-report API:', expect.any(Error));
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error', error: 'Simulated JSON error' });
    });
});
