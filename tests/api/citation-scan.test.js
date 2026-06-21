import { jest } from '@jest/globals';
import handler from '../../api/citation-scan.js';

describe('Citation Scan API', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            method: 'POST',
            body: {
                name: 'Springfield Plumbing',
                address: '742 Evergreen Terrace, Springfield, IL 62704',
                phone: '(555) 019-9234'
            }
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn()
        };
    });

    it('should reject non-POST methods with 405', async () => {
        mockReq.method = 'GET';
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(405);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Only POST requests are allowed.'
        }));
    });

    it('should reject missing body parameters with 400', async () => {
        mockReq.body = { name: 'Springfield Plumbing' };
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Name, address, and phone are required.'
        }));
    });

    it('should scan and return NAP consistency data correctly', async () => {
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Springfield Plumbing',
            address: '742 Evergreen Terrace, Springfield, IL 62704',
            phone: '(555) 019-9234',
            city: 'Springfield',
            score: expect.any(Number),
            scanResults: expect.any(Array),
            failures: expect.any(Array),
            suggestedTowns: expect.any(Array),
            generatedRedirectUrl: expect.any(String)
        }));
    });
});
