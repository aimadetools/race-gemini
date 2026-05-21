// tests/api/webhook.test.js
import { createRequest, createResponse } from 'node-mocks-http';
import { mockQuery as originalMockQuery, clearMockUsers, addMockUser, getMockUsers } from '../../db/mockDb';
import stripePackage from 'stripe';
import { buffer } from 'micro';
import { kv } from '@vercel/kv';
import fs from 'fs';
import path from 'path';

// Mock ../db/index.js to use our mockQuery while preserving other exports
jest.mock('../../db/index.js', () => {
    const mockDb = jest.requireActual('../../db/mockDb.js');
    return {
        ...mockDb,
        query: jest.fn(mockDb.mockQuery),
    };
});

import { query as mockQuery } from '../../db/index.js';

// Mock micro's buffer
jest.mock('micro', () => ({
    buffer: jest.fn(),
}));

// Mock @vercel/kv
jest.mock('@vercel/kv', () => ({
    kv: {
        get: jest.fn(),
        set: jest.fn(),
    },
}));

// Mock stripe
const mockStripeWebhooksConstructEvent = jest.fn();
const mockStripeSubscriptionsRetrieve = jest.fn();
jest.doMock('stripe', () => {
    const mockWebhooks = {
        constructEvent: mockStripeWebhooksConstructEvent,
    };
    const mockSubscriptions = {
        retrieve: mockStripeSubscriptionsRetrieve,
    };
    const mockStripe = jest.fn(() => ({
        webhooks: mockWebhooks,
        subscriptions: mockSubscriptions,
    }));
    mockStripe.webhooks = mockWebhooks;
    mockStripe.subscriptions = mockSubscriptions;
    return mockStripe;
});

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
    appendFileSync: jest.fn(),
}));
jest.mock('path', () => ({
    ...jest.requireActual('path'),
    join: jest.fn((...args) => args.join('/')),
}));



// Import the handler and the mocked stripe AFTER all doMocks
let handler; // Declared here, will be assigned in beforeEach
let stripe; // Declared here, will be assigned in beforeEach

describe('Webhook API', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        // Import handler and stripe after doMocks are set up
        handler = require('../../api/webhook.js').default || require('../../api/webhook.js');
        stripe = require('stripe');

        jest.clearAllMocks();
        clearMockUsers(); // Clear mock users for each test
        mockQuery.mockClear();

        // Reset buffer mock
        buffer.mockResolvedValue(Buffer.from('{}'));

        // Reset KV mocks
        kv.get.mockClear();
        kv.set.mockClear();

        // Reset Stripe mocks
        mockStripeWebhooksConstructEvent.mockClear();
        mockStripeSubscriptionsRetrieve.mockClear();

        // Reset Email mock
        // require('../../lib/email').sendEmail.mockClear(); // Removed as per global mock in jest.config.js


        // Ensure path.join is reset
        path.join.mockImplementation(jest.requireActual('path').join);

        // Set up default environment variables
        process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock';

        mockReq = createRequest({ method: 'POST' });
        mockRes = createResponse();

        mockReq.headers = {
            'stripe-signature': 'mock_signature',
        };

        // Default successful webhook construction
        mockStripeWebhooksConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: {
                object: {
                    client_reference_id: 'user123',
                    metadata: { credits: '50' },
                },
            },
        });

        // Default mock for query (for credit updates)
        // Use the originalMockQuery as default implementation
        mockQuery.mockImplementation(originalMockQuery);

        // Ensure fs mocks are reset
        fs.existsSync.mockReturnValue(true);
        fs.mkdirSync.mockClear();
        fs.appendFileSync.mockClear();
    });

    afterEach(() => {
        delete process.env.STRIPE_SECRET_KEY;
        delete process.env.STRIPE_WEBHOOK_SECRET;
    });

    // Test for non-POST methods
    test('should return 405 for non-POST methods', async () => {
        mockReq.method = 'GET';
        await handler(mockReq, mockRes);
        expect(mockRes.statusCode).toBe(405);
    });

    // Test for Stripe signature verification failure
    test('should return 400 if Stripe signature verification fails', async () => {
        mockStripeWebhooksConstructEvent.mockImplementation(() => { throw new Error('Invalid signature'); });
        await handler(mockReq, mockRes);
        expect(mockRes.statusCode).toBe(400);
        expect(mockRes._getJSONData()).toEqual({ message: 'Webhook Error: Signature verification failed.' });
        expect(fs.appendFileSync).toHaveBeenCalled(); // Should log the error
    });

    // Test for successful checkout.session.completed event
    test('should update user credits for checkout.session.completed', async () => {
        // Add a mock user to the mockDb for the update query

        // Clear mock users before adding our own
        clearMockUsers();
        // Add a mock user
        addMockUser({ id: 'user123', email: 'test@example.com', hashed_password: 'hashed', credits: 100 });

        mockStripeWebhooksConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: {
                object: {
                    client_reference_id: 'user123',
                    metadata: { credits: '50' },
                },
            },
        });

        await handler(mockReq, mockRes);

        expect(mockRes.statusCode).toBe(200);
        expect(mockRes._getData()).toEqual({ received: true });
        expect(mockQuery).toHaveBeenCalledWith(
            'UPDATE users SET credits = credits + $1 WHERE id = $2 RETURNING credits',
            [50, 'user123']
        );
        expect(getMockUsers()[0].credits).toBe(150); // Verify credits were updated in mockDb
    });

    // Test for checkout.session.completed with missing userId
    test('should return 400 for checkout.session.completed with missing userId', async () => {
        mockStripeWebhooksConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: {
                object: {
                    client_reference_id: undefined, // Missing userId
                    metadata: { credits: '50' },
                },
            },
        });
        await handler(mockReq, mockRes);
        expect(mockRes.statusCode).toBe(400);
        expect(mockRes._getJSONData()).toEqual({ message: 'Missing user identifier or credits in session.' });
        expect(fs.appendFileSync).toHaveBeenCalled();
    });

    // Test for checkout.session.completed with invalid credits
    test('should return 400 for checkout.session.completed with invalid credits', async () => {
        mockStripeWebhooksConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: {
                object: {
                    client_reference_id: 'user123',
                    metadata: { credits: 'abc' }, // Invalid credits
                },
            },
        });
        await handler(mockReq, mockRes);
        expect(mockRes.statusCode).toBe(400);
        expect(mockRes._getJSONData()).toEqual({ message: 'Invalid credits value received.' });
        expect(fs.appendFileSync).toHaveBeenCalled();
    });

    // Test for checkout.session.completed where user not found in DB
    test('should return 404 for checkout.session.completed if user not found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] }); // Simulate user not found in DB
        mockStripeWebhooksConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: {
                object: {
                    client_reference_id: 'nonExistentUser',
                    metadata: { credits: '50' },
                },
            },
        });
        await handler(mockReq, mockRes);
        expect(mockRes.statusCode).toBe(404);
        expect(mockRes._getJSONData()).toEqual({ message: 'User not found in database.' });
        expect(fs.appendFileSync).toHaveBeenCalled();
    });
    
    // Test for invoice.payment_succeeded event - Basic Agency Plan
    test('should add credits for invoice.payment_succeeded (BASIC_AGENCY_PLAN)', async () => {
        mockStripeWebhooksConstructEvent.mockReturnValue({
            type: 'invoice.payment_succeeded',
            data: {
                object: {
                    subscription: 'sub_basic',
                    lines: {
                        data: [{ price: { id: 'price_BASIC_AGENCY_PLAN' } }]
                    },
                    metadata: {},
                },
            },
        });
        mockStripeSubscriptionsRetrieve.mockResolvedValue({
            items: { data: [{ price: { id: 'price_BASIC_AGENCY_PLAN' } }] },
            metadata: { agencyId: 'agency123' },
        });
        kv.get.mockResolvedValueOnce({ id: 'agency123', credits: 0, subscriptionStatus: 'inactive' });
        kv.set.mockResolvedValueOnce(undefined); // Mock successful set

        await handler(mockReq, mockRes);

        expect(mockRes.statusCode).toBe(200);
        expect(kv.get).toHaveBeenCalledWith('agency:agency123');
        expect(kv.set).toHaveBeenCalledWith('agency:agency123', { id: 'agency123', credits: 100, subscriptionStatus: 'active' });
    });

    // Test for invoice.payment_succeeded event - Pro Agency Plan
    test('should add credits for invoice.payment_succeeded (PRO_AGENCY_PLAN)', async () => {
        mockStripeWebhooksConstructEvent.mockReturnValue({
            type: 'invoice.payment_succeeded',
            data: {
                object: {
                    subscription: 'sub_pro',
                    lines: {
                        data: [{ price: { id: 'price_PRO_AGENCY_PLAN' } }]
                    },
                    metadata: {},
                },
            },
        });
        mockStripeSubscriptionsRetrieve.mockResolvedValue({
            items: { data: [{ price: { id: 'price_PRO_AGENCY_PLAN' } }] },
            metadata: { agencyId: 'agency123' },
        });
        kv.get.mockResolvedValueOnce({ id: 'agency123', credits: 50, subscriptionStatus: 'active' });
        kv.set.mockResolvedValueOnce(undefined);

        await handler(mockReq, mockRes);

        expect(mockRes.statusCode).toBe(200);
        expect(kv.get).toHaveBeenCalledWith('agency:agency123');
        expect(kv.set).toHaveBeenCalledWith('agency:agency123', { id: 'agency123', credits: 300, subscriptionStatus: 'active' });
    });

    // Test for customer.subscription.deleted event
    test('should update subscription status for customer.subscription.deleted', async () => {
        mockStripeWebhooksConstructEvent.mockReturnValue({
            type: 'customer.subscription.deleted',
            data: {
                object: {
                    metadata: { agencyId: 'agency123' },
                },
            },
        });
        kv.get.mockResolvedValueOnce({ id: 'agency123', credits: 200, subscriptionStatus: 'active' });
        kv.set.mockResolvedValueOnce(undefined);

        await handler(mockReq, mockRes);

        expect(mockRes.statusCode).toBe(200);
        expect(kv.get).toHaveBeenCalledWith('agency:agency123');
        expect(kv.set).toHaveBeenCalledWith('agency:agency123', { id: 'agency123', credits: 200, subscriptionStatus: 'canceled' });
    });
});
