import { jest } from '@jest/globals';

jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('cookie', () => ({
  parse: jest.fn(),
}));

jest.mock('../../lib/indexing.js', () => ({
  submitSitemapToSearchEngines: jest.fn(),
}));

import handler from '../../api/update-page';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import { submitSitemapToSearchEngines } from '../../lib/indexing.js';
import { clearMockUsers, addMockUser, addMockSeoPage } from '../../db/mockDb.js';

describe('Update Page API', () => {
    let req;
    let res;
    let mockKv;

    beforeEach(() => {
        mockKv = {
            get: jest.fn(),
            set: jest.fn(),
        };

        req = {
            method: 'POST',
            body: {
                pageId: 'page_123',
                businessName: 'Super Plumber',
                service: 'Plumbing',
                town: 'Austin',
                zipCode: '78701',
                telephone: '5125550199',
                priceRange: '$$',
                openingHours: 'Mo-Fr 08:00-18:00',
                enableAICopy: true,
                aiStyle: 'friendly',
                aiKeywords: 'family-owned, 24/7 service'
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
        process.env.JWT_SECRET = 'test_secret';
    });

    afterEach(() => {
        delete process.env.JWT_SECRET;
    });

    test('should return 405 for non-POST methods', async () => {
        req.method = 'GET';
        await handler(req, res, mockKv);

        expect(res.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
        expect(res.status).toHaveBeenCalledWith(405);
    });

    test('should return 401 if no token is provided', async () => {
        parseCookie.mockReturnValue({});
        await handler(req, res, mockKv);

        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should return 400 if required fields are missing', async () => {
        parseCookie.mockReturnValue({ authToken: 'valid_token' });
        jwt.verify.mockReturnValue({ userId: 1 });
        req.body = { pageId: 'page_123' };

        await handler(req, res, mockKv);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should return 404 if page does not exist', async () => {
        parseCookie.mockReturnValue({ authToken: 'valid_token' });
        jwt.verify.mockReturnValue({ userId: 1 });

        await handler(req, res, mockKv);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should return 403 if page does not belong to user', async () => {
        parseCookie.mockReturnValue({ authToken: 'valid_token' });
        jwt.verify.mockReturnValue({ userId: 1 });
        addMockSeoPage({ id: 'page_123', user_id: 2 });

        await handler(req, res, mockKv);

        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('should successfully update page values and return 200', async () => {
        parseCookie.mockReturnValue({ authToken: 'valid_token' });
        jwt.verify.mockReturnValue({ userId: 1 });
        
        addMockUser({ id: 1, name: 'Client 1', email: 'client1@example.com', agency_id: null });
        addMockSeoPage({
            id: 'page_123',
            user_id: 1,
            business_name: 'Old Name',
            service: 'Old Service',
            town: 'Old Town',
            zip_code: '11111',
            created_at: new Date('2026-06-03T19:00:00Z')
        });

        await handler(req, res, mockKv);

        expect(submitSitemapToSearchEngines).toHaveBeenCalledWith(1, req);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Page updated successfully.',
            page: expect.objectContaining({
                pageId: 'page_123',
                businessName: 'Super Plumber',
                service: 'Plumbing',
                town: 'Austin',
                zipCode: '78701',
                enableAICopy: true,
                aiStyle: 'friendly',
                aiKeywords: 'family-owned, 24/7 service'
            })
        }));
    });
});
