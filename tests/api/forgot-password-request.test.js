import { jest } from '@jest/globals';

jest.mock('../../lib/email.js', () => ({
    sendEmail: jest.fn().mockResolvedValue(true),
}));

import forgotPasswordRequestHandler from '../../api/forgot-password-request.js';
import signupHandler from '../../api/signup.js';
import { clearMockUsers, setQueryDelegate, originalMockQuery } from '../../db/mockDb.js';
import { logError } from '../../lib/logger.js';

const mockQuery = jest.fn((text, params) => originalMockQuery(text, params));

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
        mockKvStore.clear();
        setQueryDelegate(mockQuery);
        mockQuery.mockClear();

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

    afterEach(() => {
        setQueryDelegate(null);
    });

    it('should return 200 and create a reset token for an existing user', async () => {
        const req = createMockReq({ email: testUserEmail });
        const res = createMockRes();

        await forgotPasswordRequestHandler(req, res, mockKv);

        expect(res._status).toBe(200);
        expect(res._json.message).toBe('If an account with that email exists, a password reset link has been sent.');

        // Find the reset token in the mock KV store
        const keys = Array.from(mockKvStore.keys());
        const tokenKey = keys.find(k => k.startsWith('password-reset:'));
        expect(tokenKey).toBeDefined();

        const tokenData = mockKvStore.get(tokenKey);
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

        // Verify that no reset token was created (beyond what might have been created in setup)
        // Setup creates a signup, but not a reset token. So mockKvStore should be empty.
        const resetTokenKeys = Array.from(mockKvStore.keys()).filter(k => k.startsWith('password-reset:'));
        expect(resetTokenKeys.length).toBe(0);
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

    it('should log the reset link via logError', async () => {
        const req = createMockReq({ email: testUserEmail }, { 'host': 'localhost:3000', 'x-forwarded-proto': 'http' });
        const res = createMockRes();

        await forgotPasswordRequestHandler(req, res, mockKv);

        expect(logError).toHaveBeenCalledWith(
            null,
            expect.stringContaining('Password reset link generated for'),
            'forgot_password_request_error.log'
        );
    });

    it('should handle internal server errors gracefully', async () => {
        const error = new Error('KV is down!');
        const faultyKv = {
            ...mockKv,
            set: jest.fn().mockRejectedValue(error),
        };

        const req = createMockReq({ email: testUserEmail });
        const res = createMockRes();

        await forgotPasswordRequestHandler(req, res, faultyKv);

        expect(res._status).toBe(500);
        expect(res._json.message).toBe('Internal Server Error');
        expect(logError).toHaveBeenCalledWith(
            error,
            'Forgot Password Request - General Error',
            'forgot_password_request_error.log'
        );
    });
});
