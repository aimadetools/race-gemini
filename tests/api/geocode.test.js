const { createRequest, createResponse } = require('node-mocks-http');

// Save original fetch
const originalFetch = global.fetch;

describe('GET & POST /api/geocode', () => {
    let handler;

    beforeEach(() => {
        jest.clearAllMocks();
        delete require.cache[require.resolve('../../api/geocode')];
        handler = require('../../api/geocode').default || require('../../api/geocode');
        
        process.env.OPENCAGE_API_KEY = 'your_opencage_api_key';
        process.env.GEOAPIFY_API_KEY = '';
        global.fetch = originalFetch;
    });

    afterAll(() => {
        global.fetch = originalFetch;
    });

    test('should return 405 for unsupported HTTP methods', async () => {
        const req = createRequest({ method: 'DELETE' });
        const res = createResponse();

        await handler(req, res);

        expect(res.statusCode).toBe(405);
        expect(JSON.parse(res._getData())).toEqual({ message: 'Method Not Allowed' });
    });

    test('should return 400 if address is missing in GET request', async () => {
        const req = createRequest({ method: 'GET', query: {} });
        const res = createResponse();

        await handler(req, res);

        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res._getData())).toEqual({ message: 'Address is required.' });
    });

    test('should return 400 if address is missing in POST request', async () => {
        const req = createRequest({ method: 'POST', body: {} });
        const res = createResponse();

        await handler(req, res);

        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res._getData())).toEqual({ message: 'Address is required.' });
    });

    test('should successfully geocode via OpenCage and return 200', async () => {
        process.env.OPENCAGE_API_KEY = 'opencage-test-key';
        
        const mockGeocodingResponse = {
            results: [{
                geometry: { lat: 30.2711, lng: -97.7341 }
            }]
        };

        global.fetch = jest.fn().mockImplementation(() => 
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockGeocodingResponse)
            })
        );

        const req = createRequest({ method: 'GET', query: { address: 'Austin, TX' } });
        const res = createResponse();

        await handler(req, res);

        expect(res.statusCode).toBe(200);
        const data = JSON.parse(res._getData());
        expect(data).toEqual({
            success: true,
            lat: 30.2711,
            lng: -97.7341
        });
    });

    test('should successfully geocode via Geoapify when OpenCage is missing and return 200', async () => {
        process.env.OPENCAGE_API_KEY = '';
        process.env.GEOAPIFY_API_KEY = 'geoapify-test-key';

        const mockGeoapifyResponse = {
            features: [{
                geometry: {
                    coordinates: [-97.7341, 30.2711]
                }
            }]
        };

        global.fetch = jest.fn().mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockGeoapifyResponse)
            })
        );

        const req = createRequest({ 
            method: 'POST', 
            body: { address: 'Austin, TX' } 
        });
        const res = createResponse();

        await handler(req, res);

        expect(res.statusCode).toBe(200);
        const data = JSON.parse(res._getData());
        expect(data).toEqual({
            success: true,
            lat: 30.2711,
            lng: -97.7341
        });
    });

    test('should return 404 if geocoding returns no results', async () => {
        process.env.OPENCAGE_API_KEY = 'opencage-test-key';

        const mockEmptyResponse = {
            results: []
        };

        global.fetch = jest.fn().mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockEmptyResponse)
            })
        );

        const req = createRequest({ method: 'GET', query: { address: 'Invalid Address' } });
        const res = createResponse();

        await handler(req, res);

        expect(res.statusCode).toBe(404);
        const data = JSON.parse(res._getData());
        expect(data.success).toBe(false);
        expect(data.message).toContain('Could not resolve address location');
    });
});
