import { jest } from '@jest/globals';

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('cookie', () => ({
  parse: jest.fn(),
}));

jest.mock('@google/generative-ai', () => {
  const mockGeminiModel = {
    generateContent: jest.fn(() => ({
      response: Promise.resolve({
        text: () => '{\n  "googleUpdate": "mock google update",\n  "facebookPost": "mock facebook post"\n}'
      })
    }))
  };
  const mockGenAI = {
    getGenerativeModel: jest.fn(() => mockGeminiModel)
  };
  return {
    GoogleGenerativeAI: jest.fn(() => mockGenAI),
    _getMockGenAI: () => mockGenAI,
    _getMockGeminiModel: () => mockGeminiModel
  };
});

import handler from '../../api/generate-social-post.js';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import { _getMockGeminiModel } from '@google/generative-ai';
import { clearMockUsers, addMockUser, addMockTestimonial } from '../../db/mockDb.js';

describe('Generate Social Post API', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      method: 'POST',
      body: {
        authorName: 'John Doe',
        reviewText: 'Great service!',
        rating: 5,
        businessName: 'King Plumbers',
        service: 'Plumber',
        town: 'Austin'
      },
      headers: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn()
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

  test('should return 401 if no token is provided', async () => {
    parseCookie.mockReturnValue({});
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('should return 401 if token is invalid or expired', async () => {
    parseCookie.mockReturnValue({ authToken: 'invalid_token' });
    jwt.verify.mockImplementation(() => { throw new Error('invalid token'); });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('should return 400 if required fields are missing and no reviewId is provided', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 123 });
    req.body = { rating: 5 }; // authorName and reviewText are missing

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('should return 404 if reviewId is provided but testimonial does not exist', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 123 });
    req.body = { reviewId: 999 };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('should retrieve review from database and return fallback if Gemini is not configured', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 123 });
    
    // Add mock testimonial to mockDb
    addMockTestimonial({
      id: 't_123',
      user_id: 123,
      author_name: 'Database Author',
      review_text: 'Excellent work from the team!',
      rating: 5
    });

    req.body = { reviewId: 't_123' };

    const originalApiKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.source).toBe('fallback');
    expect(responseData.posts.googleUpdate).toContain('Database Author');
    expect(responseData.posts.googleUpdate).toContain('Excellent work from the team!');
    expect(responseData.posts.facebookPost).toContain('Database Author');

    if (originalApiKey) {
      process.env.GEMINI_API_KEY = originalApiKey;
    }
  });

  test('should return AI social posts if Gemini is configured and returns valid JSON', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 123 });
    process.env.GEMINI_API_KEY = 'mock_key';

    const mockModel = _getMockGeminiModel();
    mockModel.generateContent.mockReturnValueOnce({
      response: Promise.resolve({
        text: () => '```json\n{\n  "googleUpdate": "AI generated Google update",\n  "facebookPost": "AI generated Facebook post"\n}\n```'
      })
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.source).toBe('ai');
    expect(responseData.posts.googleUpdate).toBe('AI generated Google update');
    expect(responseData.posts.facebookPost).toBe('AI generated Facebook post');
  });

  test('should fallback if Gemini throws an error', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 123 });
    process.env.GEMINI_API_KEY = 'mock_key';

    const mockModel = _getMockGeminiModel();
    mockModel.generateContent.mockRejectedValueOnce(new Error('AI generation failed'));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.source).toBe('fallback');
    expect(responseData.posts.googleUpdate).toContain('John Doe');
  });

  test('should fallback if Gemini returns invalid JSON structure', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 123 });
    process.env.GEMINI_API_KEY = 'mock_key';

    const mockModel = _getMockGeminiModel();
    mockModel.generateContent.mockReturnValueOnce({
      response: Promise.resolve({
        text: () => 'Not a JSON structure'
      })
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.source).toBe('fallback');
    expect(responseData.posts.googleUpdate).toContain('John Doe');
  });
});
