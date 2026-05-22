// tests/api/webhook.test.js
import { createRequest, createResponse } from 'node-mocks-http';
import { mockQuery as originalMockQuery, clearMockUsers, addMockUser, getMockUsers, setQueryDelegate } from '../../db/mockDb';
import { logError, logInfo } from '../../lib/logger.js';
import { sendEmail } from '../../lib/email.js';
import stripePackage from 'stripe';
import { buffer } from 'micro';
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

// Mock email service to prevent actual SendGrid API calls and enable verification
jest.mock('../../lib/email.js', () => ({
    sendEmail: jest.fn().mockResolvedValue(true),
}));

import { query as mockQuery } from '../../db/index.js';

// Mock micro's buffer
jest.mock('micro', () => ({
    buffer: jest.fn(),
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
        
        // Ensure mockQuery uses the mockDb query implementation which routes to queryDelegate
        const mockDb = jest.requireActual('../../db/mockDb.js');
        mockQuery.mockImplementation(mockDb.mockQuery);
        mockQuery.mockClear();

        // Reset buffer mock
        buffer.mockResolvedValue(Buffer.from('{}'));

        // Reset Stripe mocks
        mockStripeWebhooksConstructEvent.mockClear();
        mockStripeSubscriptionsRetrieve.mockClear();

        // Reset SendGrid mock
        sendEmail.mockClear();

        // Set up default environment variables
        process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock';
        process.env.STRIPE_PRICE_BASIC_AGENCY_PLAN = 'price_BASIC_AGENCY_PLAN';
        process.env.STRIPE_PRICE_PRO_AGENCY_PLAN = 'price_PRO_AGENCY_PLAN';

        mockReq = createRequest({ method: 'POST' });
        mockRes = createResponse();

        mockReq.headers = {
            'stripe-signature': 'mock_signature',
        };

        // Default successful webhook construction for payment
        mockStripeWebhooksConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: {
                object: {
                    mode: 'payment',
                    amount_total: 1000,
                    metadata: {
                        userId: 'user123',
                        credits: '50'
                    },
                },
            },
        });

        // Set up clean queryDelegate
        setQueryDelegate((text, params) => {
            const textLower = text.toLowerCase();
            if (textLower.includes('select email from users')) {
                const id = params[0]?.toString();
                const user = getMockUsers().find(u => u.id.toString() === id);
                if (user) {
                    return { rows: [{ email: user.email }] };
                }
                return { rows: [] };
            }
            if (textLower.includes('update users')) {
                if (textLower.includes('stripe_subscription_id = $3')) {
                    // Subscription checkout completed
                    const [creditsToAdd, status, subId, userId] = params;
                    const user = getMockUsers().find(u => u.id.toString() === userId.toString());
                    if (user) {
                        user.credits = (user.credits || 0) + creditsToAdd;
                        user.subscription_status = status;
                        user.stripe_subscription_id = subId;
                        return { rows: [{ credits: user.credits }] };
                    }
                } else if (textLower.includes('subscription_status = $2')) {
                    // Invoice payment succeeded
                    const [creditsToAdd, status, userId] = params;
                    const user = getMockUsers().find(u => u.id.toString() === userId.toString());
                    if (user) {
                        user.credits = (user.credits || 0) + creditsToAdd;
                        user.subscription_status = status;
                        return { rows: [{ credits: user.credits }] };
                    }
                } else if (textLower.includes('subscription_status = $1')) {
                    // Customer subscription deleted
                    const [status, userId] = params;
                    const user = getMockUsers().find(u => u.id.toString() === userId.toString());
                    if (user) {
                        user.subscription_status = status;
                        return { rows: [{ id: user.id }] };
                    }
                } else if (textLower.includes('credits = credits + $1')) {
                    // One-time payment
                    const [creditsToAdd, userId] = params;
                    const user = getMockUsers().find(u => u.id.toString() === userId.toString());
                    if (user) {
                        user.credits = (user.credits || 0) + creditsToAdd;
                        return { rows: [{ credits: user.credits }] };
                    }
                }
                return { rows: [] };
            }
            if (textLower.includes('update referrals')) {
                return { rows: [{ id: 'ref123' }] };
            }
            if (textLower.includes('select id from users where referral_code = $3')) {
                return { rows: [{ id: 'referrer123' }] };
            }
            return { rows: [] };
        });
    });

    afterEach(() => {
        delete process.env.STRIPE_SECRET_KEY;
        delete process.env.STRIPE_WEBHOOK_SECRET;
        delete process.env.STRIPE_PRICE_BASIC_AGENCY_PLAN;
        delete process.env.STRIPE_PRICE_PRO_AGENCY_PLAN;
        setQueryDelegate(null);
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
        expect(logError).toHaveBeenCalled();
    });

    // Test for successful checkout.session.completed event (payment mode)
    test('should update user credits for checkout.session.completed', async () => {
        clearMockUsers();
        addMockUser({ id: 'user123', email: 'test@example.com', hashed_password: 'hashed', credits: 100 });

        await handler(mockReq, mockRes);

        expect(mockRes.statusCode).toBe(200);
        expect(mockRes._getData()).toEqual({ received: true });
        expect(mockQuery).toHaveBeenCalledWith(
            'UPDATE users SET credits = credits + $1 WHERE id = $2 RETURNING credits',
            [50, 'user123']
        );
        expect(getMockUsers()[0].credits).toBe(150);
        expect(sendEmail).toHaveBeenCalledWith('test@example.com', expect.any(String), expect.any(String));
    });

    // Test for checkout.session.completed with missing userId
    test('should return 400 for checkout.session.completed with missing userId', async () => {
        mockStripeWebhooksConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: {
                object: {
                    mode: 'payment',
                    metadata: {
                        credits: '50'
                    },
                },
            },
        });
        await handler(mockReq, mockRes);
        expect(mockRes.statusCode).toBe(400);
        expect(mockRes._getJSONData()).toEqual({ message: 'Missing user identifier in session metadata.' });
        expect(logError).toHaveBeenCalled();
    });

    // Test for checkout.session.completed with invalid credits
    test('should return 400 for checkout.session.completed with invalid credits', async () => {
        mockStripeWebhooksConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: {
                object: {
                    mode: 'payment',
                    metadata: {
                        userId: 'user123',
                        credits: 'abc'
                    },
                },
            },
        });
        await handler(mockReq, mockRes);
        expect(mockRes.statusCode).toBe(400);
        expect(mockRes._getJSONData()).toEqual({ message: 'Invalid credits value received for payment mode.' });
        expect(logError).toHaveBeenCalled();
    });

    // Test for checkout.session.completed where user not found in DB
    test('should return 404 for checkout.session.completed if user not found', async () => {
        clearMockUsers();

        mockStripeWebhooksConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: {
                object: {
                    mode: 'payment',
                    metadata: {
                        userId: 'nonExistentUser',
                        credits: '50'
                    },
                },
            },
        });
        await handler(mockReq, mockRes);
        expect(mockRes.statusCode).toBe(404);
        expect(mockRes._getJSONData()).toEqual({ message: 'User not found in database for credit pack purchase.' });
        expect(logError).toHaveBeenCalled();
    });

    // Test for invoice.payment_succeeded event - Basic Agency Plan
    test('should add credits for invoice.payment_succeeded (BASIC_AGENCY_PLAN)', async () => {
        clearMockUsers();
        addMockUser({ id: 'agency123', email: 'agency@example.com', credits: 0, subscription_status: 'inactive' });

        mockStripeWebhooksConstructEvent.mockReturnValue({
            type: 'invoice.payment_succeeded',
            data: {
                object: {
                    subscription: 'sub_basic',
                    amount_due: 500,
                },
            },
        });
        mockStripeSubscriptionsRetrieve.mockResolvedValue({
            items: { data: [{ price: { id: 'price_BASIC_AGENCY_PLAN' } }] },
            metadata: { agencyId: 'agency123' },
        });

        await handler(mockReq, mockRes);

        expect(mockRes.statusCode).toBe(200);
        expect(mockQuery).toHaveBeenCalledWith(
            'UPDATE users SET credits = credits + $1, subscription_status = $2 WHERE id = $3 RETURNING credits',
            [100, 'active', 'agency123']
        );
        expect(getMockUsers()[0].credits).toBe(100);
        expect(getMockUsers()[0].subscription_status).toBe('active');
        expect(sendEmail).toHaveBeenCalledWith('agency@example.com', expect.any(String), expect.any(String));
    });

    // Test for invoice.payment_succeeded event - Pro Agency Plan
    test('should add credits for invoice.payment_succeeded (PRO_AGENCY_PLAN)', async () => {
        clearMockUsers();
        addMockUser({ id: 'agency123', email: 'agency@example.com', credits: 50, subscription_status: 'active' });

        mockStripeWebhooksConstructEvent.mockReturnValue({
            type: 'invoice.payment_succeeded',
            data: {
                object: {
                    subscription: 'sub_pro',
                    amount_due: 1500,
                },
            },
        });
        mockStripeSubscriptionsRetrieve.mockResolvedValue({
            items: { data: [{ price: { id: 'price_PRO_AGENCY_PLAN' } }] },
            metadata: { agencyId: 'agency123' },
        });

        await handler(mockReq, mockRes);

        expect(mockRes.statusCode).toBe(200);
        expect(mockQuery).toHaveBeenCalledWith(
            'UPDATE users SET credits = credits + $1, subscription_status = $2 WHERE id = $3 RETURNING credits',
            [250, 'active', 'agency123']
        );
        expect(getMockUsers()[0].credits).toBe(300);
        expect(getMockUsers()[0].subscription_status).toBe('active');
        expect(sendEmail).toHaveBeenCalledWith('agency@example.com', expect.any(String), expect.any(String));
    });

    // Test for customer.subscription.deleted event
    test('should update subscription status for customer.subscription.deleted', async () => {
        clearMockUsers();
        addMockUser({ id: 'agency123', email: 'agency@example.com', credits: 200, subscription_status: 'active' });

        mockStripeWebhooksConstructEvent.mockReturnValue({
            type: 'customer.subscription.deleted',
            data: {
                object: {
                    metadata: { agencyId: 'agency123' },
                },
            },
        });

        await handler(mockReq, mockRes);

        expect(mockRes.statusCode).toBe(200);
        expect(mockQuery).toHaveBeenCalledWith(
            'UPDATE users SET subscription_status = $1 WHERE id = $2 RETURNING id',
            ['canceled', 'agency123']
        );
        expect(getMockUsers()[0].subscription_status).toBe('canceled');
        expect(sendEmail).not.toHaveBeenCalled();
    });
});
