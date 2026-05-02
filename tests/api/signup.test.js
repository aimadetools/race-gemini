// tests/api/signup.test.js
import handler from '../../api/signup'; // Import the refactored handler
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

describe('Signup API', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        jest.clearAllMocks();
        mockKvStore.clear(); // Clear the mock KV store for each test

        mockReq = {
            method: 'POST',
            body: {},
        };
        mockRes = {
            _status: 200,
            _json: {},
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn().mockReturnThis(), // Added setHeader method
            end: jest.fn().mockReturnThis(), // Added end method for 405
        };
        process.env.JWT_SECRET = 'test_jwt_secret'; // Set a test JWT secret if needed by other tests
    });

    afterEach(() => {
        delete process.env.JWT_SECRET;
    });

    const generateUniqueEmail = () => `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@example.com`;

    it('should return 201 for a successful signup', async () => {
        const email = generateUniqueEmail();
        const password = 'securepassword123';
        mockReq.body = { email, password };

        await handler(mockReq, mockRes, mockKv);

        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'User registered successfully!',
            userId: expect.any(String),
        }));

        // Verify user data stored in KV
        const storedUser = JSON.parse(await mockKv.get(`user:${email}`));
        expect(storedUser).toMatchObject({
            email,
            hashedPassword: `mock-hashed-${password}`,
            credits: 50,
        });
        expect(await mockKv.get(`userId:${storedUser.id}`)).toBe(email);
    });

    it('should return 400 if email is missing', async () => {
        const password = 'securepassword123';
        mockReq.body = { password };

        await handler(mockReq, mockRes, mockKv);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Email and password are required.' });
    });

    it('should return 400 if password is missing', async () => {
        const email = generateUniqueEmail();
        mockReq.body = { email };

        await handler(mockReq, mockRes, mockKv);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Email and password are required.' });
    });

    it('should return 400 if both email and password are missing', async () => {
        mockReq.body = {};

        await handler(mockReq, mockRes, mockKv);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Email and password are required.' });
    });

    it('should return 409 if email already exists', async () => {
        const email = generateUniqueEmail();
        const password = 'securepassword123';

        // First signup
        mockReq.body = { email, password };
        await handler(mockReq, mockRes, mockKv);
        expect(mockRes.status).toHaveBeenCalledWith(201);

        // Clear mock calls for the second attempt
        jest.clearAllMocks();
        mockRes = { // Re-initialize mockRes for second call
            _status: 200,
            _json: {},
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            end: jest.fn().mockReturnThis(),
        };

        // Second signup with same email
        mockReq.body = { email, password: 'anotherpassword' };
        await handler(mockReq, mockRes, mockKv);

        expect(mockRes.status).toHaveBeenCalledWith(409);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'User with this email already exists.' });
    });

    it('should return 405 for non-POST methods', async () => {
        mockReq.method = 'GET';
        mockReq.body = { email: generateUniqueEmail(), password: 'anypassword' };

        await handler(mockReq, mockRes, mockKv);

        expect(mockRes.status).toHaveBeenCalledWith(405);
        expect(mockRes.end).toHaveBeenCalledWith('Method GET Not Allowed');
    });
});
