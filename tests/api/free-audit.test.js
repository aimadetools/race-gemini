// tests/api/free-audit.test.js
import { jest } from '@jest/globals';

// Mock dependencies using unstable_mockModule before importing handler
jest.unstable_mockModule('child_process', () => ({
    exec: jest.fn((cmd, opts, callback) => {
        const mockOutput = JSON.stringify({
            results: {
                locations_found: ['Austin'],
                locations_not_found: ['Round Rock', 'Pflugerville']
            }
        });
        callback(null, mockOutput, '');
    })
}));

jest.unstable_mockModule('../../lib/logger.js', () => ({
    logError: jest.fn(),
    logInfo: jest.fn()
}));

jest.unstable_mockModule('../../lib/html-parser.js', () => ({
    parseAddress: jest.fn(() => '123 Main St, Austin, TX 78701')
}));

global.fetch = jest.fn();

// Dynamically import dependencies and handler after mocking
const { exec } = await import('child_process');
const { parseAddress } = await import('../../lib/html-parser.js');
const handler = (await import('../../api/free-audit.js')).default;

const MOCK_CWD = '/home/user/app';

describe('free-audit API', () => {
    let originalCwd;
    let mockFetch;

    beforeAll(() => {
        originalCwd = process.cwd;
        process.cwd = jest.fn(() => MOCK_CWD);
        mockFetch = global.fetch;
    });

    afterAll(() => {
        process.cwd = originalCwd;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.OPENCAGE_API_KEY = 'test_opencage_key';
    });

    it('should set CORS headers on all requests', async () => {
        const req = { method: 'OPTIONS' };
        const res = {
            status: jest.fn().mockReturnThis(),
            setHeader: jest.fn(),
            end: jest.fn()
        };
        await handler(req, res);
        expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
        expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, OPTIONS');
        expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.end).toHaveBeenCalled();
    });

    it('should return 400 if URL is missing', async () => {
        const req = { method: 'GET', query: {} };
        const res = {
            status: jest.fn().mockReturnThis(),
            setHeader: jest.fn(),
            json: jest.fn()
        };
        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'URL is required.' });
    });

    it('should return 400 if URL format is invalid', async () => {
        const req = { method: 'GET', query: { url: 'not-a-url' } };
        const res = {
            status: jest.fn().mockReturnThis(),
            setHeader: jest.fn(),
            json: jest.fn()
        };
        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid URL format.' });
    });

    it('should return 503 if OPENCAGE_API_KEY is not set', async () => {
        delete process.env.OPENCAGE_API_KEY;
        const req = { method: 'GET', query: { url: 'https://example.com' } };
        const res = {
            status: jest.fn().mockReturnThis(),
            setHeader: jest.fn(),
            json: jest.fn()
        };
        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith({ message: 'Geocoding service is unavailable: OPENCAGE_API_KEY is not configured.' });
    });

    it('should return 200 with audit results when all API calls succeed', async () => {
        const req = { method: 'GET', query: { url: 'https://example.com' } };
        const res = {
            status: jest.fn().mockReturnThis(),
            setHeader: jest.fn(),
            json: jest.fn()
        };

        // 1. Mock website HTML content fetch
        mockFetch.mockResolvedValueOnce({
            text: async () => '<html><body>Our office is located at <address>123 Main St, Austin, TX 78701</address></body></html>'
        });

        // 2. Mock OpenCage geocoding fetch
        mockFetch.mockResolvedValueOnce({
            json: async () => ({
                results: [{
                    geometry: { lat: 30.2672, lng: -97.7431 },
                    components: { city: 'Austin' }
                }]
            })
        });

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            address: '123 Main St, Austin, TX 78701',
            lat: 30.2672,
            lng: -97.7431,
            foundPages: ['plumbers-in-austin'],
            missedOpportunities: ['plumbers-in-round-rock', 'plumbers-in-pflugerville']
        });
    });

    it('should handle address parsing failures gracefully', async () => {
        parseAddress.mockReturnValueOnce(null);
        const req = { method: 'GET', query: { url: 'https://example.com' } };
        const res = {
            status: jest.fn().mockReturnThis(),
            setHeader: jest.fn(),
            json: jest.fn()
        };

        // Mock website HTML with no address
        mockFetch.mockResolvedValueOnce({
            text: async () => '<html><body>Welcome to our website!</body></html>'
        });

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Could not find an address on the page.' });
    });
});
