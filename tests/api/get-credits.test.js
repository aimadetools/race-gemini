import { jest } from '@jest/globals';
import handler from '../../api/get-credits';
import { clearMockUsers, setQueryDelegate } from '../../db/mockDb.js';
import jwt from 'jsonwebtoken';

const mockQuery = jest.fn();

describe('Get Credits API', () => {
    let mockReq;
    let mockRes;
    const userId = 'testUserId123';
    const userCredits = 100;
    const secret = 'test_jwt_secret';
    let verifySpy;

    beforeAll(() => {
        process.env.JWT_SECRET = secret;
        verifySpy = jest.spyOn(jwt, 'verify');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        clearMockUsers(); // Ensure a clean mock DB state for each test
        setQueryDelegate(mockQuery);
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
        verifySpy.mockReturnValue({ userId });
    });

    afterEach(() => {
        setQueryDelegate(null);
    });

    afterAll(() => {
        delete process.env.JWT_SECRET;
        verifySpy.mockRestore();
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

        expect(verifySpy).toHaveBeenCalledWith('validToken', secret);
        expect(mockQuery).toHaveBeenCalledWith('SELECT credits FROM users WHERE id = $1', [userId]);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ credits: userCredits });
    });

    // Test Case 2: Missing authToken
    it('should return 401 if authentication token is missing', async () => {
        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Authorization required: No token provided.' });
        expect(verifySpy).not.toHaveBeenCalled();
        expect(mockQuery).not.toHaveBeenCalled();
    });

    // Test Case 3: Expired authToken
    it('should return 401 if authentication token is expired', async () => {
        mockReq.headers.cookie = 'auth=expiredToken';
        verifySpy.mockImplementationOnce(() => {
            const error = new Error('Token expired');
            error.name = 'TokenExpiredError';
            throw error;
        });

        await handler(mockReq, mockRes);

        expect(verifySpy).toHaveBeenCalledWith('expiredToken', secret);
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Authorization failed: Token expired.' });
        expect(mockQuery).not.toHaveBeenCalled();
    });

    // Test Case 4: Invalid authToken
    it('should return 401 if authentication token is invalid', async () => {
        mockReq.headers.cookie = 'auth=invalidToken';
        verifySpy.mockImplementationOnce(() => {
            const error = new Error('Invalid token');
            error.name = 'JsonWebTokenError';
            throw error;
        });

        await handler(mockReq, mockRes);

        expect(verifySpy).toHaveBeenCalledWith('invalidToken', secret);
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

        expect(verifySpy).toHaveBeenCalledWith('validToken', secret);
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
        expect(verifySpy).not.toHaveBeenCalled();
        expect(mockQuery).not.toHaveBeenCalled();
    });

    // Test Case 7: Internal Server Error during database query
    it('should return 500 if an internal server error occurs during database query', async () => {
        mockReq.headers.cookie = 'auth=validToken';
        mockQuery.mockImplementationOnce(() => {
            throw new Error('Database connection failed');
        });

        await handler(mockReq, mockRes);

        expect(verifySpy).toHaveBeenCalledWith('validToken', secret);
        expect(mockQuery).toHaveBeenCalledWith('SELECT credits FROM users WHERE id = $1', [userId]);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Error retrieving user credits.' });
    });
});
