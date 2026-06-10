const { createRequest, createResponse } = require('node-mocks-http');

// Save original fetch
const originalFetch = global.fetch;

describe('GET /api/suggest-towns', () => {
    let handler;

    beforeEach(() => {
        jest.clearAllMocks();
        delete require.cache[require.resolve('../../api/suggest-towns')];
        handler = require('../../api/suggest-towns').default || require('../../api/suggest-towns');
        
        // Reset process.env.OPENCAGE_API_KEY
        process.env.OPENCAGE_API_KEY = 'your_opencage_api_key';
        global.fetch = originalFetch;
    });

    afterAll(() => {
        global.fetch = originalFetch;
    });

    test('should return 405 for non-GET requests', async () => {
        const req = createRequest({ method: 'POST' });
        const res = createResponse();

        await handler(req, res);

        expect(res.statusCode).toBe(405);
        expect(JSON.parse(res._getData())).toEqual({ message: 'Method not allowed' });
    });

    test('should return 400 if city parameter is missing', async () => {
        const req = createRequest({ method: 'GET', query: {} });
        const res = createResponse();

        await handler(req, res);

        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res._getData())).toEqual({ message: 'City parameter is required.' });
    });

    test('should return fallback list when OPENCAGE_API_KEY is not set', async () => {
        const req = createRequest({ method: 'GET', query: { city: 'Austin' } });
        const res = createResponse();

        await handler(req, res);

        expect(res.statusCode).toBe(200);
        const data = JSON.parse(res._getData());
        expect(data.towns).toContain('Round Rock');
        expect(data.towns).toContain('Pflugerville');
    });

    test('should geocode and query Overpass API successfully when OPENCAGE_API_KEY is configured', async () => {
        process.env.OPENCAGE_API_KEY = 'real-key-123';
        
        const mockGeocodingResponse = {
            results: [{
                geometry: { lat: 30.2672, lng: -97.7431 }
            }]
        };

        const mockOverpassResponse = {
            elements: [
                { tags: { name: 'Sunset Valley' } },
                { tags: { name: 'Round Rock' } },
                { tags: { name: 'Austin' } } // Should be filtered out as it matches base city
            ]
        };

        global.fetch = jest.fn()
            .mockImplementationOnce(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockGeocodingResponse)
            }))
            .mockImplementationOnce(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockOverpassResponse)
            }));

        const req = createRequest({ method: 'GET', query: { city: 'Austin' } });
        const res = createResponse();

        await handler(req, res);

        expect(res.statusCode).toBe(200);
        const data = JSON.parse(res._getData());
        expect(data.towns).toContain('Round Rock');
        expect(data.towns).toContain('Sunset Valley');
        expect(data.towns).not.toContain('Austin'); // Base city excluded
    });

    test('should use reverse geocoding fallback if Overpass API fails', async () => {
        process.env.OPENCAGE_API_KEY = 'real-key-123';
        
        const mockGeocodingResponse = {
            results: [{
                geometry: { lat: 30.2672, lng: -97.7431 }
            }]
        };

        const mockReverseGeocodingResponse = {
            results: [{
                components: { city: 'Pflugerville' }
            }]
        };

        global.fetch = jest.fn()
            .mockImplementationOnce(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockGeocodingResponse)
            }))
            .mockImplementationOnce(() => Promise.reject(new Error('Overpass down'))) // Overpass fails
            .mockImplementation(() => Promise.resolve({ // Reverse geocoding calls
                ok: true,
                json: () => Promise.resolve(mockReverseGeocodingResponse)
            }));

        const req = createRequest({ method: 'GET', query: { city: 'Austin' } });
        const res = createResponse();

        await handler(req, res);

        expect(res.statusCode).toBe(200);
        const data = JSON.parse(res._getData());
        expect(data.towns).toContain('Pflugerville');
    });
});
