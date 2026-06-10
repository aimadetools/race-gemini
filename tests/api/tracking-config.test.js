import { jest } from '@jest/globals';
import { createRequest, createResponse } from 'node-mocks-http';

let handler;

describe('Tracking Config API', () => {
    let mockReq;
    let mockRes;

    beforeEach(async () => {
        delete require.cache[require.resolve('../../api/tracking-config')];
        handler = (await import('../../api/tracking-config')).default;

        mockReq = createRequest({ method: 'GET' });
        mockRes = createResponse();
    });

    afterEach(() => {
        delete process.env.OWN_GA_TRACKING_ID;
        delete process.env.OWN_FB_PIXEL_ID;
        delete process.env.OWN_GOOGLE_ADS_CONVERSION_LABEL;
    });

    test('should return 405 for non-GET methods', async () => {
        mockReq.method = 'POST';
        await handler(mockReq, mockRes);
        expect(mockRes.statusCode).toBe(405);
    });

    test('should return null values when env vars are not configured', async () => {
        await handler(mockReq, mockRes);
        expect(mockRes.statusCode).toBe(200);
        expect(mockRes._getJSONData()).toEqual({
            gaId: null,
            pixelId: null,
            adsLabel: null
        });
    });

    test('should return active tracking configurations', async () => {
        process.env.OWN_GA_TRACKING_ID = 'G-12345';
        process.env.OWN_FB_PIXEL_ID = '987654321';
        process.env.OWN_GOOGLE_ADS_CONVERSION_LABEL = 'conv_lbl_abc';

        await handler(mockReq, mockRes);
        expect(mockRes.statusCode).toBe(200);
        expect(mockRes._getJSONData()).toEqual({
            gaId: 'G-12345',
            pixelId: '987654321',
            adsLabel: 'conv_lbl_abc'
        });
    });
});
