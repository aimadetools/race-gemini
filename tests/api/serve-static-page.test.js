import serveStaticPageHandler from '../../api/serve-static-page';
import { jest } from '@jest/globals';
import { clearMockUsers, setQueryDelegate } from '../../db/mockDb.js';

describe('Serve Static Page API', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        jest.clearAllMocks();
        clearMockUsers();
        setQueryDelegate(null);
        mockReq = {
            method: 'GET',
            query: { fileName: 'test-page.html' },
            headers: {},
        };
        mockRes = {
            _status: 200,
            _data: '',
            _headers: {},
            status: jest.fn(function(statusCode) { this._status = statusCode; return this; }),
            send: jest.fn(function(data) { this._data = data; return this; }),
            setHeader: jest.fn(function(name, value) { this._headers[name] = value; }),
            end: jest.fn(),
            getHeaders: jest.fn(function() { return this._headers; }),
        };
    });

    it('should return 405 for non-GET requests', async () => {
        mockReq.method = 'POST';
        await serveStaticPageHandler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(405);
        expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['GET']);
    });

    it('should return 400 if fileName parameter is missing', async () => {
        mockReq.query = {};
        await serveStaticPageHandler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.send).toHaveBeenCalledWith('Missing fileName parameter');
    });

    it('should return 404 if page is not found in database', async () => {
        setQueryDelegate(async (text, params) => {
            return { rows: [] };
        });

        await serveStaticPageHandler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.send).toHaveBeenCalledWith('Page Not Found');
    });

    it('should return 200 and html content if page is found in database', async () => {
        const mockHtml = '<html><body>Test Page Content</body></html>';
        setQueryDelegate(async (text, params) => {
            if (text.includes('SELECT content FROM seo_pages')) {
                return { rows: [{ content: mockHtml }] };
            }
            return { rows: [] };
        });

        await serveStaticPageHandler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
        const sentContent = mockRes.send.mock.calls[0][0];
        expect(sentContent).toContain('demo-banner');
        expect(sentContent).toContain('Test Page Content');
    });

    it('should return 500 if database query throws error', async () => {
        setQueryDelegate(async (text, params) => {
            throw new Error('Database connection failed');
        });

        await serveStaticPageHandler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.send).toHaveBeenCalledWith('Internal Server Error');
    });
});
