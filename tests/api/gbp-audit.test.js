import { jest } from '@jest/globals';

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

// Mock cookie
jest.mock('cookie', () => ({
  parse: jest.fn(),
}));

// Mock Google Generative AI
jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => {
      return {
        getGenerativeModel: jest.fn().mockImplementation(() => {
          return {
            generateContent: jest.fn().mockResolvedValue({
              response: {
                text: () => JSON.stringify({
                  keywords: ["plumbing company", "best plumber", "emergency plumber", "drain cleaning", "clogged drain"],
                  optimizedDescription: "Optimized plumbing business description written by Gemini.",
                  posts: [
                    { title: "Local Plumbing Deal", text: "Get 10% off plumber services!" }
                  ],
                  faqs: [
                    { question: "Do you offer emergency repair?", answer: "Yes, we offer emergency plumbing repair." },
                    { question: "Q2", answer: "A2" },
                    { question: "Q3", answer: "A3" },
                    { question: "Q4", answer: "A4" },
                    { question: "Q5", answer: "A5" }
                  ]
                })
              }
            })
          };
        })
      };
    })
  };
});

import handler from '../../api/gbp-audit.js';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import { clearMockUsers, addMockUser } from '../../db/mockDb.js';

describe('GBP Audit API', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      method: 'POST',
      body: {
        isMock: false
      },
      headers: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };

    jest.clearAllMocks();
    clearMockUsers();
    process.env.JWT_SECRET = 'test_secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  test('should return 405 for non-POST methods', async () => {
    req.method = 'GET';
    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  test('should return 401 if no token is provided for real scan', async () => {
    req.body.isMock = false;
    parseCookie.mockReturnValue({});
    
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('should run public mock scan successfully without authentication', async () => {
    req.body = {
      isMock: true,
      name: 'Springfield Plumbers',
      category: 'Plumbing',
      address: '123 Main St, Springfield, IL',
      phone: '(555) 123-4567',
      website: 'https://springfieldplumbers.com',
      description: 'We do quality plumbing work.'
    };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const jsonResponse = res.json.mock.calls[0][0];
    expect(jsonResponse.score).toBeDefined();
    expect(jsonResponse.profile.name).toBe('Springfield Plumbers');
    expect(jsonResponse.recommendations.keywords).toHaveLength(5);
    expect(jsonResponse.recommendations.faqs).toHaveLength(5);
    expect(jsonResponse.isMock).toBe(true);
  });

  test('should run audit for logged in user successfully and retrieve user profile', async () => {
    req.body.isMock = false;
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 'user-456' });

    addMockUser({
      id: 'user-456',
      email: 'plumber@gmail.com',
      business_profile: {
        name: 'Apex Plumbers',
        type: 'Plumber',
        phone: '(555) 999-8888',
        website: 'https://apexplumbing.com',
        description: 'Apex plumbing services for home and office.',
        address: {
          streetAddress: '100 Water Way',
          addressLocality: 'Springfield',
          addressRegion: 'IL',
          postalCode: '62701'
        }
      },
      gbp_oauth_refresh_token: 'refresh',
      gbp_oauth_access_token: 'access'
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const jsonResponse = res.json.mock.calls[0][0];
    expect(jsonResponse.profile.name).toBe('Apex Plumbers');
    expect(jsonResponse.profile.phone).toBe('(555) 999-8888');
    expect(jsonResponse.gbpConnected).toBe(true);
    expect(jsonResponse.isMock).toBe(false);
  });
});
