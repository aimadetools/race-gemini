// tests/api/reset-password.test.js
import resetPasswordHandler from '../../api/reset-password';
import signupHandler from '../../api/signup'; // Needed for user creation in setup
import bcrypt from 'bcrypt';
import { jest } from '@jest/globals';

// Mock the bcrypt module explicitly for predictable hashing and comparison
jest.mock('bcrypt', () => {
    const { jest } = require('@jest/globals'); // Import jest inside the factory
    return {
        hash: jest.fn((password) => Promise.resolve(`mock-hashed-${password}`)),
        compare: jest.fn((data, hash) => Promise.resolve(hash === `mock-hashed-${data}`)),
    };
});

// Mock the uuid module to generate unique IDs
jest.mock('uuid', () => {
    let uuidCounter = 0; // Move inside the factory function
    return {
        v4: jest.fn(() => `mock-uuid-${++uuidCounter}`),
    };
});
import { v4 as uuidv4 } from 'uuid'; // Import uuidv4 from the mocked module



// Mock KV store for in-memory testing
const mockKvStore = new Map();

const mockKv = {
    async get(key) {
        const value = mockKvStore.get(key);
        // console.log(`mockKv.get: ${key} -> ${value}`);
        return value; // Return raw value, let API handler parse if needed
    },
    async set(key, value) {
        // console.log(`mockKv.set: ${key} -> ${JSON.stringify(value)}`);
        mockKvStore.set(key, typeof value === 'object' && value !== null ? JSON.stringify(value) : value);
    },
    async del(key) {
        // console.log(`mockKv.del: ${key}`);
        mockKvStore.delete(key);
    },
    async incr(key) {
        let current = parseInt(mockKvStore.get(key) || '0', 10);
        current += 1;
        mockKvStore.set(key, current.toString());
        return current;
    },
    async sadd(key, member) {
        const setKey = `set:${key}`;
        if (!mockKvStore.has(setKey)) {
            mockKvStore.set(setKey, new Set());
        }
        mockKvStore.get(setKey).add(member);
    },
    async smembers(key) {
        const setKey = `set:${key}`;
        return Array.from(mockKvStore.get(setKey) || new Set());
    },
};

// Helper to create mock response object
const createMockRes = () => {
    const res = {
        _status: 200,
        _json: {},
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
    return res;
};

describe('reset-password API', () => {
    let testUserEmail;
    let initialPassword;
    let newPassword;
    let resetToken;
    let expiredToken;
    let invalidToken;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockKvStore.clear(); // Clear KV store for each test

        testUserEmail = `reset-test-${Date.now()}@example.com`;
        initialPassword = 'initial-secure-password';
        newPassword = 'new-secure-password';

        // --- Test Setup: Create a user and a reset token ---
        const signupReq = {
            method: 'POST',
            body: { email: testUserEmail, password: initialPassword },
        };
        const signupRes = createMockRes();

        await signupHandler(signupReq, signupRes, mockKv);

        if (signupRes.status.mock.calls[0][0] !== 201) {
            throw new Error(`CRITICAL FAILURE: Could not create user for reset password tests. Error: ${JSON.stringify(signupRes._json)}`);
        }

        // Generate a valid reset token and store it in KV
        resetToken = uuidv4();
        const expiryTime = Date.now() + 3600000; // 1 hour from now
        await mockKv.set(`password-reset:${resetToken}`, { email: testUserEmail, expiry: expiryTime });

        // Generate an expired token
        expiredToken = uuidv4();
        const expiredTime = Date.now() - 3600000; // 1 hour ago
        await mockKv.set(`password-reset:${expiredToken}`, { email: testUserEmail, expiry: expiredTime });

        // Generate an invalid token (not stored in KV)
        invalidToken = uuidv4();
    });

    it('should successfully reset password with a valid token', async () => {
        const req = {
            method: 'POST',
            body: { token: resetToken, newPassword: newPassword },
        };
        const res = createMockRes();

        await resetPasswordHandler(req, res, mockKv);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: 'Password reset successfully.' });

        // Verify password actually changed
        const userString = await mockKv.get(`user:${testUserEmail}`);
        const user = JSON.parse(userString);
        const passwordMatch = await bcrypt.compare(newPassword, user.hashedPassword); // Ensure using hashedPassword
        expect(passwordMatch).toBe(true);

        // Verify token was deleted
        const tokenInKv = await mockKv.get(`password-reset:${resetToken}`);
        expect(tokenInKv).toBeNull();
    });

    it('should return 400 if token is missing', async () => {
        const req = {
            method: 'POST',
            body: { newPassword: 'somepassword' },
        };
        const res = createMockRes();

        await resetPasswordHandler(req, res, mockKv);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Token and new password are required.' });
    });

    it('should return 400 if newPassword is missing', async () => {
        const req = {
            method: 'POST',
            body: { token: uuidv4() },
        };
        const res = createMockRes();

        await resetPasswordHandler(req, res, mockKv);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Token and new password are required.' });
    });

    it('should return 400 for an invalid token (not in KV)', async () => {
        const req = {
            method: 'POST',
            body: { token: invalidToken, newPassword: 'another-new-password' },
        };
        const res = createMockRes();

        await resetPasswordHandler(req, res, mockKv);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token.' });
    });

    it('should return 400 for an expired token and clean it up', async () => {
        const req = {
            method: 'POST',
            body: { token: expiredToken, newPassword: newPassword },
        };
        const res = createMockRes();

        await resetPasswordHandler(req, res, mockKv);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token.' });

        // Verify expired token was cleaned up
        const tokenInKv = await mockKv.get(`password-reset:${expiredToken}`);
        expect(tokenInKv).toBeNull();
    });

    it('should return 404 if user not found (after token validation) and invalidate token', async () => {
        // Create a token that points to a non-existent user
        const nonExistentEmail = `nonexistent-${Date.now()}@example.com`;
        const tokenForNonExistentUser = uuidv4();
        const expiryTime = Date.now() + 3600000;
        await mockKv.set(`password-reset:${tokenForNonExistentUser}`, { email: nonExistentEmail, expiry: expiryTime });

        const req = {
            method: 'POST',
            body: { token: tokenForNonExistentUser, newPassword: newPassword },
        };
        const res = createMockRes();

        await resetPasswordHandler(req, res, mockKv);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'User not found.' });

        // Ensure the token was consumed/deleted even if user not found
        const tokenInKv = await mockKv.get(`password-reset:${tokenForNonExistentUser}`);
        expect(tokenInKv).toBeNull();

        // Clean up the token created specifically for this test's setup
        await mockKv.del(`password-reset:${tokenForNonExistentUser}`);
    });

    it('should return 405 for non-POST methods', async () => {
        const req = {
            method: 'GET', // Using GET instead of POST
            body: { token: uuidv4(), newPassword: 'any-password' },
        };
        const res = createMockRes();

        await resetPasswordHandler(req, res, mockKv);

        expect(res.status).toHaveBeenCalledWith(405);
        expect(res.json).toHaveBeenCalledWith({ message: 'Method Not Allowed' });
    });
});
