// tests/api/login.test.js
import loginHandler from '../../api/login';
import signupHandler from '../../api/signup';
import { jest } from '@jest/globals';


// Mock KV store for in-memory testing
const mockKvStore = new Map();

const mockKv = {
    async get(key) {
        const value = mockKvStore.get(key);
        return value;
    },
    async set(key, value) {
        mockKvStore.set(key, typeof value === 'object' && value !== null ? JSON.stringify(value) : value);
    },
    async delete(key) {
        mockKvStore.delete(key);
    },
    async incr(key) {
        let current = parseInt(mockKvStore.get(key) || '0', 10);
        current += 1;
        mockKvStore.set(key, current.toString());
        return current;
    },
};

describe('Login API', () => {
    let mockReq;
    let mockRes;
    let testUserEmail;
    let testUserPassword;

    beforeAll(() => {
        // Set a consistent JWT secret for testing globally for the suite
        process.env.JWT_SECRET = 'test_jwt_secret_key';
    });

    afterAll(() => {
        delete process.env.JWT_SECRET;
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        mockKvStore.clear(); // Clear the mock KV store for each test

        testUserEmail = `test-login-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@example.com`;
        testUserPassword = 'a-secure-password';

        // Setup: Create a user to test login against
        const signupReq = {
            method: 'POST',
            body: { email: testUserEmail, password: testUserPassword },
        };
        const signupRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            end: jest.fn().mockReturnThis(),
        };

        await signupHandler(signupReq, signupRes, mockKv);

        if (signupRes.status.mock.calls[0][0] !== 201) {
            throw new Error(`CRITICAL FAILURE: Could not create user for login tests. Error: ${JSON.stringify(signupRes.json.mock.calls[0][0])}`);
        }


        mockReq = {
            method: 'POST',
            body: {},
            headers: {}, // Add headers for cookie parsing
        };
        mockRes = {
            _status: 200,
            _json: {},
            _headers: {},
            status: jest.fn(function(statusCode) { this._status = statusCode; return this; }),
            json: jest.fn(function(data) { this._json = data; return this; }),
            setHeader: jest.fn(function(name, value) { this._headers[name] = value; }),
            end: jest.fn(),
            getHeaders: jest.fn(function() { return this._headers; }), // Added getHeaders
        };
    });

    it('should return 200 for a successful login and set auth cookie', async () => {
        mockReq.body = { email: testUserEmail, password: testUserPassword };

        await loginHandler(mockReq, mockRes, mockKv);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Logged in successfully!',
            userId: expect.any(String),
        }));

        expect(mockRes.setHeader).toHaveBeenCalledWith(
            'Set-Cookie',
            expect.stringContaining('authToken=')
        );
    });

    it('should return 401 for wrong password', async () => {
        mockReq.body = { email: testUserEmail, password: 'wrong-password' };

        await loginHandler(mockReq, mockRes, mockKv);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid credentials.' });
    });

    it('should return 401 for non-existent email', async () => {
        const nonExistentEmail = `nonexistent-${Date.now()}@example.com`;
        mockReq.body = { email: nonExistentEmail, password: 'anypassword' };

        await loginHandler(mockReq, mockRes, mockKv);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid credentials.' });
    });

    it('should return 400 if email is missing', async () => {
        mockReq.body = { password: 'anypassword' };

        await loginHandler(mockReq, mockRes, mockKv);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Email and password are required.' });
    });

    it('should return 400 if password is missing', async () => {
        mockReq.body = { email: testUserEmail };

        await loginHandler(mockReq, mockRes, mockKv);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Email and password are required.' });
    });

    it('should return 400 if both email and password are missing', async () => {
        mockReq.body = {};

        await loginHandler(mockReq, mockRes, mockKv);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Email and password are required.' });
    });

    it('should return 405 for non-POST methods', async () => {
        mockReq.method = 'GET';
        mockReq.body = { email: testUserEmail, password: testUserPassword };

        await loginHandler(mockReq, mockRes, mockKv);

        expect(mockRes.status).toHaveBeenCalledWith(405);
        expect(mockRes.end).toHaveBeenCalledWith('Method GET Not Allowed');
    });
});
