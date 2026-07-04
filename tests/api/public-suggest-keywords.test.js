import { jest } from '@jest/globals';

jest.mock('@google/generative-ai', () => {
  const mockGeminiModel = {
    generateContent: jest.fn(() => ({
      response: Promise.resolve({
        text: () => '[\n  {\n    "query": "mock query",\n    "intent": "Transactional",\n    "volume": "High",\n    "explanation": "mock explanation"\n  }\n]'
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

import handler from '../../api/public-suggest-keywords.js';
import { _getMockGeminiModel } from '@google/generative-ai';

describe('Public Suggest Keywords API', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      method: 'POST',
      body: {
        service: 'Roofing',
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
  });

  test('should return 405 for non-POST methods', async () => {
    req.method = 'GET';
    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  test('should return 400 if required fields are missing', async () => {
    req.body = { service: 'Roofing' }; // town is missing

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('should return fallback keywords if Gemini is not configured', async () => {
    // Ensure no Gemini Key in env
    const originalApiKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.source).toBe('fallback');
    expect(responseData.keywords.length).toBeGreaterThan(0);
    expect(responseData.keywords[0].query).toContain('Roofing');
    expect(responseData.keywords[0].query).toContain('Austin');

    // Restore environment variable
    if (originalApiKey) {
      process.env.GEMINI_API_KEY = originalApiKey;
    }
  });

  test('should return AI keywords if Gemini is configured and returns valid JSON', async () => {
    process.env.GEMINI_API_KEY = 'mock_key';

    const mockModel = _getMockGeminiModel();
    mockModel.generateContent.mockReturnValueOnce({
      response: Promise.resolve({
        text: () => '```json\n[\n  {\n    "query": "best Roofing in Austin",\n    "intent": "Commercial",\n    "volume": "High",\n    "explanation": "test explanation"\n  }\n]\n```'
      })
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.source).toBe('ai');
    expect(responseData.keywords).toEqual([
      {
        query: 'best Roofing in Austin',
        intent: 'Commercial',
        volume: 'High',
        explanation: 'test explanation'
      }
    ]);
  });

  test('should fallback if Gemini throws an error', async () => {
    process.env.GEMINI_API_KEY = 'mock_key';

    const mockModel = _getMockGeminiModel();
    mockModel.generateContent.mockRejectedValueOnce(new Error('AI generation failed'));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.source).toBe('fallback');
    expect(responseData.keywords.length).toBeGreaterThan(0);
  });

  test('should fallback if Gemini returns invalid JSON structure', async () => {
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
    expect(responseData.keywords.length).toBeGreaterThan(0);
  });
});
