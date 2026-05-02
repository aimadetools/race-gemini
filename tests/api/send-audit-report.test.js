// tests/api/send-audit-report.test.js
import handler from '../../api/send-audit-report';
import { jest } from '@jest/globals';

describe('Send Audit Report API', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        jest.clearAllMocks();

        mockReq = {
            method: 'POST',
            body: {},
        };
        mockRes = {
            _status: 200,
            _json: {},
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            end: jest.fn().mockReturnThis(), // Added end method for 405
        };
    });

    it('should return 200 for a successful audit report request', async () => {
        mockReq.body = {
            email: 'test@example.com',
            auditResults: {
                altAttributes: { missing: 5 },
                pageLoadTime: { score: 85 }
            }
        };

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Audit report request received successfully.' });
    });

    it('should return 400 if email is missing', async () => {
        mockReq.body = {
            auditResults: {
                altAttributes: { missing: 5 },
                pageLoadTime: { score: 85 }
            }
        };

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Email and audit results are required.' });
    });

    it('should return 400 if auditResults are missing', async () => {
        mockReq.body = {
            email: 'test@example.com'
        };

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Email and audit results are required.' });
    });

    it('should return 400 if both email and auditResults are missing', async () => {
        mockReq.body = {};

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Email and audit results are required.' });
    });

    it('should return 405 for non-POST methods', async () => {
        mockReq.method = 'GET';
        mockReq.body = {
            email: 'test@example.com',
            auditResults: {}
        };

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(405);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Method Not Allowed' });
    });
});
