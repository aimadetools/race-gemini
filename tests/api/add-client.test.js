// tests/api/add-client.test.js
import { jest } from '@jest/globals';

// Mock the Vercel KV client
const mockKv = {
    get: jest.fn(),
    set: jest.fn(),
    sadd: jest.fn(),
    incr: jest.fn(),
    del: jest.fn(),
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

import { logError } from '../../lib/logger.js';
import { clearMockUsers, addMockUser, getMockUsers } from '../../db/mockDb.js';

// Dynamically import the handler after mocks are set up
let handler;

describe('add-client API', () => {
    beforeAll(async () => {
        handler = (await import('../../api/add-client')).default;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        clearMockUsers();
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
        const cookieModule = await import('cookie');
        cookieModule.default.parse.mockReturnValue({}); // No token cookie
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

        expect(cookieModule.default.parse).toHaveBeenCalledWith('');
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated' });
    });

    it('should return 403 if token is not for an agency account', async () => {
        const cookieModule = await import('cookie');
        cookieModule.default.parse.mockReturnValue({ token: 'mock_token' });
        const jwtModule = await import('jsonwebtoken');
        jwtModule.default.verify.mockReturnValue({ userId: 'user123' }); // Not an agency token in DB

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

        expect(jwtModule.default.verify).toHaveBeenCalledWith('mock_token', 'test_jwt_secret');
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Not an agency account' });
    });

    it('should return 409 if client with email already exists', async () => {
        const agencyId = 'agency123';
        addMockUser({ id: agencyId, email: 'agency@example.com', is_agency: true });
        addMockUser({ id: 'existing123', email: 'existing@example.com', is_agency: false });

        const cookieModule = await import('cookie');
        cookieModule.default.parse.mockReturnValue({ token: 'mock_agency_token' });
        const jwtModule = await import('jsonwebtoken');
        jwtModule.default.verify.mockReturnValue({ agencyId });

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

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({ message: 'User with this email already exists' });
    });

    it('should successfully create a new client for an agency', async () => {
        const agencyId = 'agency123';
        addMockUser({ id: agencyId, email: 'agency@example.com', is_agency: true });

        const cookieModule = await import('cookie');
        cookieModule.default.parse.mockReturnValue({ token: 'mock_agency_token' });
        const jwtModule = await import('jsonwebtoken');
        jwtModule.default.verify.mockReturnValue({ agencyId });
        
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

        // Client user should be created in the mock DB
        const users = getMockUsers();
        const createdClient = users.find(u => u.email === 'new@example.com');
        expect(createdClient).toBeDefined();
        expect(createdClient.name).toBe('New Client');
        expect(createdClient.agency_id).toBe(agencyId);

        expect(require('bcryptjs').hash).toHaveBeenCalledTimes(1); // Password hashing
        expect(mockKv.set).toHaveBeenCalledWith(`user:${createdClient.id}`, expect.objectContaining({
            name: 'New Client',
            email: 'new@example.com',
            agencyId: 'agency123',
        }));
        expect(mockKv.set).toHaveBeenCalledWith('user:new@example.com', createdClient.id);
        expect(mockKv.sadd).toHaveBeenCalledWith('agency:agency123:clients', createdClient.id);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Client created successfully. Password sent via email (mocked).'
        });
    });

    it('should return 401 for JWT verification errors', async () => {
        const cookieModule = await import('cookie');
        cookieModule.default.parse.mockReturnValue({ token: 'mock_agency_token' });
        const jwtModule = await import('jsonwebtoken');
        jwtModule.default.verify.mockImplementation(() => {
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

        await handler(req, res, mockKv);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Authentication failed: Please log in again.' });
        expect(logError).toHaveBeenCalled();
    });
});
