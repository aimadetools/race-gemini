import { jest } from '@jest/globals';
import handler from '../../api/public-local-seo-grid.js';

describe('Public Local SEO Grid Scanner API', () => {
    let req;
    let res;

    beforeEach(() => {
        req = {
            method: 'POST',
            body: {
                businessName: 'Dallas Plumber Experts',
                userUrl: 'dallasplumberexperts.com',
                city: 'Dallas',
                service: 'Plumber'
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
    });

    test('should return 405 for non-POST methods', async () => {
        req.method = 'GET';
        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(405);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: expect.stringContaining('Only POST requests are allowed')
        }));
    });

    test('should return 400 if required fields are missing', async () => {
        req.body = {
            businessName: 'Dallas Plumber Experts'
        };

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Fields are required: businessName, city, service.'
        }));
    });

    test('should return 200 with local grid analysis results if successful', async () => {
        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const responseData = res.json.mock.calls[0][0];
        expect(responseData.success).toBe(true);
        expect(responseData.businessName).toBe('Dallas Plumber Experts');
        expect(responseData.userUrl).toBe('https://dallasplumberexperts.com');
        expect(responseData.city).toBe('Dallas');
        expect(responseData.service).toBe('Plumber');
        expect(responseData).toHaveProperty('grid');
        expect(responseData.grid.length).toBe(9); // exactly 9 compass coordinates
        expect(responseData).toHaveProperty('summary');
        expect(responseData.summary).toHaveProperty('visibleCount');
        expect(responseData.summary).toHaveProperty('opportunityCount');
        expect(responseData.summary).toHaveProperty('totalSearchVolume');
        expect(responseData.summary).toHaveProperty('coveragePercentage');
    });
});
