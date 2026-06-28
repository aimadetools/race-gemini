import { jest } from '@jest/globals';

jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
    smembers: jest.fn(),
  },
}));

jest.mock('cookie', () => ({
  parse: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('stripe', () => {
  const mockRetrieveCustomer = jest.fn();
  const mockRetrieveSubscription = jest.fn();

  const StripeMock = jest.fn(() => ({
    customers: {
      retrieve: mockRetrieveCustomer,
    },
    subscriptions: {
      retrieve: mockRetrieveSubscription,
    },
  }));

  StripeMock.mockRetrieveCustomer = mockRetrieveCustomer;
  StripeMock.mockRetrieveSubscription = mockRetrieveSubscription;

  return StripeMock;
});

import handler from '../../api/agency-dashboard';
import { kv } from '@vercel/kv';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { clearMockUsers, addMockUser, addMockSeoPage, clearMockAgencyDirectory, addMockAgencyDirectory } from '../../db/mockDb.js';

describe('agency-dashboard API', () => {
  let req;
  let res;
  let mockKv;

  beforeEach(() => {
    mockKv = {
      get: jest.fn(),
      smembers: jest.fn(),
    };

    req = {
      method: 'GET',
      headers: {
        cookie: 'auth=valid_token',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
    clearMockUsers();
    clearMockAgencyDirectory();
    Stripe.mockRetrieveCustomer.mockReset();
    Stripe.mockRetrieveSubscription.mockReset();
    cookie.parse.mockReturnValue({ auth: 'valid_token' });
    jwt.verify.mockReturnValue({ agencyId: 'testAgencyId' });

    process.env.JWT_SECRET = 'test_secret';
    process.env.STRIPE_PRICE_BASIC_AGENCY_PLAN = 'price_BASIC_AGENCY_PLAN';
    process.env.STRIPE_PRICE_PRO_AGENCY_PLAN = 'price_PRO_AGENCY_PLAN';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.STRIPE_PRICE_BASIC_AGENCY_PLAN;
    delete process.env.STRIPE_PRICE_PRO_AGENCY_PLAN;
  });

  test('should return 405 for non-GET methods', async () => {
    req.method = 'POST';
    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ message: 'Only GET requests are allowed' });
  });

  test('should return 401 if no token is provided', async () => {
    cookie.parse.mockReturnValue({});

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated' });
  });

  test('should return 401 if token is invalid', async () => {
    cookie.parse.mockReturnValue({ token: 'invalid_token' });
    jwt.verify.mockImplementation(() => { throw new Error('invalid token'); });

    await handler(req, res, mockKv);

    expect(jwt.verify).toHaveBeenCalledWith('invalid_token', 'test_secret');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Authentication failed: Please log in again.' });
  });

  test('should return 403 if token does not contain userId or agencyId', async () => {
    cookie.parse.mockReturnValue({ token: 'valid_token' });
    jwt.verify.mockReturnValue({});

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not an agency account' });
  });

  test('should return 404 if agency is not found', async () => {
    const agencyId = 'agency123';
    cookie.parse.mockReturnValue({ token: 'valid_token' });
    jwt.verify.mockReturnValue({ agencyId });

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Agency user not found' });
  });

  test('should successfully retrieve agency and client data', async () => {
    const agencyId = 'agency123';
    const client1Id = 'client1';
    const client2Id = 'client2';

    const agency = {
      agencyName: 'Test Agency',
      email: 'agency@example.com',
      logoUrl: 'logo.png',
      primaryColor: '#FFF',
      credits: 100,
      subscriptionStatus: 'active',
      planName: 'Basic Agency Plan',
      monthlyCredits: 100,
      renewalDate: '2026-06-01T00:00:00.000Z',
    };

    addMockUser({
      id: agencyId,
      name: agency.agencyName,
      email: agency.email,
      credits: agency.credits,
      subscription_status: agency.subscriptionStatus,
      stripe_subscription_id: 'sub_agency123',
      logo_url: agency.logoUrl,
      primary_color: agency.primaryColor,
      is_agency: true,
    });

    const client1 = { id: client1Id, name: 'Client One', email: 'client1@example.com', credits: 10, agency_id: agencyId, is_agency: false };
    const client2 = { id: client2Id, name: 'Client Two', email: 'client2@example.com', credits: 20, agency_id: agencyId, is_agency: false };

    addMockUser(client1);
    addMockUser(client2);

    addMockSeoPage({ id: 'page1', user_id: client1Id });
    addMockSeoPage({ id: 'page2', user_id: client1Id });
    addMockSeoPage({ id: 'page3', user_id: client2Id });

    cookie.parse.mockReturnValue({ token: 'valid_token' });
    jwt.verify.mockReturnValue({ agencyId });

    Stripe.mockRetrieveSubscription.mockResolvedValueOnce({
      status: agency.subscriptionStatus,
      current_period_end: new Date(agency.renewalDate).getTime() / 1000,
      items: {
        data: [{
          price: {
            id: 'price_BASIC_AGENCY_PLAN',
          },
        }],
      },
    });

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      agencyName: agency.agencyName,
      email: agency.email,
      clients: [
        { id: client1Id, name: client1.name, email: client1.email, pagesGenerated: 2, credits: 10 },
        { id: client2Id, name: client2.name, email: client2.email, pagesGenerated: 1, credits: 20 },
      ],
      logoUrl: agency.logoUrl,
      primaryColor: agency.primaryColor,
      credits: agency.credits,
      subscriptionStatus: agency.subscriptionStatus,
      planName: agency.planName,
      monthlyCredits: agency.monthlyCredits,
      renewalDate: agency.renewalDate,
      totalClients: 2,
      totalPagesGenerated: 3,
      customDomain: null,
      customDomainRedirect: null,
      agencyLeads: [],
      hasClaimedProfile: false,
      agencySlug: null,
      userId: agencyId,
    });
  });

  test('should return 500 for internal server error during database operations', async () => {
    const agencyId = 'agency123';
    addMockUser({
      id: agencyId,
      name: 'Test Agency',
      email: 'agency@example.com',
      credits: 100,
      subscription_status: 'active',
      stripe_subscription_id: 'sub_agency123',
      logo_url: 'logo.png',
      primary_color: '#FFF',
      is_agency: true,
    });

    cookie.parse.mockReturnValue({ token: 'valid_token' });
    jwt.verify.mockReturnValue({ agencyId });
    
    const { setQueryDelegate } = await import('../../db/mockDb.js');
    setQueryDelegate(() => { throw new Error('Database connection failed'); });

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });

    setQueryDelegate(null);
  });

  test('should return 401 for invalid JWT verification', async () => {
    cookie.parse.mockReturnValue({ token: 'invalid_token' });
    jwt.verify.mockImplementation(() => { throw new Error('JWT verification failed'); });

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Authentication failed: Please log in again.' });
  });

  test('should return hasClaimedProfile true and agencySlug when agency has claimed a directory profile', async () => {
    const agencyId = 'agency123';
    addMockUser({
      id: agencyId,
      name: 'Test Agency',
      email: 'agency@example.com',
      credits: 100,
      subscription_status: 'active',
      stripe_subscription_id: 'sub_agency123',
      is_agency: true,
    });

    addMockAgencyDirectory({
      claimed_user_id: agencyId,
      slug: 'test-agency-slug',
    });

    cookie.parse.mockReturnValue({ token: 'valid_token' });
    jwt.verify.mockReturnValue({ agencyId });

    Stripe.mockRetrieveSubscription.mockResolvedValueOnce({
      status: 'active',
      current_period_end: Date.now() / 1000 + 3600,
      items: {
        data: [{
          price: {
            id: 'price_BASIC_AGENCY_PLAN',
          },
        }],
      },
    });

    await handler(req, res, mockKv);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.hasClaimedProfile).toBe(true);
    expect(responseData.agencySlug).toBe('test-agency-slug');
  });
});
