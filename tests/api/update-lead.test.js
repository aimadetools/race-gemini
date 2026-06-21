import { jest } from '@jest/globals';
import handler from '../../api/update-lead.js';
import { clearMockUsers, setQueryDelegate } from '../../db/mockDb.js';
import jwt from 'jsonwebtoken';

const mockQuery = jest.fn();

describe('Update Lead API', () => {
    let mockReq;
    let mockRes;
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
                cookie: 'authToken=validToken'
            },
            body: {
                leadId: leadId,
                status: 'Contacted',
                notes: 'Called lead, scheduling a demo.'
            }
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn().mockReturnThis(),
            end: jest.fn().mockReturnThis(),
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
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(405);
    });

    it('should return 401 if missing auth token', async () => {
        mockReq.headers.cookie = '';
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 if leadId is missing', async () => {
        mockReq.body = { status: 'Contacted' };
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if lead is not found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] }); // Lead query returns nothing
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 if lead does not belong to user', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{
                id: leadId,
                user_id: 999, // different user
                is_unlocked: true
            }]
        });
        mockQuery.mockResolvedValueOnce({
            rows: [] // not managed by agency
        });
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized. You do not own this lead.' });
    });

    it('should return 403 if lead is locked and user is not a paid user', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{
                id: leadId,
                user_id: userId,
                is_unlocked: false
            }]
        });
        mockQuery.mockResolvedValueOnce({
            rows: [{
                is_agency: false,
                subscription_status: 'inactive'
            }]
        });
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Lead is locked. Please unlock it using credits first.' });
    });

    it('should return 400 for invalid status values', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{
                id: leadId,
                user_id: userId,
                is_unlocked: true
            }]
        });
        mockQuery.mockResolvedValueOnce({
            rows: [{
                is_agency: false,
                subscription_status: 'inactive'
            }]
        });
        mockReq.body.status = 'InvalidStatus';
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Invalid status') }));
    });

    it('should update status and notes successfully if lead is unlocked', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{
                id: leadId,
                user_id: userId,
                is_unlocked: true
            }]
        });
        mockQuery.mockResolvedValueOnce({
            rows: [{
                is_agency: false,
                subscription_status: 'inactive'
            }]
        });
        mockQuery.mockResolvedValueOnce({
            rows: [{
                id: leadId,
                status: 'Contacted',
                notes: 'Called lead, scheduling a demo.'
            }]
        });

        await handler(mockReq, mockRes);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE leads'),
            [leadId, 'Contacted', 'Called lead, scheduling a demo.']
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            lead: expect.objectContaining({ status: 'Contacted', notes: 'Called lead, scheduling a demo.' })
        }));
    });
});
