import { jest } from '@jest/globals';
import { 
  resolvePlaceId, 
  syncGbpReviews 
} from '../../lib/gbp-helper.js';
import { 
  clearMockUsers, 
  addMockUser, 
  getMockUsers,
  clearMockTestimonials,
  getMockTestimonials,
  clearMockSeoPages,
  addMockSeoPage
} from '../../db/mockDb.js';

describe('GBP Helper Lib', () => {
  let mockFetch;

  beforeEach(() => {
    jest.clearAllMocks();
    clearMockUsers();
    clearMockTestimonials();
    clearMockSeoPages();

    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    delete global.fetch;
    delete process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
  });

  describe('resolvePlaceId', () => {
    it('should return place_id directly if it starts with ChI', async () => {
      const result = await resolvePlaceId(null, 'ChIJN1t_tDeuEmsRUsoyG83VY24');
      expect(result).toBe('ChIJN1t_tDeuEmsRUsoyG83VY24');
    });

    it('should parse placeid parameter from googleReviewLink', async () => {
      const result = await resolvePlaceId('https://search.google.com/local/writereview?placeid=ChIJ12345&foo=bar', null);
      expect(result).toBe('ChIJ12345');
    });

    it('should parse place_id parameter from googleReviewLink', async () => {
      const result = await resolvePlaceId('https://search.google.com/local/writereview?place_id=ChIJ67890', null);
      expect(result).toBe('ChIJ67890');
    });

    it('should fall back to regex matching if URL parsing fails', async () => {
      const result = await resolvePlaceId('some-invalid-url-with-placeid=ChIJRegexMatch', null);
      expect(result).toBe('ChIJRegexMatch');
    });

    it('should follow redirects for short URLs and extract placeid', async () => {
      mockFetch.mockResolvedValueOnce({
        url: 'https://search.google.com/local/writereview?placeid=ChIJRedirectPlace',
      });

      const result = await resolvePlaceId('https://g.page/r/short-slug/review', null);
      expect(mockFetch).toHaveBeenCalledWith('https://g.page/r/short-slug/review', {
        method: 'HEAD',
        redirect: 'follow',
      });
      expect(result).toBe('ChIJRedirectPlace');
    });

    it('should return raw query if it does not match Place ID format', async () => {
      const result = await resolvePlaceId(null, 'Plumbing Experts Austin');
      expect(result).toBe('Plumbing Experts Austin');
    });
  });

  describe('syncGbpReviews', () => {
    it('should fallback to mock reviews when no API key is set', async () => {
      const user = {
        id: '123',
        email: 'electrician@test.com',
        google_review_link: null,
        gbp_place_id: 'ChIJPlaceID',
        gbp_sync_enabled: true,
        gbp_last_synced_at: null,
      };
      addMockUser(user);

      addMockSeoPage({
        id: 'page1',
        user_id: '123',
        business_name: 'Bright Lights Electrician',
        service: 'electrical installation',
        town: 'Chicago',
      });

      const result = await syncGbpReviews('123');

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(5);
      expect(result.testimonials.length).toBe(5);

      const testimonials = getMockTestimonials();
      expect(testimonials.length).toBe(5);
      expect(testimonials[0].author_name).toBe('John Thompson');
      expect(testimonials[0].review_text).toContain('Bright Lights Electrician');
      expect(testimonials[0].review_text).toContain('electrical installation');
    });

    it('should fetch actual reviews using Google Places API when API key is set', async () => {
      process.env.GOOGLE_PLACES_API_KEY = 'test-api-key';

      const user = {
        id: '123',
        email: 'plumber@test.com',
        google_review_link: null,
        gbp_place_id: 'ChIJPlaceID',
        gbp_sync_enabled: true,
        gbp_last_synced_at: null,
      };
      addMockUser(user);

      // Mock API responses: Places API Details returns reviews
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            name: 'Super Plumbers',
            reviews: [
              {
                author_name: 'Alice Johnson',
                profile_photo_url: 'https://example.com/avatar.jpg',
                rating: 5,
                text: 'Outstanding plumbing service!',
                time: 1779287220,
              },
              {
                author_name: 'Bob Smith',
                profile_photo_url: 'https://example.com/avatar2.jpg',
                rating: 4,
                text: 'Very fast response time.',
                time: 1779187220,
              }
            ]
          }
        })
      });

      const result = await syncGbpReviews('123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://maps.googleapis.com/maps/api/place/details/json?place_id=ChIJPlaceID&fields=reviews,name&key=test-api-key'
      );

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(2);
      expect(result.testimonials.length).toBe(2);

      const testimonials = getMockTestimonials();
      expect(testimonials.length).toBe(2);
      expect(testimonials[0].author_name).toBe('Alice Johnson');
      expect(testimonials[0].review_text).toBe('Outstanding plumbing service!');
      expect(testimonials[0].rating).toBe(5);
      expect(testimonials[0].author_avatar).toBe('https://example.com/avatar.jpg');
      expect(testimonials[0].review_date).toBeInstanceOf(Date);
    });

    it('should resolve a search query term to a Place ID first and then fetch reviews', async () => {
      process.env.GOOGLE_PLACES_API_KEY = 'test-api-key';

      const user = {
        id: '123',
        email: 'plumber@test.com',
        google_review_link: null,
        gbp_place_id: 'Plumbing Experts Austin',
        gbp_sync_enabled: true,
        gbp_last_synced_at: null,
      };
      addMockUser(user);

      // Mock response for Find Place ID from query
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ place_id: 'ChIJAustinPlumbersPlaceID' }]
        })
      });

      // Mock response for Place Details
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            name: 'Plumbing Experts Austin',
            reviews: [
              {
                author_name: 'Charlie Brown',
                profile_photo_url: 'https://example.com/avatar3.jpg',
                rating: 5,
                text: 'Excellent job.',
                time: 1779287220,
              }
            ]
          }
        })
      });

      const result = await syncGbpReviews('123');

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=Plumbing%20Experts%20Austin&inputtype=textquery&fields=place_id&key=test-api-key'
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://maps.googleapis.com/maps/api/place/details/json?place_id=ChIJAustinPlumbersPlaceID&fields=reviews,name&key=test-api-key'
      );

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(1);
      expect(testimonialsCount()).toBe(1);
    });
  });
});

function testimonialsCount() {
  return getMockTestimonials().length;
}
