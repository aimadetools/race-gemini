import { jest } from '@jest/globals';
import handler from '../../api/generate-gbp-post.js';

describe('GBP Post Generation API', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      method: 'POST',
      body: {
        businessName: 'Dallas Plumbing Pros',
        service: 'Water Heater Replacement',
        location: 'Dallas, TX',
        postType: 'update',
        tone: 'promotional',
        keywords: 'plumbing repair, Dallas plumber',
        specialDetails: {
          customAnnouncement: 'We are now offering 24/7 emergency repair services.'
        }
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
  });

  it('should reject missing required fields with 400', async () => {
    mockReq.body = { businessName: 'Dallas Plumbing Pros' };
    await handler(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('should generate fallback update post correctly when no GEMINI_API_KEY is configured', async () => {
    process.env.GEMINI_API_KEY = ''; // ensure fallback is used
    await handler(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      postText: expect.stringContaining('Dallas Plumbing Pros'),
      buttonLabel: 'Call Now',
      source: 'fallback'
    }));
  });

  it('should generate fallback offer post correctly when no GEMINI_API_KEY is configured', async () => {
    process.env.GEMINI_API_KEY = '';
    mockReq.body.postType = 'offer';
    mockReq.body.specialDetails = {
      offerTitle: '$50 Off Water Heater Installation',
      discountDetails: '$50 off complete installation services',
      couponCode: '50OFF',
      startDate: '2026-07-01',
      endDate: '2026-07-31'
    };
    await handler(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      postText: expect.stringContaining('50OFF'),
      buttonLabel: 'Get Offer',
      source: 'fallback'
    }));
  });

  it('should generate fallback event post correctly when no GEMINI_API_KEY is configured', async () => {
    process.env.GEMINI_API_KEY = '';
    mockReq.body.postType = 'event';
    mockReq.body.specialDetails = {
      eventTitle: 'Water Safety and Inspection Workshop',
      startDate: '2026-07-15 at 10 AM',
      endDate: '2026-07-15 at 12 PM'
    };
    await handler(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      postText: expect.stringContaining('Water Safety'),
      buttonLabel: 'Sign Up',
      source: 'fallback'
    }));
  });
});
