const path = require('path');
const jwt = require('jsonwebtoken');
const { clearMockUsers, addMockUser, getMockSeoPages } = require('../../db/mockDb.js');

jest.mock('jsonwebtoken', () => ({
    verify: jest.fn(() => ({ userId: 'testUserId123' }))
}));

// Mock process.cwd()
const mockCwd = path.join(__dirname, 'test-temp-dir-generate');
const originalCwd = process.cwd;
process.cwd = jest.fn(() => mockCwd);

// Mock fs module
jest.mock('fs', () => {
    const originalFs = jest.requireActual('fs');
    return {
        ...originalFs,
        readFileSync: jest.fn(() => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{businessName}} - {{service}} in {{town}}</title>
</head>
<body>
    <h1>{{businessName}} - {{service}} in {{town}}</h1>
    <div>{{ai_content}}</div>
</body>
</html>
        `)
    };
});

jest.mock('@google/generative-ai', () => {
    const mockGeminiModel = {
        generateContent: jest.fn(() => ({
            response: Promise.resolve({
                text: () => 'Mock AI content.'
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

jest.mock('@vercel/kv', () => ({
    kv: {
        set: jest.fn(),
        sadd: jest.fn(),
        lpush: jest.fn()
    }
}));
jest.mock('../../lib/indexing.js', () => ({
    submitSitemapToSearchEngines: jest.fn()
}));

const { createRequest, createResponse } = require('node-mocks-http');
const fs = require('fs');
const { kv } = require('@vercel/kv');

describe('POST /api/generate', () => {
    let handler;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.GEMINI_API_KEY = 'mock-api-key';
        process.env.JWT_SECRET = 'test_jwt_secret';
        clearMockUsers();
        addMockUser({ id: 'testUserId123', credits: 100 });

        delete require.cache[require.resolve('../../api/generate')];
        handler = require('../../api/generate').default || require('../../api/generate');
    });

    afterAll(() => {
        process.cwd = originalCwd;
    });

    test('should generate zip successfully', async () => {
        const req = createRequest({
            method: 'POST',
            headers: {
                authorization: 'Bearer mock-token'
            },
            body: {
                businessName: 'Super Plumber',
                services: 'Plumbing, Drain Cleaning',
                towns: 'New York, Brooklyn',
                zipCode: '10001',
                enableAICopy: true,
                'ai-style': 'professional'
            }
        });
        const res = createResponse();

        // Mock writeHead and end on res, node-mocks-http handles pipe
        res.writeHead = jest.fn();
        
        await handler(req, res);

        // Expect writeHead to be called with ZIP headers
        expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
        expect(getMockSeoPages().length).toBeGreaterThan(0);
    });

    test('should return 400 if fields are missing', async () => {
        const req = createRequest({
            method: 'POST',
            headers: {
                authorization: 'Bearer mock-token'
            },
            body: {
                businessName: 'Super Plumber'
            }
        });
        const res = createResponse();

        await handler(req, res);
        expect(res.statusCode).toBe(400);
    });

    test('should return 401 if no auth token is provided', async () => {
        const req = createRequest({
            method: 'POST',
            body: {
                businessName: 'Super Plumber',
                services: 'Plumbing',
                towns: 'New York',
                zipCode: '10001'
            }
        });
        const res = createResponse();

        await handler(req, res);
        expect(res.statusCode).toBe(401);
    });

    test('should incorporate custom keywords/prompts into AI prompt and database', async () => {
        const req = createRequest({
            method: 'POST',
            headers: {
                authorization: 'Bearer mock-token'
            },
            body: {
                businessName: 'Super Plumber',
                services: 'Plumbing',
                towns: 'New York',
                zipCode: '10001',
                enableAICopy: true,
                'ai-style': 'friendly',
                aiKeywords: 'family-owned, 24/7 emergency service'
            }
        });
        const res = createResponse();
        res.writeHead = jest.fn();

        const mockGeminiModel = require('@google/generative-ai')._getMockGeminiModel();
        
        await handler(req, res);

        // Verify writeHead or statusCode to ensure successful run
        expect(res.statusCode).toBe(200);

        // Verify the mock model received a prompt containing the custom keywords
        const calls = mockGeminiModel.generateContent.mock.calls;
        const mainCopyPromptCall = calls.find(call => call[0].includes('Write 2-3 paragraphs of marketing copy'));
        expect(mainCopyPromptCall).toBeDefined();
        expect(mainCopyPromptCall[0]).toContain('Incorporate the following keywords/instructions: family-owned, 24/7 emergency service');

        // Verify the database record contains the keywords
        const pages = getMockSeoPages();
        const plumberPage = pages.find(p => p.service === 'Plumbing' && p.town === 'New York');
        expect(plumberPage).toBeDefined();
        expect(plumberPage.ai_keywords).toBe('family-owned, 24/7 emergency service');
    });
});
