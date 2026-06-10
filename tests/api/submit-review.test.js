import { jest } from '@jest/globals';
import handler from '../../api/submit-review.js';
import { clearMockUsers, setQueryDelegate } from '../../db/mockDb.js';

const mockQuery = jest.fn();

describe('Submit Review API', () => {
    let mockReq;
    let mockRes;
    let mockKv;

    beforeEach(() => {
        jest.clearAllMocks();
        clearMockUsers();
        setQueryDelegate(mockQuery);
        mockQuery.mockClear();

        mockReq = {
            method: 'POST',
            body: {
                clientId: '123',
                authorName: 'John Doe',
                rating: '5',
                reviewText: 'Outstanding local service!'
            }
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn().mockReturnThis(),
        };

        mockKv = {
            lrange: jest.fn().mockResolvedValue([])
        };
    });

    afterEach(() => {
        setQueryDelegate(null);
    });

    it('should return 405 for non-POST requests', async () => {
        mockReq.method = 'GET';
        await handler(mockReq, mockRes, mockKv);
        expect(mockRes.status).toHaveBeenCalledWith(405);
    });

    it('should return 400 if required fields are missing', async () => {
        delete mockReq.body.authorName;
        await handler(mockReq, mockRes, mockKv);
        expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if rating is invalid', async () => {
        mockReq.body.rating = '6';
        await handler(mockReq, mockRes, mockKv);
        expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should successfully store review', async () => {
        // Mock SQL responses
        // 1. Fetch business owner profile
        mockQuery.mockResolvedValueOnce({
            rows: [{
                email: 'business@example.com',
                is_agency: false,
                subscription_status: 'active',
                webhook_url: null,
                webhook_enabled: false,
                sms_enabled: false,
                sms_phone: null,
                name: 'ACME Plumbers'
            }]
        });
        // 2. Insert testimonial
        mockQuery.mockResolvedValueOnce({
            rows: [{
                id: 999,
                author_name: 'John Doe',
                rating: 5,
                review_text: 'Outstanding local service!',
                review_date: new Date()
            }]
        });

        await handler(mockReq, mockRes, mockKv);

        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Review submitted successfully',
            testimonial: expect.any(Object)
        }));
    });
});
