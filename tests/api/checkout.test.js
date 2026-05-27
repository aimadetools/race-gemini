// tests/api/checkout.test.js
import { jest } from '@jest/globals'; // Import jest explicitly
import { createRequest, createResponse } from 'node-mocks-http';
import jwt from 'jsonwebtoken';
import fs from 'fs'; // Keep fs import for actual fs operations if needed by the handler, but mock its logging methods
import path from 'path'; // Import path module
import { logError } from '../../lib/logger'; // Import centralized logger for mocking

// Mock external dependencies
jest.mock('jsonwebtoken');
jest.mock('../../lib/logger'); // Mock the logger module

// Define mock functions for stripe outside beforeAll
const mockStripeCheckoutSessionsCreate = jest.fn();

// MODULES UNDER TEST - Import handler dynamically within beforeEach
let handler; // Declare handler here

describe('Checkout API', () => {
    let mockReq;
    let mockRes;

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

        // Handler will be imported in beforeEach to ensure fresh state
    });

    beforeEach(() => {
        jest.clearAllMocks(); // Clears all mocks, including jwt.verify and logError

        // Clear module cache for handler and re-import to ensure fresh state
        // This makes sure the mocked 'stripe' is picked up and handler is fresh
        delete require.cache[require.resolve('../../api/checkout')];
        handler = require('../../api/checkout').default || require('../../api/checkout'); // Assign handler here

        // Reset and get the mocked stripe instance
        mockStripeCheckoutSessionsCreate.mockClear();

        // Mock jwt.verify directly to return a valid userId by default
        jwt.verify.mockReturnValue({ userId: 'testUserId123' });

        // Set up default environment variables
        process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
        process.env.JWT_SECRET = 'test_jwt_secret';

        mockReq = createRequest({ method: 'POST' });
        mockRes = createResponse();

        // Mock the cookie parsing for a valid token
        mockReq.headers = {
            cookie: 'auth=mockValidToken', // Correct cookie name
            host: 'example.com'
        };

        // Default mock for mockStripeCheckoutSessionsCreate
        // Note: The actual handler returns a session object, so mock a session.id for the test assertion
        mockStripeCheckoutSessionsCreate.mockResolvedValue({ id: 'mockSessionId', url: 'https://checkout.stripe.com/mock-session-id' }); 

        // Clear logError mock calls
        logError.mockClear();
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
        expect(logError).not.toHaveBeenCalled(); // No error logging for method not allowed
    });

    // Test for missing creditPackId or agencyPlanId
    test('should return 400 if neither creditPackId nor agencyPlanId is provided', async () => {
        mockReq.body = {};
        await handler(mockReq, mockRes);
        expect(mockRes.statusCode).toBe(400);
        expect(mockRes._getJSONData()).toEqual({ message: 'Missing creditPackId or agencyPlanId in request body.' });
        expect(logError).toHaveBeenCalled(); // Should log the error
    });

    // Test for invalid creditPackId
    test('should return 404 if creditPackId is invalid', async () => {
        mockReq.body = { creditPackId: 'invalid_pack_id' };
        await handler(mockReq, mockRes);
        expect(mockRes.statusCode).toBe(404);
        expect(mockRes._getJSONData()).toEqual({ message: 'Credit pack details not found for the selected ID.' });
        expect(logError).toHaveBeenCalled(); // Should log the error
    });

    // Test for missing authToken
    test('should return 401 if authToken is missing', async () => {
        mockReq.headers.cookie = ''; // No auth token
        mockReq.body = { creditPackId: 'pack_small_business' };
        await handler(mockReq, mockRes);
        expect(mockRes.statusCode).toBe(401);
        expect(mockRes._getJSONData()).toEqual({ message: 'User not authenticated.' });
        expect(jwt.verify).not.toHaveBeenCalled(); // jwt.verify should not be called if token is missing
        expect(logError).toHaveBeenCalled(); // Should log the authentication error
    });

    // Test for invalid authToken
    test('should return 401 if authToken is invalid', async () => {
        jwt.verify.mockImplementationOnce(() => { throw new Error('invalid token'); }); // Simulate invalid token for this test
        mockReq.body = { creditPackId: 'pack_small_business' };
        await handler(mockReq, mockRes);
        expect(mockRes.statusCode).toBe(401);
        expect(mockRes._getJSONData()).toEqual({ message: 'Invalid or expired token.' });
        expect(jwt.verify).toHaveBeenCalledWith('mockValidToken', 'test_jwt_secret');
        expect(logError).toHaveBeenCalled(); // Should log the token verification error
    });

    // Test for successful checkout session creation for predefined pack
    test('should create a Stripe checkout session for predefined pack on success', async () => {
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
                        unit_amount: 9900,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `https://${mockReq.headers.host}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `https://${mockReq.headers.host}/pricing.html`,
            client_reference_id: 'testUserId123',
            metadata: {
                creditPackId: 'pack_pro',
                credits: 200,
                userId: 'testUserId123'
            },
        }));
        expect(mockRes.statusCode).toBe(200); // Expect 200 OK with session ID
        expect(mockRes._getJSONData()).toEqual({ sessionId: 'mockSessionId' }); // Expect sessionId in body
        expect(logError).not.toHaveBeenCalled(); // No error logging for success
    });

    // Test for successful custom credit pack creation (tier 1: <200)
    test('should create a Stripe checkout session for custom credits (tier 1: <200)', async () => {
        mockReq.body = { creditPackId: 'pack_custom', customAmount: 4900, customCredits: 50 }; // 50 credits at progressive pricing = $49.00
        await handler(mockReq, mockRes);

        expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledTimes(1);
        expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledWith(expect.objectContaining({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: { name: 'Custom Credit Pack (50 Credits)' },
                        unit_amount: 4900,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `https://${mockReq.headers.host}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `https://${mockReq.headers.host}/pricing.html`,
            client_reference_id: 'testUserId123',
            metadata: {
                creditPackId: 'pack_custom',
                credits: 50,
                userId: 'testUserId123'
            },
        }));
        expect(mockRes.statusCode).toBe(200); // Expect 200 OK with session ID
        expect(mockRes._getJSONData()).toEqual({ sessionId: 'mockSessionId' });
        expect(logError).not.toHaveBeenCalled(); // No error logging for success
    });

    // Test for successful custom credit pack creation (tier 2: 200-999)
    test('should create a Stripe checkout session for custom credits (tier 2: 200-999)', async () => {
        mockReq.body = { creditPackId: 'pack_custom', customAmount: 9900, customCredits: 200 }; // 200 credits at progressive pricing = $99.00
        await handler(mockReq, mockRes);

        expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledTimes(1);
        expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledWith(expect.objectContaining({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: { name: 'Custom Credit Pack (200 Credits)' },
                        unit_amount: 9900,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `https://${mockReq.headers.host}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `https://${mockReq.headers.host}/pricing.html`,
            client_reference_id: 'testUserId123',
            metadata: {
                creditPackId: 'pack_custom',
                credits: 200,
                userId: 'testUserId123'
            },
        }));
        expect(mockRes.statusCode).toBe(200); // Expect 200 OK with session ID
        expect(mockRes._getJSONData()).toEqual({ sessionId: 'mockSessionId' });
        expect(logError).not.toHaveBeenCalled(); // No error logging for success
    });

    // Test for successful custom credit pack creation (tier 3: >=1000)
    test('should create a Stripe checkout session for custom credits (tier 3: >=1000)', async () => {
        mockReq.body = { creditPackId: 'pack_custom', customAmount: 24900, customCredits: 1000 }; // 1000 credits at progressive pricing = $249.00
        await handler(mockReq, mockRes);

        expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledTimes(1);
        expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledWith(expect.objectContaining({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: { name: 'Custom Credit Pack (1000 Credits)' },
                        unit_amount: 24900,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `https://${mockReq.headers.host}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `https://${mockReq.headers.host}/pricing.html`,
            client_reference_id: 'testUserId123',
            metadata: {
                creditPackId: 'pack_custom',
                credits: 1000,
                userId: 'testUserId123'
            },
        }));
        expect(mockRes.statusCode).toBe(200); // Expect 200 OK with session ID
        expect(mockRes._getJSONData()).toEqual({ sessionId: 'mockSessionId' });
        expect(logError).not.toHaveBeenCalled(); // No error logging for success
    });

    // Test for price tampering detection
    test('should return 400 if customAmount does not match expected progressive price', async () => {
        mockReq.body = { creditPackId: 'pack_custom', customAmount: 100, customCredits: 1000 }; // 1000 credits for $1.00 instead of $249.00
        await handler(mockReq, mockRes);

        expect(mockRes.statusCode).toBe(400);
        expect(mockRes._getJSONData()).toEqual({ message: 'Invalid custom amount or credits for custom pack.' });
        expect(logError).toHaveBeenCalled(); // Should log the price mismatch error
    });

    // Test for missing customAmount
    test('should return 400 if customAmount is missing for custom pack', async () => {
        mockReq.body = { creditPackId: 'pack_custom', customCredits: 50 };
        await handler(mockReq, mockRes);

        expect(mockRes.statusCode).toBe(400);
        expect(mockRes._getJSONData()).toEqual({ message: 'Invalid custom amount or credits for custom pack.' });
        expect(logError).toHaveBeenCalled(); // Should log the error
    });

    // Test for missing customCredits
    test('should return 400 if customCredits is missing for custom pack', async () => {
        mockReq.body = { creditPackId: 'pack_custom', customAmount: 5000 };
        await handler(mockReq, mockRes);

        expect(mockRes.statusCode).toBe(400);
        expect(mockRes._getJSONData()).toEqual({ message: 'Invalid custom amount or credits for custom pack.' });
        expect(logError).toHaveBeenCalled(); // Should log the error
    });

    // Test for invalid customAmount (non-numeric)
    test('should return 400 if customAmount is non-numeric', async () => {
        mockReq.body = { creditPackId: 'pack_custom', customAmount: 'abc', customCredits: 50 };
        await handler(mockReq, mockRes);

        expect(mockRes.statusCode).toBe(400);
        expect(mockRes._getJSONData()).toEqual({ message: 'Invalid custom amount or credits for custom pack.' });
        expect(logError).toHaveBeenCalled(); // Should log the error
    });

    // Test for invalid customCredits (non-numeric)
    test('should return 400 if customCredits is non-numeric', async () => {
        mockReq.body = { creditPackId: 'pack_custom', customAmount: 5000, customCredits: 'xyz' };
        await handler(mockReq, mockRes);

        expect(mockRes.statusCode).toBe(400);
        expect(mockRes._getJSONData()).toEqual({ message: 'Invalid custom amount or credits for custom pack.' });
        expect(logError).toHaveBeenCalled(); // Should log the error
    });

    // Test for invalid customAmount (zero)
    test('should return 400 if customAmount is zero', async () => {
        mockReq.body = { creditPackId: 'pack_custom', customAmount: 0, customCredits: 50 };
        await handler(mockReq, mockRes);

        expect(mockRes.statusCode).toBe(400);
        expect(mockRes._getJSONData()).toEqual({ message: 'Invalid custom amount or credits for custom pack.' });
        expect(logError).toHaveBeenCalled(); // Should log the error
    });

    // Test for invalid customCredits (zero)
    test('should return 400 if customCredits is zero', async () => {
        mockReq.body = { creditPackId: 'pack_custom', customAmount: 5000, customCredits: 0 };
        await handler(mockReq, mockRes);

        expect(mockRes.statusCode).toBe(400);
        expect(mockRes._getJSONData()).toEqual({ message: 'Invalid custom amount or credits for custom pack.' });
        expect(logError).toHaveBeenCalled(); // Should log the error
    });

    // Test for Stripe API error during session creation
    test('should return 500 if Stripe API fails', async () => {
        mockStripeCheckoutSessionsCreate.mockRejectedValue(new Error('Stripe API error'));
        mockReq.body = { creditPackId: 'pack_agency' };
        await handler(mockReq, mockRes);

        expect(mockRes.statusCode).toBe(500);
        expect(mockRes._getJSONData()).toEqual({ message: 'Failed to create Stripe checkout session.' });
        expect(logError).toHaveBeenCalled(); // Should log the error
    });

    // Test for successful agency plan subscription creation
    test('should create a Stripe checkout session for agency plan on success', async () => {
        process.env.STRIPE_PRICE_BASIC_AGENCY_PLAN = 'price_123agencybasic'; // Mock this environment variable
        mockReq.body = { agencyPlanId: 'plan_basic_agency' };
        await handler(mockReq, mockRes);

        expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledTimes(1);
        expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledWith(expect.objectContaining({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: 'price_123agencybasic',
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `https://${mockReq.headers.host}/agency-subscription.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `https://${mockReq.headers.host}/agency-partnerships.html`,
            client_reference_id: 'testUserId123',
            customer_creation: 'always',
            metadata: {
                agencyPlanId: 'plan_basic_agency',
                userId: 'testUserId123',
                agencyId: 'testUserId123'
            },
        }));
        expect(mockRes.statusCode).toBe(200);
        expect(mockRes._getJSONData()).toEqual({ sessionId: 'mockSessionId' });
        expect(logError).not.toHaveBeenCalled();
    });

    // Test for invalid agencyPlanId
    test('should return 404 if agencyPlanId is invalid', async () => {
        mockReq.body = { agencyPlanId: 'invalid_agency_plan' };
        await handler(mockReq, mockRes);

        expect(mockRes.statusCode).toBe(404);
        expect(mockRes._getJSONData()).toEqual({ message: 'Agency plan details not found for the selected ID.' });
        expect(logError).toHaveBeenCalled();
    });

    // Test for missing Stripe Price ID for agency plan
    test('should return 500 if Stripe Price ID is not configured for agency plan', async () => {
        delete process.env.STRIPE_PRICE_BASIC_AGENCY_PLAN; // Unset the mock env var
        mockReq.body = { agencyPlanId: 'plan_basic_agency' };
        await handler(mockReq, mockRes);

        expect(mockRes.statusCode).toBe(500);
        expect(mockRes._getJSONData()).toEqual({ message: 'Stripe Price ID not configured for agency plan plan_basic_agency.' });
        expect(logError).toHaveBeenCalled();
    });
});