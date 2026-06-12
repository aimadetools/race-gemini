import { jest } from '@jest/globals';
import handler from '../../api/unlock-lead.js';
import { clearMockUsers, setQueryDelegate } from '../../db/mockDb.js';
import jwt from 'jsonwebtoken';

const mockQuery = jest.fn();

describe('Unlock Lead API', () => {
    let mockReq;
    let mockRes;
    let mockKv;
    const userId = 123;
    const leadId = 456;
    const secret = 'test_jwt_secret';
    let verifySpy;

    beforeAll(() => {
        process.env.JWT_SECRET = secret;
        verifySpy = jest.spyOn(jwt, 'verify');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        clearMockUsers();
        setQueryDelegate(mockQuery);
        mockQuery.mockClear();

        mockReq = {
            method: 'POST',
            headers: {
                cookie: 'auth=validToken'
            },
            body: {
                leadId: leadId
            }
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn().mockReturnThis(),
            end: jest.fn().mockReturnThis(),
        };

        mockKv = {
            lpush: jest.fn().mockResolvedValue(true)
        };

        verifySpy.mockReturnValue({ userId });
    });

    afterEach(() => {
        setQueryDelegate(null);
    });

    afterAll(() => {
        delete process.env.JWT_SECRET;
        verifySpy.mockRestore();
    });

    it('should return 405 for non-POST requests', async () => {
        mockReq.method = 'GET';
        await handler(mockReq, mockRes, mockKv);
        expect(mockRes.status).toHaveBeenCalledWith(405);
    });

    it('should return 401 if missing auth token', async () => {
        mockReq.headers.cookie = '';
        await handler(mockReq, mockRes, mockKv);
        expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 if leadId is missing', async () => {
        mockReq.body = {};
        await handler(mockReq, mockRes, mockKv);
        expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if lead is not found or does not belong to user', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] }); // Lead query returns nothing
        await handler(mockReq, mockRes, mockKv);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Lead not found or does not belong to you.' });
    });

    it('should return 200 immediately if lead is already unlocked', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{
                id: leadId,
                name: 'John Doe',
                email: 'john@example.com',
                phone: '123-456',
                message: 'hello',
                url: '/page',
                created_at: new Date(),
                is_unlocked: true
            }]
        });
        mockQuery.mockResolvedValueOnce({
            rows: [{
                credits: 5,
                is_agency: false,
                subscription_status: 'inactive'
            }]
        });

        await handler(mockReq, mockRes, mockKv);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Lead is already unlocked.',
            lead: expect.objectContaining({ is_unlocked: true, email: 'john@example.com' })
        }));
        // Verify no credits were deducted
        expect(mockQuery).not.toHaveBeenCalledWith(expect.stringContaining('UPDATE users SET credits'), expect.any(Array));
    });

    it('should return 200 immediately if user is a paid user', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{
                id: leadId,
                name: 'John Doe',
                email: 'john@example.com',
                phone: '123-456',
                message: 'hello',
                url: '/page',
                created_at: new Date(),
                is_unlocked: false
            }]
        });
        mockQuery.mockResolvedValueOnce({
            rows: [{
                credits: 5,
                is_agency: true,
                subscription_status: 'active'
            }]
        });

        await handler(mockReq, mockRes, mockKv);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        // Verify no credits were deducted
        expect(mockQuery).not.toHaveBeenCalledWith(expect.stringContaining('UPDATE users SET credits'), expect.any(Array));
    });

    it('should return 400 if trial user has 0 credits', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{
                id: leadId,
                name: 'John Doe',
                email: 'john@example.com',
                phone: '123-456',
                message: 'hello',
                url: '/page',
                created_at: new Date(),
                is_unlocked: false
            }]
        });
        mockQuery.mockResolvedValueOnce({
            rows: [{
                credits: 0,
                is_agency: false,
                subscription_status: 'inactive'
            }]
        });

        await handler(mockReq, mockRes, mockKv);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Insufficient credits to unlock lead. Please purchase more credits.' });
    });

    it('should deduct credit, unlock lead, and return 200 with lead info for trial user with credits', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{
                id: leadId,
                name: 'John Doe',
                email: 'john@example.com',
                phone: '123-456',
                message: 'hello',
                url: '/page',
                created_at: new Date(),
                is_unlocked: false
            }]
        });
        mockQuery.mockResolvedValueOnce({
            rows: [{
                credits: 5,
                is_agency: false,
                subscription_status: 'inactive'
            }]
        });

        // Mock UPDATE users SET credits
        mockQuery.mockResolvedValueOnce({ rows: [] });
        // Mock UPDATE leads SET is_unlocked
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await handler(mockReq, mockRes, mockKv);

        expect(mockQuery).toHaveBeenCalledWith('UPDATE users SET credits = credits - 1 WHERE id = $1', [userId]);
        expect(mockQuery).toHaveBeenCalledWith('UPDATE leads SET is_unlocked = TRUE WHERE id = $1', [leadId]);
        expect(mockKv.lpush).toHaveBeenCalledWith(`user:${userId}:credittransactions`, expect.stringContaining('Unlocked lead: John Doe'));
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Lead unlocked successfully.',
            lead: expect.objectContaining({ is_unlocked: true, email: 'john@example.com' })
        }));
    });
});
