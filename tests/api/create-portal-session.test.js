import { jest } from '@jest/globals';
import { createRequest, createResponse } from 'node-mocks-http';
import jwt from 'jsonwebtoken';
import { logError } from '../../lib/logger';
import { clearMockUsers, addMockUser, getMockUsers, setQueryDelegate } from '../../db/mockDb.js';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../lib/logger');

const mockStripeBillingPortalSessionsCreate = jest.fn();
const mockStripeSubscriptionsRetrieve = jest.fn();
const mockStripeCustomersList = jest.fn();

let handler;

describe('Create Portal Session API', () => {
    let mockReq;
    let mockRes;

    beforeAll(() => {
        jest.doMock('stripe', () => {
            const mockStripe = jest.fn(() => ({
                billingPortal: {
                    sessions: {
                        create: mockStripeBillingPortalSessionsCreate,
                    },
                },
                subscriptions: {
                    retrieve: mockStripeSubscriptionsRetrieve,
                },
                customers: {
                    list: mockStripeCustomersList,
                },
            }));
            return mockStripe;
        });
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        clearMockUsers();
        
        // Dynamic import to pick up mocks
        delete require.cache[require.resolve('../../api/create-portal-session')];
        handler = (await import('../../api/create-portal-session')).default;

        jwt.verify.mockReturnValue({ userId: 'user123' });
        process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
        process.env.JWT_SECRET = 'test_jwt_secret';

        mockReq = createRequest({ method: 'POST' });
        mockRes = createResponse();
        mockReq.headers = {
            cookie: 'auth=mockValidToken',
            host: 'example.com'
        };

        mockStripeBillingPortalSessionsCreate.mockResolvedValue({ url: 'https://billing.stripe.com/p/session/mock' });

        setQueryDelegate((text, params) => {
            const textLower = text.toLowerCase();
            if (textLower.includes('select id, email, stripe_customer_id, stripe_subscription_id, is_agency')) {
                const id = params[0]?.toString();
                const user = getMockUsers().find(u => u.id.toString() === id);
                if (user) {
                    return {
                        rows: [{
                            id: user.id,
                            email: user.email,
                            stripe_customer_id: user.stripe_customer_id || null,
                            stripe_subscription_id: user.stripe_subscription_id || null,
                            is_agency: user.is_agency || false
                        }]
                    };
                }
                return { rows: [] };
            }
            if (textLower.includes('update users set stripe_customer_id')) {
                const [custId, userId] = params;
                const user = getMockUsers().find(u => u.id.toString() === userId.toString());
                if (user) {
                    user.stripe_customer_id = custId;
                    return { rows: [{ id: user.id }] };
                }
            }
            return { rows: [] };
        });
    });

    afterEach(() => {
        delete process.env.STRIPE_SECRET_KEY;
        delete process.env.JWT_SECRET;
        setQueryDelegate(null);
    });

    test('should return 405 for non-POST methods', async () => {
        mockReq.method = 'GET';
        await handler(mockReq, mockRes);
        expect(mockRes.statusCode).toBe(405);
    });

    test('should return 401 if user not authenticated', async () => {
        mockReq.headers.cookie = '';
        await handler(mockReq, mockRes);
        expect(mockRes.statusCode).toBe(401);
    });

    test('should return 404 if user not found in database', async () => {
        await handler(mockReq, mockRes);
        expect(mockRes.statusCode).toBe(404);
    });

    test('should reuse existing stripe_customer_id and return 200', async () => {
        addMockUser({ id: 'user123', email: 'test@example.com', stripe_customer_id: 'cus_existing', is_agency: true });

        await handler(mockReq, mockRes);

        expect(mockStripeBillingPortalSessionsCreate).toHaveBeenCalledWith({
            customer: 'cus_existing',
            return_url: 'https://example.com/agency-subscription.html'
        });
        expect(mockRes.statusCode).toBe(200);
        expect(mockRes._getJSONData()).toEqual({ url: 'https://billing.stripe.com/p/session/mock' });
    });

    test('should resolve customer from subscription if stripe_customer_id not in DB', async () => {
        addMockUser({ id: 'user123', email: 'test@example.com', stripe_subscription_id: 'sub_active', is_agency: false });
        mockStripeSubscriptionsRetrieve.mockResolvedValue({ customer: 'cus_resolved_from_sub' });

        await handler(mockReq, mockRes);

        expect(mockStripeSubscriptionsRetrieve).toHaveBeenCalledWith('sub_active');
        expect(mockStripeBillingPortalSessionsCreate).toHaveBeenCalledWith({
            customer: 'cus_resolved_from_sub',
            return_url: 'https://example.com/dashboard.html'
        });
        expect(getMockUsers()[0].stripe_customer_id).toBe('cus_resolved_from_sub');
        expect(mockRes.statusCode).toBe(200);
    });

    test('should search Stripe by email if customer_id and sub_id not present/resolved', async () => {
        addMockUser({ id: 'user123', email: 'test@example.com', is_agency: false });
        mockStripeCustomersList.mockResolvedValue({ data: [{ id: 'cus_found_by_email' }] });

        await handler(mockReq, mockRes);

        expect(mockStripeCustomersList).toHaveBeenCalledWith({ email: 'test@example.com', limit: 1 });
        expect(mockStripeBillingPortalSessionsCreate).toHaveBeenCalledWith({
            customer: 'cus_found_by_email',
            return_url: 'https://example.com/dashboard.html'
        });
        expect(getMockUsers()[0].stripe_customer_id).toBe('cus_found_by_email');
        expect(mockRes.statusCode).toBe(200);
    });

    test('should return 400 if no Stripe customer can be found', async () => {
        addMockUser({ id: 'user123', email: 'test@example.com', is_agency: false });
        mockStripeCustomersList.mockResolvedValue({ data: [] });

        await handler(mockReq, mockRes);

        expect(mockRes.statusCode).toBe(400);
        expect(mockRes._getJSONData().message).toContain('No Stripe billing profile found');
    });
});
