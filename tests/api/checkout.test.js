// tests/api/checkout.test.js
import { jest } from '@jest/globals'; // Import jest explicitly
import { createRequest, createResponse } from 'node-mocks-http';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

// Mock external dependencies
jest.mock('jsonwebtoken');

// Define mock functions for stripe outside beforeAll
const mockStripeCheckoutSessionsCreate = jest.fn();

jest.mock('fs', () => ({
    ...jest.requireActual('fs'), // Import and retain default behavior
    existsSync: jest.fn(() => true), // Assume logs directory always exists
    mkdirSync: jest.fn(),
    appendFileSync: jest.fn(),
}));
jest.mock('path', () => ({
    ...jest.requireActual('path'),
    join: jest.fn((...args) => args.join('/')), // Simplify path.join for testing
}));

// MODULES UNDER TEST - Import handler dynamically within beforeEach
let handler; // Declare handler here
let stripePackage; // Declare stripePackage here

describe('Checkout API', () => {
    let mockReq;
    let mockRes;
    let jwtVerifySpy; // Spy on jwt.verify

    beforeAll(() => {
        // Use jest.doMock for stripe *inside* beforeAll to ensure it's applied
        jest.doMock('stripe', () => {
            const mockCheckoutSessions = {
                create: mockStripeCheckoutSessionsCreate,
            };
            const mockStripe = jest.fn(() => ({
                checkout: {
                    sessions: mockCheckoutSessions,
                },
            }));
            mockStripe.checkout = { sessions: mockCheckoutSessions };
            return mockStripe;
        });

        // Now import stripePackage after its mock has been defined globally
        stripePackage = require('stripe');
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Clear module cache for handler and re-import to ensure fresh state
        // This makes sure the mocked 'stripe' is picked up
        delete require.cache[require.resolve('../../api/checkout')];
        handler = require('../../api/checkout'); // Assign handler here

        // Ensure path.join is reset if it's been manipulated
        path.join.mockImplementation(jest.requireActual('path').join);

        // Reset and get the mocked stripe instance
        mockStripeCheckoutSessionsCreate.mockClear();

        // Mock jwt.verify
        jwtVerifySpy = jest.spyOn(jwt, 'verify');

        // Set up default environment variables
        process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
        process.env.JWT_SECRET = 'test_jwt_secret';

        mockReq = createRequest({ method: 'POST' });
        mockRes = createResponse();

        // Mock the cookie parsing as it's not handled by node-mocks-http directly
        // Default to a valid token
        mockReq.headers = {
            cookie: 'authToken=mockValidToken',
            host: 'example.com'
        };

        // Default mock for jwt.verify to return a valid userId
        jwtVerifySpy.mockReturnValue({ userId: 'testUserId123' });

        // Default mock for mockStripeCheckoutSessionsCreate
        mockStripeCheckoutSessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/mock-session-id' });

        // Ensure fs mocks are reset
        fs.existsSync.mockReturnValue(true);
        fs.mkdirSync.mockClear();
        fs.appendFileSync.mockClear();
    });

    afterEach(() => {
        delete process.env.STRIPE_SECRET_KEY;
        delete process.env.JWT_SECRET;
    });

    // Test for non-POST methods
    test('should return 405 for non-POST methods', async () => {
        mockReq.method = 'GET';
        await handler(mockReq, mockRes);
        expect(mockRes.statusCode).toBe(405);
    });

    // Test for missing creditPackId
    test('should return 400 if creditPackId is missing', async () => {
        mockReq.body = {};
        await handler(mockReq, mockRes);
        expect(mockRes.statusCode).toBe(400);
        expect(mockRes._getJSONData()).toEqual({ message: 'Missing creditPackId in request body.' });
        expect(fs.appendFileSync).toHaveBeenCalled(); // Should log the error
    });

    // Test for invalid creditPackId
    test('should return 404 if creditPackId is invalid', async () => {
        mockReq.body = { creditPackId: 'invalid_pack_id' };
        await handler(mockReq, mockRes);
        expect(mockRes.statusCode).toBe(404);
        expect(mockRes._getJSONData()).toEqual({ message: 'Credit pack details not found for the selected ID.' });
        expect(fs.appendFileSync).toHaveBeenCalled(); // Should log the error
    });

    // Test for missing authToken
    test('should return 401 if authToken is missing', async () => {
        mockReq.headers.cookie = ''; // No auth token
        mockReq.body = { creditPackId: 'pack_small_business' };
        await handler(mockReq, mockRes);
        expect(mockRes.statusCode).toBe(401);
        expect(mockRes._getJSONData()).toEqual({ message: 'Not authenticated' });
        expect(jwtVerifySpy).not.toHaveBeenCalled(); // jwt.verify should not be called if token is missing
    });

    // Test for invalid authToken
    test('should return 401 if authToken is invalid', async () => {
        jwtVerifySpy.mockImplementation(() => { throw new Error('invalid token'); }); // Simulate invalid token
        mockReq.body = { creditPackId: 'pack_small_business' };
        await handler(mockReq, mockRes);
        expect(mockRes.statusCode).toBe(401);
        expect(mockRes._getJSONData()).toEqual({ message: 'Invalid token' });
        expect(jwtVerifySpy).toHaveBeenCalledWith('mockValidToken', 'test_jwt_secret');
        expect(fs.appendFileSync).toHaveBeenCalled(); // Should log the error
    });

    // Test for successful checkout session creation
    test('should create a Stripe checkout session and redirect on success', async () => {
        mockReq.body = { creditPackId: 'pack_pro' };
        await handler(mockReq, mockRes);

        expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledTimes(1);
        expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledWith(expect.objectContaining({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: { name: 'Pro Pack (200 Credits)' },
                        unit_amount: 18000,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: 'https://example.com/success.html?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'https://example.com/pricing.html',
            client_reference_id: 'testUserId123',
            metadata: {
                creditPackId: 'pack_pro',
                credits: 200,
                userId: 'testUserId123'
            },
        }));
        expect(mockRes.statusCode).toBe(303); // Redirect status code
        expect(mockRes._getHeaders().location).toBe('https://checkout.stripe.com/mock-session-id');
        expect(mockRes._isEndCalled()).toBe(true);
    });

    // Test for Stripe API error during session creation
    test('should return 500 if Stripe API fails', async () => {
        mockStripeCheckoutSessionsCreate.mockRejectedValue(new Error('Stripe API error'));
        mockReq.body = { creditPackId: 'pack_agency' };
        await handler(mockReq, mockRes);

        expect(mockRes.statusCode).toBe(500);
        expect(mockRes._getJSONData()).toEqual({ message: 'Error creating checkout session.', error: 'Stripe API error' });
        expect(fs.appendFileSync).toHaveBeenCalled(); // Should log the error
    });
});
