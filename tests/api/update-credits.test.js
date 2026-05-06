import handler from '../../api/update-credits';
import { jest } from '@jest/globals';
import { mockQuery as originalMockQuery, clearMockUsers, mockBcrypt } from '../../db/mockDb'; // Import mockBcrypt too for consistency, though not used here
import jwt from 'jsonwebtoken';

// Re-declare mockQuery as a Jest mock function
const mockQuery = jest.fn(originalMockQuery);

// Mock the ../db/index.js module to use our mockQuery
jest.mock('../../db/index.js', () => ({
    query: (...args) => mockQuery(...args),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken');

describe('Update Credits API', () => {
    let mockReq;
    let mockRes;
    const testUserId = 'user123';
    const initialCredits = 50;
    const secret = 'test_jwt_secret';

    beforeAll(() => {
        process.env.JWT_SECRET = secret;
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        clearMockUsers(); // Clear mock DB before each test
        mockQuery.mockClear();

        // Seed mockUsers with a test user using the specific testUserId
        const hashedPassword = await mockBcrypt.hash('password123', 10);
        await originalMockQuery('INSERT INTO users (id, email, hashed_password, credits) VALUES ($1, $2, $3, $4) RETURNING id', [
            testUserId, // Use the defined testUserId
            'test@example.com',
            hashedPassword,
            initialCredits
        ]);


        mockReq = {
            method: 'POST',
            cookies: {},
            body: {},
        };
        mockRes = {
            _status: 200,
            _json: {},
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn().mockReturnThis(),
            end: jest.fn().mockReturnThis(),
        };

        // Default mock for jwt.verify (can be overridden in specific tests)
        jwt.verify.mockReturnValue({ userId: testUserId });
    });

    afterAll(() => {
        delete process.env.JWT_SECRET;
    });

    // Helper to get current credits from mock DB (for verification)
    const getCurrentCredits = async (userId) => {
        const result = await originalMockQuery('SELECT credits FROM users WHERE id = $1', [userId]);
        return result.rows.length > 0 ? result.rows[0].credits : null;
    };


    // Test Case 1: Successful credit addition using targetUserId
    it('should return 200 and add credits using targetUserId', async () => {
        mockReq.body = { targetUserId: testUserId, amount: 20 };
        const expectedNewCredits = initialCredits + 20;

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Credits updated successfully.', newCredits: expectedNewCredits });
        expect(await getCurrentCredits(testUserId)).toBe(expectedNewCredits);
        expect(mockQuery).toHaveBeenCalledWith(
            'UPDATE users SET credits = credits + $1 WHERE id = $2 RETURNING credits',
            [20, testUserId]
        );
    });

    // Test Case 2: Successful credit deduction using targetUserId
    it('should return 200 and deduct credits using targetUserId', async () => {
        mockReq.body = { targetUserId: testUserId, amount: -10 };
        const expectedNewCredits = initialCredits - 10;

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Credits updated successfully.', newCredits: expectedNewCredits });
        expect(await getCurrentCredits(testUserId)).toBe(expectedNewCredits);
        expect(mockQuery).toHaveBeenCalledWith(
            'UPDATE users SET credits = credits + $1 WHERE id = $2 RETURNING credits',
            [-10, testUserId]
        );
    });

    // Test Case 3: Successful credit update using authToken (when targetUserId is not provided)
    it('should return 200 and add credits using authToken when targetUserId is not provided', async () => {
        mockReq.cookies.authToken = 'validToken';
        mockReq.body = { amount: 30 };
        // We need to make sure the userId from the token corresponds to an existing user
        // The default jwt.verify mock returns 'testUserId123'.
        // So, we need to ensure this user exists in mockDb for this test.
        // For simplicity, we'll assume 'testUserId123' is effectively '1' for now.
        // In a more robust mockDb, we'd map this.
        const expectedNewCredits = initialCredits + 30; // Assuming 'testUserId123' points to '1'

        await handler(mockReq, mockRes);

        expect(jwt.verify).toHaveBeenCalledWith('validToken', secret);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Credits updated successfully.', newCredits: expectedNewCredits });
        expect(await getCurrentCredits(testUserId)).toBe(expectedNewCredits);
        expect(mockQuery).toHaveBeenCalledWith(
            'UPDATE users SET credits = credits + $1 WHERE id = $2 RETURNING credits',
            [30, testUserId] // Expecting testUserId here from token
        );
    });


    // Test Case 4: Missing targetUserId and authToken
    it('should return 400 if targetUserId is missing and no authToken', async () => {
        mockReq.body = { amount: 10 }; // Missing targetUserId
        // No authToken in cookies

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'User ID and a valid amount are required.' });
        expect(jwt.verify).not.toHaveBeenCalled();
        expect(mockQuery).not.toHaveBeenCalled();
    });

    // Test Case 5: Invalid amount (e.g., not a number)
    it('should return 400 if amount is not a number', async () => {
        mockReq.body = { targetUserId: '1', amount: 'abc' };

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'User ID and a valid amount are required.' });
        expect(mockQuery).not.toHaveBeenCalled();
    });

    // Test Case 6: User not found
    it('should return 404 if targetUserId does not exist', async () => {
        mockReq.body = { targetUserId: 'nonexistentUser', amount: 10 };

        mockQuery.mockImplementationOnce((sql, params) => {
            if (sql.includes('UPDATE users') && params[1] === 'nonexistentUser') {
                return { rows: [] }; // Simulate user not found
            }
            // For other queries (like initial user creation in beforeEach), use original mock
            return originalMockQuery(sql, params);
        });

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found.' });
        expect(mockQuery).toHaveBeenCalledWith(
            'UPDATE users SET credits = credits + $1 WHERE id = $2 RETURNING credits',
            [10, 'nonexistentUser']
        );
    });

    // Test Case 7: Non-POST method
    it('should return 405 for non-POST methods', async () => {
        mockReq.method = 'GET';
        mockReq.body = { targetUserId: '1', amount: 10 };

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(405);
        expect(mockRes.end).toHaveBeenCalledWith('Method GET Not Allowed');
        expect(jwt.verify).not.toHaveBeenCalled();
        expect(mockQuery).not.toHaveBeenCalled();
    });

    // Test Case 8: Internal Server Error during database update
    it('should return 500 if an internal server error occurs during database update', async () => {
        mockReq.body = { targetUserId: '1', amount: 10 };

        mockQuery.mockImplementationOnce(() => {
            throw new Error('Database update failed');
        });

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Internal server error.' });
        expect(mockQuery).toHaveBeenCalledWith(
            'UPDATE users SET credits = credits + $1 WHERE id = $2 RETURNING credits',
            [10, '1']
        );
    });
});