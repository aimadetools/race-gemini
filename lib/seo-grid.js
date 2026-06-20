import crypto from 'crypto';

export function getDirection(lat, lng, baseLat, baseLng) {
    const dy = lat - baseLat;
    // Adjust longitude scale roughly by latitude cosine
    const dx = (lng - baseLng) * Math.cos(baseLat * Math.PI / 180);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI; // -180 to 180 degrees
    
    if (angle >= 67.5 && angle < 112.5) return 'N';
    if (angle >= 22.5 && angle < 67.5) return 'NE';
    if (angle >= -22.5 && angle < 22.5) return 'E';
    if (angle >= -67.5 && angle < -22.5) return 'SE';
    if (angle >= -112.5 && angle < -67.5) return 'S';
    if (angle >= -157.5 && angle < -112.5) return 'SW';
    if (angle >= 112.5 && angle < 157.5) return 'NW';
    return 'W';
}

export function computeLocalSeoGrid(baseCity, baseLat, baseLng, nearbyTowns = [], visibleTowns = []) {
    const cleanBaseCity = baseCity.trim();
    const visibleSet = new Set(visibleTowns.map(t => t.toLowerCase().trim()));
    
    // Classified list for each direction
    const classified = { N: [], NE: [], E: [], SE: [], S: [], SW: [], W: [], NW: [] };
    const unusedTowns = [];

    // Parse and classify nearby towns
    nearbyTowns.forEach(t => {
        let name = '';
        let lat = baseLat;
        let lng = baseLng;

        if (typeof t === 'string') {
            name = t;
            // Generate a deterministic coordinates offset based on the string hash
            const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const rAngle = (hash % 360) * Math.PI / 180;
            const rDist = 0.05 + (hash % 10) * 0.01; // Roughly 3-6 miles distance
            lat = baseLat + Math.sin(rAngle) * rDist;
            lng = baseLng + Math.cos(rAngle) * rDist;
        } else if (t && typeof t === 'object') {
            name = t.name || '';
            lat = t.lat !== undefined ? parseFloat(t.lat) : baseLat;
            lng = t.lng !== undefined ? parseFloat(t.lng) : (t.lon !== undefined ? parseFloat(t.lon) : baseLng);
        }

        if (!name || name.toLowerCase().trim() === cleanBaseCity.toLowerCase()) {
            return;
        }

        const dir = getDirection(lat, lng, baseLat, baseLng);
        const dist = Math.sqrt((lat - baseLat) ** 2 + (lng - baseLng) ** 2);
        classified[dir].push({ name, lat, lng, dist });
    });

    const finalGrid = {};
    const assignedNames = new Set([cleanBaseCity.toLowerCase()]);

    // Sort each classified slot by proximity
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    dirs.forEach(d => {
        classified[d].sort((a, b) => a.dist - b.dist);
    });

    // Pass 1: Assign the closest matching town for each directional category
    dirs.forEach(d => {
        const list = classified[d];
        for (const item of list) {
            if (!assignedNames.has(item.name.toLowerCase())) {
                finalGrid[d] = {
                    name: item.name,
                    lat: item.lat,
                    lng: item.lng,
                    direction: d,
                    dist: item.dist
                };
                assignedNames.add(item.name.toLowerCase());
                break;
            }
        }
    });

    // Pass 2: Gather overflow towns that were not assigned in Pass 1
    dirs.forEach(d => {
        classified[d].forEach(item => {
            if (!assignedNames.has(item.name.toLowerCase())) {
                unusedTowns.push(item);
            }
        });
    });

    // Pass 3: Fill still-empty directional slots from overflow list
    dirs.forEach(d => {
        if (!finalGrid[d] && unusedTowns.length > 0) {
            unusedTowns.sort((a, b) => a.dist - b.dist);
            const town = unusedTowns.shift();
            finalGrid[d] = {
                name: town.name,
                lat: town.lat,
                lng: town.lng,
                direction: d,
                dist: town.dist
            };
            assignedNames.add(town.name.toLowerCase());
        }
    });

    // Pass 4: Fallback to synthetic town labels if still empty (e.g. West Austin)
    const fallbackDirectionLabels = {
        'N': 'North', 'NE': 'Northeast', 'E': 'East', 'SE': 'Southeast',
        'S': 'South', 'SW': 'Southwest', 'W': 'West', 'NW': 'Northwest'
    };

    dirs.forEach(d => {
        if (!finalGrid[d]) {
            const prefix = fallbackDirectionLabels[d];
            const name = `${prefix} ${cleanBaseCity}`;
            const angleMap = { N: 90, NE: 45, E: 0, SE: -45, S: -90, SW: -135, W: 180, NW: 135 };
            const angle = angleMap[d] * Math.PI / 180;
            const rDist = 0.08; // roughly 5-6 miles
            const lat = baseLat + Math.sin(angle) * rDist;
            const lng = baseLng + Math.cos(angle) * rDist;

            finalGrid[d] = {
                name,
                lat,
                lng,
                direction: d,
                dist: rDist
            };
        }
    });

    // Assemble the grid list containing exactly 9 elements in matching order
    // Order: NW, N, NE, W, CTR, E, SW, S, SE
    const layout = ['NW', 'N', 'NE', 'W', 'CTR', 'E', 'SW', 'S', 'SE'];
    
    const grid = layout.map(slot => {
        if (slot === 'CTR') {
            return {
                direction: 'CTR',
                label: 'Center',
                name: cleanBaseCity,
                lat: baseLat,
                lng: baseLng,
                rank: 1, // Assume #1 ranking locally
                searchVolume: 350,
                status: 'visible'
            };
        }

        const data = finalGrid[slot];
        const isVisible = visibleSet.has(data.name.toLowerCase());
        
        // Generate a deterministic search volume
        const hashVal = data.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const searchVolume = 50 + (hashVal % 16) * 10;
        
        // Generate rank details
        let rank = 'Not Ranked';
        if (isVisible) {
            rank = (hashVal % 5) + 2; // Rank #2 to #6
        }

        return {
            direction: slot,
            label: fallbackDirectionLabels[slot] || 'Center',
            name: data.name,
            lat: data.lat,
            lng: data.lng,
            rank: rank,
            searchVolume,
            status: isVisible ? 'visible' : 'opportunity'
        };
    });

    return grid;
}
