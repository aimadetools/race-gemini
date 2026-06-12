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
        text: () => '{\n  "description": "mock business description",\n  "services": [\n    { "name": "mock service", "description": "mock description" }\n  ],\n  "suggestedHours": [\n    { "dayOfWeek": "Monday", "opens": "08:00", "closes": "17:00" }\n  ]\n}'
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

import handler from '../../api/generate-schema-details.js';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import { _getMockGeminiModel } from '@google/generative-ai';

describe('Generate Schema Details API', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      method: 'POST',
      body: {
        businessName: 'King Plumbers',
        serviceType: 'Plumber',
        city: 'Austin',
        state: 'TX'
      },
      headers: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn()
    };

    jest.clearAllMocks();
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

  test('should return 400 if required fields are missing', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 123 });
    req.body = { businessName: 'King Plumbers' }; // serviceType & city missing

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('should return fallback schema details if Gemini is not configured', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 123 });
    
    const originalApiKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.source).toBe('fallback');
    expect(responseData.details.description).toContain('King Plumbers');
    expect(responseData.details.services.length).toBeGreaterThan(0);

    if (originalApiKey) {
      process.env.GEMINI_API_KEY = originalApiKey;
    }
  });

  test('should return AI schema details if Gemini is configured and returns valid JSON', async () => {
    parseCookie.mockReturnValue({ authToken: 'valid_token' });
    jwt.verify.mockReturnValue({ userId: 123 });
    process.env.GEMINI_API_KEY = 'mock_key';

    const mockModel = _getMockGeminiModel();
    mockModel.generateContent.mockReturnValueOnce({
      response: Promise.resolve({
        text: () => '```json\n{\n  "description": "Best local plumber services",\n  "services": [\n    { "name": "Drain Unclogging", "description": "Quick residential drain cleaning" }\n  ],\n  "suggestedHours": [\n    { "dayOfWeek": "Monday", "opens": "08:00", "closes": "18:00" }\n  ]\n}\n```'
      })
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.source).toBe('ai');
    expect(responseData.details.description).toBe('Best local plumber services');
    expect(responseData.details.services[0].name).toBe('Drain Unclogging');
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
    expect(responseData.details.description).toContain('King Plumbers');
  });
});
