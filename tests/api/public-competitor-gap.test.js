import { jest } from '@jest/globals';
import handler from '../../api/public-competitor-gap.js';

describe('Public Competitor Gap Analysis API', () => {
    let req;
    let res;

    beforeEach(() => {
        req = {
            method: 'POST',
            body: {
                userUrl: 'https://myplumbingservice.com',
                competitorUrl: 'https://testcompetitor.com',
                city: 'Austin',
                service: 'Plumbing'
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
            userUrl: 'https://myplumbingservice.com'
        };

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'All fields are required: userUrl, competitorUrl, city, service.'
        }));
    });

    test('should return 200 with gap analysis results if successful', async () => {
        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const responseData = res.json.mock.calls[0][0];
        expect(responseData.success).toBe(true);
        expect(responseData.userDomain).toBe('myplumbingservice.com');
        expect(responseData.competitorDomain).toBe('testcompetitor.com');
        expect(responseData.city).toBe('Austin');
        expect(responseData.service).toBe('Plumbing');
        expect(responseData).toHaveProperty('summary');
        expect(responseData.summary).toHaveProperty('sharedCount');
        expect(responseData.summary).toHaveProperty('advantageCount');
        expect(responseData.summary).toHaveProperty('opportunityCount');
        expect(responseData.summary).toHaveProperty('untappedCount');
        expect(responseData).toHaveProperty('sharedLocations');
        expect(responseData).toHaveProperty('uncontestedLocations');
        expect(responseData).toHaveProperty('missedLocations');
        expect(responseData).toHaveProperty('untappedLocations');
    });
});
