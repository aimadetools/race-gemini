import { jest } from '@jest/globals';
import { geocodeAddress } from '../../lib/geocoding.js';
import { renderMapSection } from '../../lib/map-helper.js';

describe('Geocoding Utility', () => {
  let originalFetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.OPENCAGE_API_KEY;
    delete process.env.GEOAPIFY_API_KEY;
  });

  test('should return null if address is empty', async () => {
    const result = await geocodeAddress('');
    expect(result).toBeNull();
  });

  test('should use OpenCage if API key is provided and fetch succeeds', async () => {
    process.env.OPENCAGE_API_KEY = 'mock_opencage_key';
    const mockResponse = {
      ok: true,
      json: async () => ({
        results: [{ geometry: { lat: 40.7128, lng: -74.0060 } }]
      })
    };
    
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    const coords = await geocodeAddress('New York');
    expect(coords).toEqual({ lat: 40.7128, lng: -74.0060 });
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('api.opencagedata.com'));
  });

  test('should fallback to Geoapify if OpenCage fails or has no key', async () => {
    process.env.GEOAPIFY_API_KEY = 'mock_geoapify_key';
    const mockResponse = {
      ok: true,
      json: async () => ({
        features: [{
          properties: { lat: 34.0522, lon: -118.2437 }
        }]
      })
    };
    
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    const coords = await geocodeAddress('Los Angeles');
    expect(coords).toEqual({ lat: 34.0522, lng: -118.2437 });
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('api.geoapify.com'));
  });
});

describe('Map Helper', () => {
  test('should render Leaflet markup with provided coords', () => {
    const html = renderMapSection('Acme Plumbing', 'Austin', '#ff0000', 25, 30.2672, -97.7431);
    expect(html).toContain('Austin');
    expect(html).toContain('Acme Plumbing');
    expect(html).toContain('#ff0000');
    expect(html).toContain('const lat = 30.2672');
    expect(html).toContain('const lng = -97.7431');
    expect(html).toContain('const radiusMiles = 25');
  });

  test('should render Leaflet markup with null coords for dynamic lookup', () => {
    const html = renderMapSection('Acme Plumbing', 'Austin', '#ff0000', 25, null, null);
    expect(html).toContain('const lat = null');
    expect(html).toContain('const lng = null');
    expect(html).toContain('nominatim.openstreetmap.org');
  });
});
