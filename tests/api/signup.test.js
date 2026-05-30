import { jest } from '@jest/globals';
import handler from '../../api/signup';
import { clearMockUsers, setQueryDelegate, originalMockQuery } from '../../db/mockDb.js';

const mockQuery = jest.fn((text, params) => originalMockQuery(text, params));

describe('Signup API', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        jest.clearAllMocks();
        clearMockUsers(); // Clear the mock users for each test
        setQueryDelegate(mockQuery);
        mockQuery.mockClear();

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
        setQueryDelegate(null);
        delete process.env.JWT_SECRET;
    });

    const generateUniqueEmail = () => `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@example.com`;

    it('should return 201 for a successful signup', async () => {
        const email = generateUniqueEmail();
        const password = 'securepassword123';
        mockReq.body = { email, password };

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'User registered successfully!',
            userId: expect.any(String),
        }));

        // Verify that the user was inserted into the mock database with initial credits
        expect(mockQuery).toHaveBeenCalledWith(
            'INSERT INTO users (email, password_hash, credits, referral_code, referrer_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [email, expect.any(String), 5, expect.any(String), null]
        );

    });

    it('should return 400 if email is missing', async () => {
        const password = 'securepassword123';
        mockReq.body = { password };

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Email and password are required.' });
    });

    it('should return 400 if password is missing', async () => {
        const email = generateUniqueEmail();
        mockReq.body = { email };

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Email and password are required.' });
    });

    it('should return 400 if both email and password are missing', async () => {
        mockReq.body = {};

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Email and password are required.' });
    });

    it('should return 409 if email already exists', async () => {
        const email = generateUniqueEmail();
        const password = 'securepassword123';

        // Create fresh mockReq and mockRes for the first signup attempt
        const firstMockReq = {
            method: 'POST',
            body: { email, password },
        };
        const firstMockRes = {
            _status: 200,
            _json: {},
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn().mockReturnThis(),
            end: jest.fn().mockReturnThis(),
        };

        // First signup to create the user in the mock DB
        await handler(firstMockReq, firstMockRes);
        expect(firstMockRes.status).toHaveBeenCalledWith(201);
        expect(mockQuery).toHaveBeenCalledWith(
            'INSERT INTO users (email, password_hash, credits, referral_code, referrer_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [email, expect.any(String), 5, expect.any(String), null]
        );

        // Clear mock calls for the second attempt, and re-initialize mockRes for the second call
        jest.clearAllMocks(); // Clear calls for all mocks including mockQuery
        // clearMockUsers(); // REMOVED: Do not clear users, as we need the user to exist for the 409 test
        mockQuery.mockClear(); // Clear mockQuery calls for the second attempt

        mockRes = { // Re-initialize mockRes for second call
            _status: 200,
            _json: {},
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn().mockReturnThis(),
            end: jest.fn().mockReturnThis(),
        };

        // Second signup with same email, using the `mockReq` from `beforeEach` (which has empty body)
        // Need to explicitly set body again for the second call
        mockReq.body = { email, password: 'anotherpassword' }; 
        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(409);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'User with this email already exists.' });
    });
    it('should return 405 for non-POST methods', async () => {
        mockReq.method = 'GET';
        mockReq.body = { email: generateUniqueEmail(), password: 'anypassword' };

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(405);
        expect(mockRes.end).toHaveBeenCalledWith('Method GET Not Allowed');
    });
});
