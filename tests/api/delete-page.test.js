import { jest } from '@jest/globals';

jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
    del: jest.fn(),
    srem: jest.fn(),
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

import handler from '../../api/delete-page';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import { submitSitemapToSearchEngines } from '../../lib/indexing.js';

describe('Delete Page API', () => {
    let req;
    let res;
    let mockKv;

    beforeEach(() => {
        mockKv = {
            get: jest.fn(),
            del: jest.fn(),
            srem: jest.fn(),
        };

        req = {
            method: 'POST',
            body: { pageId: 'page_123' },
            headers: {},
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            setHeader: jest.fn(),
            end: jest.fn(),
        };

        jest.clearAllMocks();
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
        expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated. Please log in.' });
    });

    test('should return 401 if token is invalid', async () => {
        parseCookie.mockReturnValue({ authToken: 'invalid_token' });
        jwt.verify.mockImplementation(() => { throw new Error('invalid token'); });

        await handler(req, res, mockKv);

        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should return 400 if pageId is missing', async () => {
        parseCookie.mockReturnValue({ authToken: 'valid_token' });
        jwt.verify.mockReturnValue({ userId: 1 });
        req.body = {};

        await handler(req, res, mockKv);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Missing required field: pageId' });
    });

    test('should return 404 if page not found in KV', async () => {
        parseCookie.mockReturnValue({ authToken: 'valid_token' });
        jwt.verify.mockReturnValue({ userId: 1 });
        mockKv.get.mockResolvedValueOnce(null);

        await handler(req, res, mockKv);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Page not found.' });
    });

    test('should return 403 if page does not belong to user', async () => {
        parseCookie.mockReturnValue({ authToken: 'valid_token' });
        jwt.verify.mockReturnValue({ userId: 1 });
        mockKv.get.mockResolvedValueOnce(JSON.stringify({ userId: 2 }));

        await handler(req, res, mockKv);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized. You do not own this page.' });
    });

    test('should delete page, remove from user set, ping search engines, and return 200', async () => {
        parseCookie.mockReturnValue({ authToken: 'valid_token' });
        jwt.verify.mockReturnValue({ userId: 1 });
        mockKv.get.mockResolvedValueOnce(JSON.stringify({ userId: 1, service: 'plumbing', town: 'Dallas' }));

        await handler(req, res, mockKv);

        expect(mockKv.del).toHaveBeenCalledWith('page_123');
        expect(mockKv.del).toHaveBeenCalledWith('page:page_123:views');
        expect(mockKv.del).toHaveBeenCalledWith('page:page_123:unique_visitors');
        expect(mockKv.srem).toHaveBeenCalledWith('user:1:pages', 'page_123');
        expect(submitSitemapToSearchEngines).toHaveBeenCalledWith(1, req);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: 'Page deleted successfully.' });
    });
});
