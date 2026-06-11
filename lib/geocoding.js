import { logError } from './logger.js';

export async function geocodeAddress(address) {
  if (!address || typeof address !== 'string' || address.trim() === '') {
    return null;
  }

  const trimmedAddress = address.trim();

  // Try OpenCage Geocoding API
  const openCageApiKey = process.env.OPENCAGE_API_KEY;
  if (openCageApiKey) {
    try {
      const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(trimmedAddress)}&key=${openCageApiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const { lat, lng } = data.results[0].geometry;
          return { lat, lng };
        }
      }
    } catch (err) {
      await logError(err, `OpenCage geocoding failed for: ${trimmedAddress}`);
    }
  }

  // Fallback to Geoapify Geocoding API
  const geoapifyApiKey = process.env.GEOAPIFY_API_KEY;
  if (geoapifyApiKey) {
    try {
      const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(trimmedAddress)}&apiKey=${geoapifyApiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          const properties = data.features[0].properties;
          if (properties && properties.lat !== undefined && properties.lon !== undefined) {
            return { lat: properties.lat, lng: properties.lon };
          }
          const geometry = data.features[0].geometry;
          if (geometry && geometry.coordinates) {
            const [lng, lat] = geometry.coordinates;
            return { lat, lng };
          }
        }
      }
    } catch (err) {
      await logError(err, `Geoapify geocoding fallback failed for: ${trimmedAddress}`);
    }
  }

  return null;
}
