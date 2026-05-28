// tests/api/logout.test.js
import logoutHandler from '../../api/logout';
import { jest } from '@jest/globals';

describe('Logout API', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            method: 'POST',
            body: {},
            headers: {},
        };
        mockRes = {
            _status: 200,
            _json: {},
            _headers: {},
            status: jest.fn(function(statusCode) { this._status = statusCode; return this; }),
            json: jest.fn(function(data) { this._json = data; return this; }),
            setHeader: jest.fn(function(name, value) { this._headers[name] = value; }),
            end: jest.fn(),
            getHeaders: jest.fn(function() { return this._headers; }),
        };
    });

    it('should return 405 for non-POST requests', async () => {
        mockReq.method = 'GET';
        await logoutHandler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(405);
        expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
    });

    it('should return 200 and set cookies to expire on POST', async () => {
        await logoutHandler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Logged out successfully!'
        }));

        // Retrieve headers
        const setCookieHeaders = mockRes.setHeader.mock.calls.find(call => call[0] === 'Set-Cookie')[1];
        expect(setCookieHeaders).toBeDefined();
        expect(setCookieHeaders).toHaveLength(3);

        // Cookies should contain Max-Age=0 or Max-Age=-1 or Expires in past
        expect(setCookieHeaders[0]).toContain('authToken=');
        expect(setCookieHeaders[0]).toContain('Max-Age=0');
        expect(setCookieHeaders[1]).toContain('auth=');
        expect(setCookieHeaders[1]).toContain('Max-Age=0');
        expect(setCookieHeaders[2]).toContain('token=');
        expect(setCookieHeaders[2]).toContain('Max-Age=0');
    });
});
