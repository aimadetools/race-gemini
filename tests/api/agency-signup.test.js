// tests/api/agency-signup.test.js
import { jest } from '@jest/globals';

// Mock KV store for in-memory testing
const mockKvStore = new Map();

const mockKv = {
    async get(key) {
        return mockKvStore.get(key);
    },
    async set(key, value, options) {
        mockKvStore.set(key, value);
        return value;
    },
    async del(key) {
        mockKvStore.delete(key);
    },
};

// Mock the nanoid module to generate predictable IDs
jest.mock('nanoid', () => {
    const { jest } = require('@jest/globals');
    let idCounter = 0;
    const mockNanoid = jest.fn(() => `mock-id-${++idCounter}`);
    mockNanoid.__reset = () => idCounter = 0;
    return {
        customAlphabet: jest.fn(() => mockNanoid),
    };
});
import { customAlphabet } from 'nanoid';

// Import the handler
import agencySignupHandler from '../../api/agency-signup';


// Helper to create mock response object
const createMockRes = () => {
    const res = {
        _status: 200,
        _json: {},
        status: jest.fn(function(code) {
            this._status = code;
            return this;
        }),
        json: jest.fn(function(data) {
            this._json = data;
            return this;
        }),
    };
    return res;
};

// Helper to create mock request object
const createMockReq = (body, method = 'POST', headers = {}) => ({
    method,
    body,
    headers: {
        get: (header) => headers[header.toLowerCase()],
        ...headers,
    }
});

describe('agency-signup API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        customAlphabet().__reset();
        mockKvStore.clear();
    });

    // Test cases will go here

    it('should successfully submit an agency inquiry with all fields', async () => {
        const reqBody = {
            agencyName: 'Test Agency',
            website: 'https://testagency.com',
            contactPerson: 'John Doe',
            contactEmail: 'john.doe@testagency.com',
            phoneNumber: '123-456-7890',
            clientVolume: '50-100',
            message: 'Looking for a partnership opportunity.'
        };
        const req = createMockReq(reqBody);
        const res = createMockRes();

        await agencySignupHandler(req, res, mockKv);

        expect(res._status).toBe(200);
        expect(res._json.message).toBe('Inquiry submitted successfully. We will get back to you shortly.');
        expect(res._json.inquiryId).toBe('mock-id-1');

        const storedData = JSON.parse(mockKvStore.get('agency-inquiry:mock-id-1'));
        expect(storedData).toMatchObject({
            id: 'mock-id-1',
            agencyName: 'Test Agency',
            website: 'https://testagency.com',
            contactPerson: 'John Doe',
            contactEmail: 'john.doe@testagency.com',
            phoneNumber: '123-456-7890',
            clientVolume: '50-100',
            message: 'Looking for a partnership opportunity.'
        });
        expect(storedData.timestamp).toBeDefined();
    });

    it('should successfully submit an agency inquiry with only required fields', async () => {
        const reqBody = {
            agencyName: 'Another Agency',
            website: 'https://anotheragency.com',
            contactPerson: 'Jane Smith',
            contactEmail: 'jane.smith@anotheragency.com',
        };
        const req = createMockReq(reqBody);
        const res = createMockRes();

        await agencySignupHandler(req, res, mockKv);

        expect(res._status).toBe(200);
        expect(res._json.message).toBe('Inquiry submitted successfully. We will get back to you shortly.');
        expect(res._json.inquiryId).toBe('mock-id-1');

        const storedData = JSON.parse(mockKvStore.get('agency-inquiry:mock-id-1'));
        expect(storedData).toMatchObject({
            id: 'mock-id-1',
            agencyName: 'Another Agency',
            website: 'https://anotheragency.com',
            contactPerson: 'Jane Smith',
            contactEmail: 'jane.smith@anotheragency.com',
            phoneNumber: null,
            clientVolume: null,
            message: null,
        });
    });

    it('should return 400 if agencyName is missing', async () => {
        const reqBody = {
            website: 'https://testagency.com',
            contactPerson: 'John Doe',
            contactEmail: 'john.doe@testagency.com',
        };
        const req = createMockReq(reqBody);
        const res = createMockRes();

        await agencySignupHandler(req, res, mockKv);

        expect(res._status).toBe(400);
        expect(res._json.message).toBe('Agency Name, Website, Contact Person, and Contact Email are required.');
    });

    it('should return 400 if website is missing', async () => {
        const reqBody = {
            agencyName: 'Test Agency',
            contactPerson: 'John Doe',
            contactEmail: 'john.doe@testagency.com',
        };
        const req = createMockReq(reqBody);
        const res = createMockRes();

        await agencySignupHandler(req, res, mockKv);

        expect(res._status).toBe(400);
        expect(res._json.message).toBe('Agency Name, Website, Contact Person, and Contact Email are required.');
    });

    it('should return 400 if contactPerson is missing', async () => {
        const reqBody = {
            agencyName: 'Test Agency',
            website: 'https://testagency.com',
            contactEmail: 'john.doe@testagency.com',
        };
        const req = createMockReq(reqBody);
        const res = createMockRes();

        await agencySignupHandler(req, res, mockKv);

        expect(res._status).toBe(400);
        expect(res._json.message).toBe('Agency Name, Website, Contact Person, and Contact Email are required.');
    });

    it('should return 400 if contactEmail is missing', async () => {
        const reqBody = {
            agencyName: 'Test Agency',
            website: 'https://testagency.com',
            contactPerson: 'John Doe',
        };
        const req = createMockReq(reqBody);
        const res = createMockRes();

        await agencySignupHandler(req, res, mockKv);

        expect(res._status).toBe(400);
        expect(res._json.message).toBe('Agency Name, Website, Contact Person, and Contact Email are required.');
    });

    it('should return 400 for invalid contact email format', async () => {
        const reqBody = {
            agencyName: 'Test Agency',
            website: 'https://testagency.com',
            contactPerson: 'John Doe',
            contactEmail: 'invalid-email',
        };
        const req = createMockReq(reqBody);
        const res = createMockRes();

        await agencySignupHandler(req, res, mockKv);

        expect(res._status).toBe(400);
        expect(res._json.message).toBe('Please enter a valid contact email address.');
    });

    it('should return 400 for invalid website URL format', async () => {
        const reqBody = {
            agencyName: 'Test Agency',
            website: 'invalid-url',
            contactPerson: 'John Doe',
            contactEmail: 'john.doe@testagency.com',
        };
        const req = createMockReq(reqBody);
        const res = createMockRes();

        await agencySignupHandler(req, res, mockKv);

        expect(res._status).toBe(400);
        expect(res._json.message).toBe('Please enter a valid website URL.');
    });

    it('should return 405 for non-POST methods', async () => {
        const req = createMockReq({}, 'GET');
        const res = createMockRes();

        await agencySignupHandler(req, res, mockKv);

        expect(res._status).toBe(405);
        expect(res._json.message).toBe('Method Not Allowed');
    });

    it('should handle internal server errors gracefully', async () => {
        const error = new Error('KV is down!');
        const faultyKv = {
            ...mockKv,
            set: jest.fn().mockRejectedValue(error),
        };
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const reqBody = {
            agencyName: 'Test Agency',
            website: 'https://testagency.com',
            contactPerson: 'John Doe',
            contactEmail: 'john.doe@testagency.com',
        };
        const req = createMockReq(reqBody);
        const res = createMockRes();

        await agencySignupHandler(req, res, faultyKv);

        expect(res._status).toBe(500);
        expect(res._json.message).toBe('Failed to submit inquiry due to a server error. Please try again later.');
        expect(consoleSpy).toHaveBeenCalledWith('Failed to store agency inquiry in Vercel KV:', error);

        consoleSpy.mockRestore();
    });

});
