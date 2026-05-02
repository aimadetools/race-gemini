// tests/api/add-client.test.js
import { jest } from '@jest/globals';

// Mock the Vercel KV client
const mockKv = {
    get: jest.fn(),
    set: jest.fn(),
    sadd: jest.fn(),
    incr: jest.fn(),
    del: jest.fn(), // Add del for cleanup if needed
};

// Mock the bcryptjs module
jest.mock('bcryptjs', () => ({
    hash: jest.fn((password) => Promise.resolve(`hashed-${password}`)),
}));

// Mock the cookie module
jest.mock('cookie', () => ({
    parse: jest.fn(() => ({})),
}));

// Mock the jsonwebtoken module
jest.mock('jsonwebtoken', () => ({
    verify: jest.fn(),
}));

// Dynamically import the handler after mocks are set up
let handler;

describe('add-client API', () => {
    beforeAll(async () => {
        handler = (await import('../../api/add-client')).default;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test_jwt_secret'; // Set a test JWT secret
    });

    afterEach(() => {
        delete process.env.JWT_SECRET;
    });

    it('should return 405 if not a POST request', async () => {
        const req = { method: 'GET' };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await handler(req, res, mockKv);

        expect(res.status).toHaveBeenCalledWith(405);
        expect(res.json).toHaveBeenCalledWith({ message: 'Only POST requests are allowed' });
    });

    it('should return 400 if clientName is missing', async () => {
        const req = { method: 'POST', body: { clientEmail: 'test@example.com' } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await handler(req, res, mockKv);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Client name and email are required' });
    });

    it('should return 400 if clientEmail is missing', async () => {
        const req = { method: 'POST', body: { clientName: 'Test Client' } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await handler(req, res, mockKv);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Client name and email are required' });
    });

    it('should return 401 if no authentication token is provided', async () => {
        require('cookie').parse.mockReturnValue({}); // No token cookie
        const req = {
            method: 'POST',
            headers: { cookie: '' },
            body: { clientName: 'Test Client', clientEmail: 'test@example.com' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await handler(req, res, mockKv);

        expect(require('cookie').parse).toHaveBeenCalledWith('');
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated' });
    });

    it('should return 403 if token is not for an agency account', async () => {
        require('cookie').parse.mockReturnValue({ token: 'mock_token' });
        require('jsonwebtoken').verify.mockReturnValue({ userId: 'user123' }); // Not an agency token

        const req = {
            method: 'POST',
            headers: { cookie: 'token=mock_token' },
            body: { clientName: 'Test Client', clientEmail: 'test@example.com' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await handler(req, res, mockKv);

        expect(require('jsonwebtoken').verify).toHaveBeenCalledWith('mock_token', 'test_jwt_secret');
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Not an agency account' });
    });

    it('should return 409 if client with email already exists', async () => {
        require('cookie').parse.mockReturnValue({ token: 'mock_agency_token' });
        require('jsonwebtoken').verify.mockReturnValue({ agencyId: 'agency123' });
        mockKv.get.mockResolvedValueOnce('user456'); // clientEmail exists

        const req = {
            method: 'POST',
            headers: { cookie: 'token=mock_agency_token' },
            body: { clientName: 'Test Client', clientEmail: 'existing@example.com' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await handler(req, res, mockKv);

        expect(mockKv.get).toHaveBeenCalledWith('user:existing@example.com');
        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({ message: 'User with this email already exists' });
    });

    it('should successfully create a new client for an agency', async () => {
        require('cookie').parse.mockReturnValue({ token: 'mock_agency_token' });
        require('jsonwebtoken').verify.mockReturnValue({ agencyId: 'agency123' });
        mockKv.get.mockResolvedValueOnce(null); // clientEmail does not exist
        mockKv.incr.mockResolvedValueOnce(1); // next_user_id
        mockKv.set.mockResolvedValue(true);
        mockKv.sadd.mockResolvedValue(true);

        const req = {
            method: 'POST',
            headers: { cookie: 'token=mock_agency_token' },
            body: { clientName: 'New Client', clientEmail: 'new@example.com' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await handler(req, res, mockKv);

        expect(mockKv.get).toHaveBeenCalledWith('user:new@example.com');
        expect(require('bcryptjs').hash).toHaveBeenCalledTimes(1); // Password hashing
        expect(mockKv.incr).toHaveBeenCalledWith('next_user_id');
        expect(mockKv.set).toHaveBeenCalledWith('user:1', expect.objectContaining({
            name: 'New Client',
            email: 'new@example.com',
            agencyId: 'agency123',
        }));
        expect(mockKv.set).toHaveBeenCalledWith('user:new@example.com', 1);
        expect(mockKv.sadd).toHaveBeenCalledWith('agency:agency123:clients', 1);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Client created successfully',
            password: expect.any(String), // Password is random, so just check type
        }));
    });

    it('should return 500 for internal server errors', async () => {
        require('cookie').parse.mockReturnValue({ token: 'mock_agency_token' });
        require('jsonwebtoken').verify.mockImplementation(() => {
            throw new Error('Invalid token');
        }); // Simulate a JWT verification error

        const req = {
            method: 'POST',
            headers: { cookie: 'token=mock_agency_token' },
            body: { clientName: 'Test Client', clientEmail: 'test@example.com' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        // Suppress console.error for this test
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await handler(req, res, mockKv);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
    });
});
