import { jest } from '@jest/globals';

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('cookie', () => ({
  parse: jest.fn(),
}));

import handler from '../../api/check-indexing-status';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import { clearMockUsers, addMockUser, addMockSeoPage, clearMockSeoPages } from '../../db/mockDb.js';

describe('Check Indexing Status API', () => {
    let req;
    let res;

    beforeEach(() => {
        req = {
            method: 'POST',
            body: {
                pageId: 'page_123',
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
    });

    test('should return 404 if page does not exist', async () => {
        parseCookie.mockReturnValue({ authToken: 'valid_token' });
        jwt.verify.mockReturnValue({ userId: 1 });

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should return 403 if page does not belong to user', async () => {
        parseCookie.mockReturnValue({ authToken: 'valid_token' });
        jwt.verify.mockReturnValue({ userId: 1 });
        addMockSeoPage({ id: 'page_123', user_id: 2 });

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('should successfully check indexing status and return 200', async () => {
        parseCookie.mockReturnValue({ authToken: 'valid_token' });
        jwt.verify.mockReturnValue({ userId: 1 });
        
        addMockUser({ id: 1, name: 'Client 1', email: 'client1@example.com', agency_id: null, custom_domain: null });
        addMockSeoPage({
            id: 'page_123',
            user_id: 1,
            business_name: 'Super Plumber',
            service: 'Plumbing',
            town: 'Austin',
            zip_code: '78701',
        });

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Indexing status checked successfully.',
            indexingStatus: expect.any(String),
            lastIndexingCheck: expect.any(String)
        }));
    });

    test('should successfully check indexing status and return 200 for agency-managed client pages', async () => {
        parseCookie.mockReturnValue({ authToken: 'valid_token' });
        jwt.verify.mockReturnValue({ userId: 2 });
        
        addMockUser({ id: 1, name: 'Client 1', email: 'client1@example.com', agency_id: 2, custom_domain: null });
        addMockUser({ id: 2, name: 'Agency 1', email: 'agency1@example.com', is_agency: true });
        addMockSeoPage({
            id: 'page_123',
            user_id: 1,
            business_name: 'Super Plumber',
            service: 'Plumbing',
            town: 'Austin',
            zip_code: '78701',
        });

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Indexing status checked successfully.',
            indexingStatus: expect.any(String),
            lastIndexingCheck: expect.any(String)
        }));
    });
});
