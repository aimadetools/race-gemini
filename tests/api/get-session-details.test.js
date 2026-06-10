import { jest } from '@jest/globals';
import { createRequest, createResponse } from 'node-mocks-http';

const mockStripeCheckoutSessionsRetrieve = jest.fn();

let handler;

describe('Get Session Details API', () => {
    let mockReq;
    let mockRes;

    beforeAll(() => {
        jest.doMock('stripe', () => {
            const mockStripe = jest.fn(() => ({
                checkout: {
                    sessions: {
                        retrieve: mockStripeCheckoutSessionsRetrieve,
                    },
                },
            }));
            return mockStripe;
        });
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        delete require.cache[require.resolve('../../api/get-session-details')];
        handler = (await import('../../api/get-session-details')).default;

        process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
        mockReq = createRequest({ method: 'GET' });
        mockRes = createResponse();
    });

    afterEach(() => {
        delete process.env.STRIPE_SECRET_KEY;
    });

    test('should return 405 for non-GET methods', async () => {
        mockReq.method = 'POST';
        await handler(mockReq, mockRes);
        expect(mockRes.statusCode).toBe(405);
    });

    test('should return 400 if session_id query param is missing', async () => {
        await handler(mockReq, mockRes);
        expect(mockRes.statusCode).toBe(400);
        expect(mockRes._getJSONData().message).toContain('Missing session_id');
    });

    test('should retrieve details and return 200 for valid session_id', async () => {
        mockReq.query = { session_id: 'cs_test_123' };
        mockStripeCheckoutSessionsRetrieve.mockResolvedValue({
            id: 'cs_test_123',
            amount_total: 9900,
            currency: 'usd',
            payment_status: 'paid',
            mode: 'payment',
            metadata: {
                creditPackId: 'pack_pro'
            }
        });

        await handler(mockReq, mockRes);

        expect(mockStripeCheckoutSessionsRetrieve).toHaveBeenCalledWith('cs_test_123');
        expect(mockRes.statusCode).toBe(200);
        expect(mockRes._getJSONData()).toEqual({
            transactionId: 'cs_test_123',
            amount: 99,
            currency: 'usd',
            paymentStatus: 'paid',
            mode: 'payment',
            productName: 'pack_pro'
        });
    });
});
