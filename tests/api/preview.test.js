import previewHandler from '../../api/preview.js';
import { jest } from '@jest/globals';

describe('Preview API Handler', () => {
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
                primaryColor: '#ff0000'
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

    it('should return 405 for non-GET requests', async () => {
        mockReq.method = 'POST';
        await previewHandler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(405);
        expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', 'GET');
    });

    it('should return 400 if any required query parameter is missing', async () => {
        mockReq.query = { businessName: 'Apex Plumbers', service: 'Leak Repair' }; // town is missing
        await previewHandler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('Missing required query parameters'));
    });

    it('should return 200 and watermarked HTML for valid request', async () => {
        await previewHandler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
        
        const sentContent = mockRes.send.mock.calls[0][0];
        expect(sentContent).toContain('Apex Plumbers');
        expect(sentContent).toContain('Leak Repair');
        expect(sentContent).toContain('Austin');
        expect(sentContent).toContain('Live Demo'); // watermark banner text
        expect(sentContent).toContain('#ff0000'); // primary color check
    });
});
