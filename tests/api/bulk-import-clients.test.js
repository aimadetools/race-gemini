// tests/api/bulk-import-clients.test.js
import { jest } from '@jest/globals';

jest.mock('../../lib/email.js', () => ({
    sendEmail: jest.fn().mockResolvedValue(true),
}));

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

describe('bulk-import-clients API', () => {
    beforeAll(async () => {
        handler = (await import('../../api/bulk-import-clients')).default;
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

    it('should return 400 if clients array is missing', async () => {
        const req = { method: 'POST', body: {} };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await handler(req, res, mockKv);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Clients list is required and must be an array' });
    });

    it('should return 400 if clients is not an array', async () => {
        const req = { method: 'POST', body: { clients: 'not-an-array' } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await handler(req, res, mockKv);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Clients list is required and must be an array' });
    });

    it('should return 401 if no authentication token is provided', async () => {
        const cookieModule = await import('cookie');
        cookieModule.default.parse.mockReturnValue({}); // No token cookie
        const req = {
            method: 'POST',
            headers: { cookie: '' },
            body: { clients: [] },
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
            body: { clients: [] },
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

    it('should successfully bulk import, skip duplicates, and record failures', async () => {
        const agencyId = 'agency123';
        addMockUser({ id: agencyId, email: 'agency@example.com', is_agency: true });
        addMockUser({ id: 'existing123', email: 'existing@example.com', is_agency: false });

        const cookieModule = await import('cookie');
        cookieModule.default.parse.mockReturnValue({ token: 'mock_agency_token' });
        const jwtModule = await import('jsonwebtoken');
        jwtModule.default.verify.mockReturnValue({ agencyId });
        
        mockKv.set.mockResolvedValue(true);
        mockKv.sadd.mockResolvedValue(true);

        const clients = [
            { name: 'New Client 1', email: 'new1@example.com' },
            { name: 'Existing Client', email: 'existing@example.com' }, // duplicate
            { name: '', email: 'invalid@example.com' }, // missing name
            { name: 'New Client 2', email: 'new2@example.com' }
        ];

        const req = {
            method: 'POST',
            headers: { cookie: 'token=mock_agency_token' },
            body: { clients },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await handler(req, res, mockKv);

        // Verify users registered in DB
        const users = getMockUsers();
        const created1 = users.find(u => u.email === 'new1@example.com');
        const created2 = users.find(u => u.email === 'new2@example.com');
        expect(created1).toBeDefined();
        expect(created2).toBeDefined();
        expect(created1.name).toBe('New Client 1');
        expect(created2.name).toBe('New Client 2');

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Bulk import process completed.',
            importedCount: 2,
            skippedCount: 1,
            failedCount: 1,
            imported: [
                { name: 'New Client 1', email: 'new1@example.com' },
                { name: 'New Client 2', email: 'new2@example.com' }
            ],
            skipped: [
                { name: 'Existing Client', email: 'existing@example.com', reason: 'User with this email already exists' }
            ],
            failed: [
                { name: '(unknown)', email: 'invalid@example.com', reason: 'Name and email are required' }
            ]
        }));
    });
});
