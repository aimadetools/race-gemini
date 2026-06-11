export function renderMapSection(businessName, town, primaryColor, serviceRadius, lat, lng) {
  const radiusMiles = serviceRadius || 15;
  const mapLat = lat !== null && lat !== undefined ? lat : 'null';
  const mapLng = lng !== null && lng !== undefined ? lng : 'null';
  
  return `
<!-- Service Area Map Section -->
<section class="service-area-map-section" id="service-area-map-section">
  <style>
    .service-area-map-section {
      padding: 5rem 0;
      background-color: #ffffff;
      border-top: 1px solid var(--border-color, #e5e7eb);
      border-bottom: 1px solid var(--border-color, #e5e7eb);
      text-align: center;
    }
    .service-area-map-section h2 {
      font-size: 2.25rem;
      color: #111827;
      margin-top: 0;
      margin-bottom: 1rem;
    }
    .service-area-map-section p {
      font-size: 1.1rem;
      color: var(--text-muted, #4b5563);
      max-width: 600px;
      margin: 0 auto 2.5rem auto;
    }
    .map-wrapper {
      max-width: 900px;
      margin: 0 auto;
      padding: 0 1.5rem;
      position: relative;
    }
    .map-container {
      height: 400px;
      border-radius: 16px;
      border: 1px solid var(--border-color, #e5e7eb);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
      overflow: hidden;
      background-color: #f3f4f6;
      z-index: 1;
    }
  </style>
  <div class="container">
    <h2>Our Service Area</h2>
    <p>We proudly serve ${town} and all surrounding areas within a ${radiusMiles} mile radius. Call us today for prompt, reliable assistance.</p>
    <div class="map-wrapper">
      <div id="leaflet-service-map" class="map-container"></div>
    </div>
  </div>
  
  <!-- Leaflet CSS & JS -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
  
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const lat = ${mapLat};
      const lng = ${mapLng};
      const radiusMiles = ${radiusMiles};
      const primaryColor = '${primaryColor || '#007bff'}';
      const townName = '${town.replace(/'/g, "\\'")}';
      const businessName = '${businessName.replace(/'/g, "\\'")}';
      
      const radiusMeters = radiusMiles * 1609.34;
      
      function initMap(mapLat, mapLng) {
        try {
          const map = L.map('leaflet-service-map').setView([mapLat, mapLng], 11);
          
          L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
          }).addTo(map);
          
          const circle = L.circle([mapLat, mapLng], {
            color: primaryColor,
            fillColor: primaryColor,
            fillOpacity: 0.15,
            radius: radiusMeters,
            weight: 2
          }).addTo(map);
          
          const marker = L.marker([mapLat, mapLng]).addTo(map);
          marker.bindPopup('<b>' + businessName + '</b><br>Serving ' + townName + ' and surrounding areas.').openPopup();
          
          map.fitBounds(circle.getBounds());
        } catch (e) {
          console.error('Leaflet initialization failed:', e);
        }
      }
      
      if (lat !== null && lng !== null) {
        initMap(lat, lng);
      } else {
        // Dynamic geocoding fallback on client side
        fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(townName))
          .then(response => response.json())
          .then(data => {
            if (data && data.length > 0) {
              const fetchedLat = parseFloat(data[0].lat);
              const fetchedLng = parseFloat(data[0].lon);
              initMap(fetchedLat, fetchedLng);
            } else {
              initMap(37.0902, -95.7129);
            }
          })
          .catch(error => {
            console.error('Client geocoding error:', error);
            initMap(37.0902, -95.7129);
          });
      }
    });
  </script>
</section>
  `.trim();
}
