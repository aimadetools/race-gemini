const httpMocks = require('node-mocks-http');
const assignHandler = require('../../api/assign.js').default || require('../../api/assign.js');
const { logError } = require('../../lib/logger');

jest.mock('../../lib/logger', () => ({
    logError: jest.fn(),
}));

describe('api/assign', () => {
    let req;
    let res;

    beforeEach(() => {
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();
        logError.mockClear();
    });

    test('should return 400 if experiment name is missing', async () => {
        req.query = {};
        await assignHandler(req, res);
        expect(res._getStatusCode()).toBe(400);
        expect(res._getJSONData()).toEqual({ error: 'Experiment name is required' });
        expect(logError).toHaveBeenCalled();
    });

    test('should return 400 if experiment name is invalid', async () => {
        req.query = { experiment: 'invalid<script>alert("xss")</script>' };
        await assignHandler(req, res);
        expect(res._getStatusCode()).toBe(400);
        expect(res._getJSONData()).toEqual({ error: 'Invalid experiment name format' });
        expect(logError).toHaveBeenCalled();
    });

    test('should assign a variant if no cookie is present', async () => {
        req.query = { experiment: 'test-experiment' };
        await assignHandler(req, res);
        expect(res._getStatusCode()).toBe(200);
        const jsonData = res._getJSONData();
        expect(jsonData.experiment).toBe('test-experiment');
        expect(['A', 'B']).toContain(jsonData.variant);
    });

    test('should return existing variant if cookie is present', async () => {
        req.query = { experiment: 'test-experiment' };
        req.headers.cookie = 'ab_test-experiment=B';
        await assignHandler(req, res);
        expect(res._getStatusCode()).toBe(200);
        expect(res._getJSONData()).toEqual({ experiment: 'test-experiment', variant: 'B' });
    });

    test('should set Set-Cookie header when assigning a new variant', async () => {
        req.query = { experiment: 'test-experiment' };
        await assignHandler(req, res);
        const cookieHeader = res.getHeader('Set-Cookie');
        expect(cookieHeader).toBeDefined();
        expect(cookieHeader).toContain('ab_test-experiment=');
        expect(cookieHeader).toContain('Path=/');
        expect(cookieHeader).toContain('Max-Age=');
        expect(cookieHeader).toContain('SameSite=Lax');
    });

    test('should not set Set-Cookie header when variant is already assigned', async () => {
        req.query = { experiment: 'test-experiment' };
        req.headers.cookie = 'ab_test-experiment=A';
        await assignHandler(req, res);
        expect(res.getHeader('Set-Cookie')).toBeUndefined();
    });
});
