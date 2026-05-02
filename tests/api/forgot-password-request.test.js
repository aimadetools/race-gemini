// tests/api/forgot-password-request.test.js
import forgotPasswordRequestHandler from '../../api/forgot-password-request';
import signupHandler from '../../api/signup';
import { jest } from '@jest/globals';

// Mock the nanoid module to generate predictable tokens
jest.mock('nanoid', () => {
    const { jest } = require('@jest/globals');
    let tokenCounter = 0;
    const mockNanoid = jest.fn(() => `mock-token-${++tokenCounter}`);
    mockNanoid.__reset = () => tokenCounter = 0;
    return {
        customAlphabet: jest.fn(() => mockNanoid),
    };
});
import { customAlphabet } from 'nanoid';

// Mock KV store for in-memory testing
const mockKvStore = new Map();

const mockKv = {
    async get(key) {
        return mockKvStore.get(key);
    },
    async set(key, value, options) {
        mockKvStore.set(key, value);
    },
    async del(key) {
        mockKvStore.delete(key);
    },
};

// Helper to create mock response object
const createMockRes = () => {
    const res = {
        _status: 200,
        _json: {},
        status: jest.fn(function(code) {
            this._status = code;
            return this;
        }),
        json: jest.fn(function(data) {
            this._json = data;
            return this;
        }),
    };
    return res;
};

// Helper to create mock request object
const createMockReq = (body, headers = {}) => ({
    method: 'POST',
    body,
    headers: {
        get: (header) => headers[header.toLowerCase()],
        ...headers,
    }
});

describe('forgot-password-request API', () => {
    let testUserEmail;

    beforeEach(async () => {
        jest.clearAllMocks();
        customAlphabet().__reset();
        mockKvStore.clear();

        testUserEmail = `forgot-pass-test-${Date.now()}@example.com`;
        const password = 'secure-password';

        // Setup: Create a user to test against
        const signupReq = createMockReq({ email: testUserEmail, password });
        const signupRes = createMockRes();
        await signupHandler(signupReq, signupRes, mockKv);

        if (signupRes._status !== 201) {
            throw new Error(`CRITICAL FAILURE: Could not create user for forgot password tests. Status: ${signupRes._status} Body: ${JSON.stringify(signupRes._json)}`);
        }
    });

    it('should return 200 and create a reset token for an existing user', async () => {
        const req = createMockReq({ email: testUserEmail });
        const res = createMockRes();

        await forgotPasswordRequestHandler(req, res, mockKv);

        expect(res._status).toBe(200);
        expect(res._json.message).toBe('If an account with that email exists, a password reset link has been sent.');

        // Verify that a password reset token was created in the mock KV store
        const tokenData = mockKvStore.get('password-reset:mock-token-1');
        expect(tokenData).toBeDefined();
        expect(tokenData.email).toBe(testUserEmail);
        expect(tokenData.expiry).toBeGreaterThan(Date.now());
    });

    it('should return 200 for a non-existent user to prevent email enumeration', async () => {
        const nonExistentEmail = 'nonexistent@example.com';
        const req = createMockReq({ email: nonExistentEmail });
        const res = createMockRes();

        await forgotPasswordRequestHandler(req, res, mockKv);

        expect(res._status).toBe(200);
        expect(res._json.message).toBe('If an account with that email exists, a password reset link has been sent.');

        // Verify that no reset token was created
        expect(mockKvStore.size).toBe(2); // Initial user + credits
    });

    it('should return 400 if email is missing', async () => {
        const req = createMockReq({});
        const res = createMockRes();

        await forgotPasswordRequestHandler(req, res, mockKv);

        expect(res._status).toBe(400);
        expect(res._json.message).toBe('Email is required.');
    });

    it('should return 405 for non-POST methods', async () => {
        const req = createMockReq({ email: testUserEmail });
        req.method = 'GET';
        const res = createMockRes();

        await forgotPasswordRequestHandler(req, res, mockKv);

        expect(res._status).toBe(405);
        expect(res._json.message).toBe('Method Not Allowed');
    });

    it('should log the reset link to the console (for dev purposes)', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const req = createMockReq({ email: testUserEmail }, { 'host': 'localhost:3000', 'x-forwarded-proto': 'http' });
        const res = createMockRes();

        await forgotPasswordRequestHandler(req, res, mockKv);

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Password reset link for'));
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('http://localhost:3000/reset-password.html?token=mock-token-1'));

        consoleSpy.mockRestore();
    });

    it('should handle internal server errors gracefully', async () => {
        const error = new Error('KV is down!');
        const faultyKv = {
            ...mockKv,
            get: jest.fn().mockRejectedValue(error),
        };
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const req = createMockReq({ email: testUserEmail });
        const res = createMockRes();

        await forgotPasswordRequestHandler(req, res, faultyKv);

        expect(res._status).toBe(500);
        expect(res._json.message).toBe('Internal Server Error');
        expect(consoleSpy).toHaveBeenCalledWith('Error during forgot password request:', error);

        consoleSpy.mockRestore();
    });
});
