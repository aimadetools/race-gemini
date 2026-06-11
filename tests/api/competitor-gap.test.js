import { jest } from '@jest/globals';

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('cookie', () => ({
  parse: jest.fn(),
}));

import handler from '../../api/competitor-gap';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import { clearMockUsers, addMockUser, addMockSeoPage, clearMockSeoPages } from '../../db/mockDb.js';

describe('Competitor Gap Analysis API', () => {
    let req;
    let res;

    beforeEach(() => {
        req = {
            method: 'POST',
            body: {
                competitorUrl: 'https://testcompetitor.com',
            },
            headers: {},
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            setHeader: jest.fn(),
            end: jest.fn(),
        };

        jest.clearAllMocks();
        clearMockUsers();
        clearMockSeoPages();
        process.env.JWT_SECRET = 'test_secret';
    });

    afterEach(() => {
        delete process.env.JWT_SECRET;
    });

    test('should return 405 for non-POST methods', async () => {
        req.method = 'GET';
        await handler(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
        expect(res.status).toHaveBeenCalledWith(405);
    });

    test('should return 401 if no token is provided', async () => {
        parseCookie.mockReturnValue({});
        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should return 400 if required fields are missing', async () => {
        parseCookie.mockReturnValue({ authToken: 'valid_token' });
        jwt.verify.mockReturnValue({ userId: 1 });
        req.body = {};

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Missing required field: competitorUrl'
        }));
    });

    test('should return 400 if user has no generated pages', async () => {
        parseCookie.mockReturnValue({ authToken: 'valid_token' });
        jwt.verify.mockReturnValue({ userId: 1 });
        
        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: expect.stringContaining('No pages generated yet')
        }));
    });

    test('should return 200 with gap analysis results if successful', async () => {
        parseCookie.mockReturnValue({ authToken: 'valid_token' });
        jwt.verify.mockReturnValue({ userId: 1 });
        
        addMockUser({ id: 1, name: 'Client 1', email: 'client1@example.com' });
        addMockSeoPage({
            id: 'page_1',
            user_id: 1,
            business_name: 'Super Plumber',
            service: 'Plumbing',
            town: 'Austin',
        });

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const responseData = res.json.mock.calls[0][0];
        expect(responseData.success).toBe(true);
        expect(responseData.competitorDomain).toBe('testcompetitor.com');
        expect(responseData).toHaveProperty('summary');
        expect(responseData.summary).toHaveProperty('sharedCount');
        expect(responseData.summary).toHaveProperty('advantageCount');
        expect(responseData.summary).toHaveProperty('opportunityCount');
        expect(responseData).toHaveProperty('sharedLocations');
        expect(responseData).toHaveProperty('uncontestedLocations');
        expect(responseData).toHaveProperty('missedLocations');
    });
});
