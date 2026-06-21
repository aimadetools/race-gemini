import { jest } from '@jest/globals';
import handler from '../../api/public-business-info.js';
import { clearMockUsers, setQueryDelegate } from '../../db/mockDb.js';

const mockQuery = jest.fn();

describe('Public Business Info API', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        jest.clearAllMocks();
        clearMockUsers();
        setQueryDelegate(mockQuery);
        mockQuery.mockClear();

        mockReq = {
            method: 'GET',
            query: {
                clientId: '123'
            }
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn().mockReturnThis(),
        };
    });

    afterEach(() => {
        setQueryDelegate(null);
    });

    it('should return 405 for non-GET requests', async () => {
        mockReq.method = 'POST';
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(405);
    });

    it('should return 400 if clientId is missing', async () => {
        delete mockReq.query.clientId;
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid clientId', async () => {
        mockReq.query.clientId = 'abc';
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if business is not found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] }); // User query returns empty
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return business info successfully', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{
                name: 'ACME Plumbers',
                logo_url: 'http://example.com/logo.png',
                is_agency: false,
                agency_id: null,
                google_review_link: 'https://g.page/acme/review',
                facebook_review_link: 'https://facebook.com/acme/reviews',
                yelp_review_link: 'https://yelp.com/biz/acme',
                primary_color: '#ff0000',
                widget_css: '.custom { color: green; }'
            }]
        });
        mockQuery.mockResolvedValueOnce({
            rows: [{ count: '15' }]
        });

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
            businessName: 'ACME Plumbers',
            logoUrl: 'http://example.com/logo.png',
            pagesCount: 15,
            googleReviewLink: 'https://g.page/acme/review',
            facebookReviewLink: 'https://facebook.com/acme/reviews',
            yelpReviewLink: 'https://yelp.com/biz/acme',
            primaryColor: '#ff0000',
            widgetCss: '.custom { color: green; }'
        });
    });
});
