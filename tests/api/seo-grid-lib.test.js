import { getDirection, computeLocalSeoGrid } from '../../lib/seo-grid.js';

describe('Local SEO Grid Library Logic', () => {
  describe('getDirection', () => {
    const baseLat = 30.0;
    const baseLng = -90.0;

    test('should classify North correctly', () => {
      expect(getDirection(30.1, -90.0, baseLat, baseLng)).toBe('N');
    });

    test('should classify Northeast correctly', () => {
      expect(getDirection(30.1, -89.9, baseLat, baseLng)).toBe('NE');
    });

    test('should classify East correctly', () => {
      expect(getDirection(30.0, -89.9, baseLat, baseLng)).toBe('E');
    });

    test('should classify Southeast correctly', () => {
      expect(getDirection(29.9, -89.9, baseLat, baseLng)).toBe('SE');
    });

    test('should classify South correctly', () => {
      expect(getDirection(29.9, -90.0, baseLat, baseLng)).toBe('S');
    });

    test('should classify Southwest correctly', () => {
      expect(getDirection(29.9, -90.1, baseLat, baseLng)).toBe('SW');
    });

    test('should classify Northwest correctly', () => {
      expect(getDirection(30.1, -90.1, baseLat, baseLng)).toBe('NW');
    });

    test('should classify West correctly', () => {
      // Direct west dy=0, dx=-0.1, angle=180
      expect(getDirection(30.0, -90.1, baseLat, baseLng)).toBe('W');
    });
  });

  describe('computeLocalSeoGrid', () => {
    const baseCity = 'Austin';
    const baseLat = 30.2672;
    const baseLng = -97.7431;

    test('should compute a grid layout of exactly 9 cells including Center', () => {
      const nearbyTowns = [
        { name: 'Round Rock', lat: 30.5083, lng: -97.6789 },
        { name: 'Pflugerville', lat: 30.4548, lng: -97.6223 }
      ];
      const visibleTowns = ['Round Rock'];

      const grid = computeLocalSeoGrid(baseCity, baseLat, baseLng, nearbyTowns, visibleTowns);

      expect(grid).toHaveLength(9);

      // Verify the Center cell
      const center = grid.find(c => c.direction === 'CTR');
      expect(center).toBeDefined();
      expect(center.name).toBe('Austin');
      expect(center.status).toBe('visible');

      // Verify the visible cell
      const roundRock = grid.find(c => c.name === 'Round Rock');
      expect(roundRock).toBeDefined();
      expect(roundRock.status).toBe('visible');
      expect(roundRock.rank).not.toBe('Not Ranked');

      // Verify Pflugerville is marked as opportunity
      const pflugerville = grid.find(c => c.name === 'Pflugerville');
      expect(pflugerville).toBeDefined();
      expect(pflugerville.status).toBe('opportunity');
      expect(pflugerville.rank).toBe('Not Ranked');
    });

    test('should support string values in nearbyTowns with fallback coords', () => {
      const nearbyTowns = ['Georgetown', 'Kyle'];
      const grid = computeLocalSeoGrid(baseCity, baseLat, baseLng, nearbyTowns, []);
      expect(grid).toHaveLength(9);
      const georgetown = grid.find(c => c.name === 'Georgetown');
      expect(georgetown).toBeDefined();
    });

    test('should use direction fallbacks if there are not enough nearby towns', () => {
      const grid = computeLocalSeoGrid(baseCity, baseLat, baseLng, [], []);
      expect(grid).toHaveLength(9);
      // Fallback names should be like 'North Austin', 'South Austin', etc.
      const north = grid.find(c => c.direction === 'N');
      expect(north.name).toBe('North Austin');
      expect(north.status).toBe('opportunity');
    });
  });
});
