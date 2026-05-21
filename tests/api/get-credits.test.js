import handler from '../../api/get-credits';
import { jest } from '@jest/globals';
import { mockQuery as originalMockQuery, clearMockUsers } from '../../db/mockDb';
import jwt from 'jsonwebtoken';

// Re-declare mockQuery as a Jest mock function
const mockQuery = jest.fn(originalMockQuery);

// Mock the ../db/index.js module to use our mockQuery
jest.mock('../../db/index.js', () => ({
    query: (...args) => mockQuery(...args),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken');

describe('Get Credits API', () => {
    let mockReq;
    let mockRes;
    const userId = 'testUserId123';
    const userEmail = 'test@example.com';
    const userCredits = 100;
    const secret = 'test_jwt_secret';

    beforeAll(() => {
        process.env.JWT_SECRET = secret;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        clearMockUsers(); // Ensure a clean mock DB state for each test
        mockQuery.mockClear();

        mockReq = {
            method: 'GET',
            headers: {},
        };
        mockRes = {
            _status: 200,
            _json: {},
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn().mockReturnThis(),
            end: jest.fn().mockReturnThis(),
        };

        // Default mock for jwt.verify to return a valid token
        jwt.verify.mockReturnValue({ userId });

        // Add a mock user to the mock DB for tests that require it
        // We can't directly call mockQuery for INSERT here as it's a mock,
        // instead, we'll manually add to mockUsers if needed or use mockQuery.mockImplementationOnce
        // For get-credits, we'll directly set up mockQuery responses.
    });

    afterAll(() => {
        delete process.env.JWT_SECRET;
    });

    // Test Case 1: Successful retrieval of credits
    it(`should return 200 and the user's credits for a valid token`, async () => {
        mockReq.headers.cookie = 'auth=validToken';
        mockQuery.mockImplementationOnce((sql, params) => {
            if (sql.includes('SELECT credits FROM users WHERE id = $1') && params[0] === userId) {
                return { rows: [{ credits: userCredits }] };
            }
            return { rows: [] };
        });

        await handler(mockReq, mockRes);

        expect(jwt.verify).toHaveBeenCalledWith('validToken', secret);
        expect(mockQuery).toHaveBeenCalledWith('SELECT credits FROM users WHERE id = $1', [userId]);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ credits: userCredits });
    });

    // Test Case 2: Missing authToken
    it('should return 401 if authentication token is missing', async () => {
        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Authorization required: No token provided.' });
        expect(jwt.verify).not.toHaveBeenCalled();
        expect(mockQuery).not.toHaveBeenCalled();
    });

    // Test Case 3: Expired authToken
    it('should return 401 if authentication token is expired', async () => {
        mockReq.headers.cookie = 'auth=expiredToken';
        jwt.verify.mockImplementationOnce(() => {
            const error = new Error('Token expired');
            error.name = 'TokenExpiredError';
            throw error;
        });

        await handler(mockReq, mockRes);

        expect(jwt.verify).toHaveBeenCalledWith('expiredToken', secret);
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Authorization failed: Token expired.' });
        expect(mockQuery).not.toHaveBeenCalled();
    });

    // Test Case 4: Invalid authToken
    it('should return 401 if authentication token is invalid', async () => {
        mockReq.headers.cookie = 'auth=invalidToken';
        jwt.verify.mockImplementationOnce(() => {
            const error = new Error('Invalid token');
            error.name = 'JsonWebTokenError';
            throw error;
        });

        await handler(mockReq, mockRes);

        expect(jwt.verify).toHaveBeenCalledWith('invalidToken', secret);
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Authorization failed: Invalid token.' });
        expect(mockQuery).not.toHaveBeenCalled();
    });

    // Test Case 5: User not found
    it('should return 404 if user is not found in the database', async () => {
        mockReq.headers.cookie = 'auth=validToken';
        mockQuery.mockImplementationOnce((sql, params) => {
            if (sql.includes('SELECT credits FROM users WHERE id = $1') && params[0] === userId) {
                return { rows: [] }; // Simulate user not found
            }
            return { rows: [] };
        });

        await handler(mockReq, mockRes);

        expect(jwt.verify).toHaveBeenCalledWith('validToken', secret);
        expect(mockQuery).toHaveBeenCalledWith('SELECT credits FROM users WHERE id = $1', [userId]);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found.' });
    });

    // Test Case 6: Non-GET method
    it('should return 405 for non-GET methods', async () => {
        mockReq.method = 'POST';
        mockReq.headers.cookie = 'auth=anyToken'; // Token is irrelevant for method check

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(405);
        expect(mockRes.end).toHaveBeenCalledWith('Method Not Allowed');
        expect(jwt.verify).not.toHaveBeenCalled();
        expect(mockQuery).not.toHaveBeenCalled();
    });

    // Test Case 7: Internal Server Error during database query
    it('should return 500 if an internal server error occurs during database query', async () => {
        mockReq.headers.cookie = 'auth=validToken';
        mockQuery.mockImplementationOnce(() => {
            throw new Error('Database connection failed');
        });

        await handler(mockReq, mockRes);

        expect(jwt.verify).toHaveBeenCalledWith('validToken', secret);
        expect(mockQuery).toHaveBeenCalledWith('SELECT credits FROM users WHERE id = $1', [userId]);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Error retrieving user credits.' });
    });
});
