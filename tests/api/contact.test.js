// tests/api/contact.test.js
import handler from '../../api/contact';
import { jest } from '@jest/globals';

describe('Contact API', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        mockReq = {
            method: 'POST',
            body: {},
        };
        mockRes = {
            _status: 200,
            _json: {},
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        jest.clearAllMocks();
    });

    it('should return 200 for a successful submission', async () => {
        mockReq.body = {
            name: 'Test User',
            email: 'test@example.com',
            message: 'This is a test message.',
        };

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Message received successfully.' });
    });

    it('should return 400 if name is missing', async () => {
        mockReq.body = {
            email: 'test@example.com',
            message: 'This is a test message.',
        };

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'All fields are required. Please fill them out.' });
    });

    it('should return 400 if email is missing', async () => {
        mockReq.body = {
            name: 'Test User',
            message: 'This is a test message.',
        };

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'All fields are required. Please fill them out.' });
    });

    it('should return 400 if message is missing', async () => {
        mockReq.body = {
            name: 'Test User',
            email: 'test@example.com',
        };

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'All fields are required. Please fill them out.' });
    });

    it('should return 400 if email format is invalid', async () => {
        mockReq.body = {
            name: 'Test User',
            email: 'invalid-email',
            message: 'This is a test message.',
        };

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Please enter a valid email address.' });
    });

    it('should return 405 for non-POST methods', async () => {
        mockReq.method = 'GET';
        mockReq.body = {
            name: 'Test User',
            email: 'test@example.com',
            message: 'This is a test message.',
        };

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(405);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Method Not Allowed' });
    });
});
