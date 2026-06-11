import ogImageHandler from '../../api/og-image.js';
import { jest } from '@jest/globals';

describe('OG Image API Handler', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            method: 'GET',
            query: {
                businessName: 'Apex Plumbers',
                service: 'Leak Repair',
                town: 'Austin',
                color: '#ff0000'
            },
            headers: {}
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

    it('should return 200 and svg content type', async () => {
        await ogImageHandler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'image/svg+xml');
        expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('public'));
        
        const sentContent = mockRes.send.mock.calls[0][0];
        expect(sentContent).toContain('<svg');
        expect(sentContent).toContain('Apex Plumbers');
        expect(sentContent).toContain('Leak Repair');
        expect(sentContent).toContain('Austin');
        expect(sentContent).toContain('#ff0000');
    });

    it('should use default values if parameters are omitted', async () => {
        mockReq.query = {};
        await ogImageHandler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'image/svg+xml');
        
        const sentContent = mockRes.send.mock.calls[0][0];
        expect(sentContent).toContain('<svg');
        expect(sentContent).toContain('LocalLeads Service');
        expect(sentContent).toContain('Premium Service');
        expect(sentContent).toContain('Your Area');
        expect(sentContent).toContain('#3b82f6');
    });

    it('should fall back to default color if invalid color is provided', async () => {
        mockReq.query.color = 'invalid-color';
        await ogImageHandler(mockReq, mockRes);

        const sentContent = mockRes.send.mock.calls[0][0];
        expect(sentContent).toContain('#3b82f6');
    });

    it('should escape XML entities to avoid malformed SVG', async () => {
        mockReq.query.businessName = 'Apex & Son <Plumbing> "Repair"';
        await ogImageHandler(mockReq, mockRes);

        const sentContent = mockRes.send.mock.calls[0][0];
        expect(sentContent).toContain('Apex &amp; Son &lt;Plumbing&gt; &quot;Repair&quot;');
    });
});
