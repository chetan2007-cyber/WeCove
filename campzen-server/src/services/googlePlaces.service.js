/**
 * Google Places Discovery Service for Kami
 * Discovers nearby printing, Xerox, and stationery businesses within 1 km.
 * 
 * Rules:
 * - Server-side only (keeps API keys protected)
 * - 1000 meter strict radius limit
 * - Safe error handling (never crashes or interrupts Kami vendor flow)
 * - Minimal field masks to control costs
 * - Safe deduplication against internal Kami vendors
 */

const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

/**
 * Normalize strings for name matching
 */
const normalizeText = (text) => {
  if (!text) return '';
  return text.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
};

/**
 * Fetch nearby printing/Xerox places from Google Places API
 * @param {Object} options
 * @param {number} options.lat - Center latitude
 * @param {number} options.lng - Center longitude
 * @param {number} options.radius - Search radius in meters (max 1000)
 * @param {string} options.query - Optional keyword
 */
const discoverGooglePlaces = async ({ lat, lng, radius = 1000, query = '' }) => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.warn('[GooglePlacesService] Discovery skipped: No GOOGLE_PLACES_API_KEY configured');
    return [];
  }

  const effectiveRadius = Math.min(radius, 1000);

  try {
    // Strategy 1: Places API (New) Text Search - highest relevance for Indian Xerox/print shops
    const textUrl = 'https://places.googleapis.com/v1/places:searchText';
    const textSearchBody = {
      textQuery: query ? `${query} printing xerox` : 'xerox photocopy printing shop',
      maxResultCount: 10,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: effectiveRadius
        }
      }
    };

    const response = await fetch(textUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri,places.nationalPhoneNumber,places.primaryType'
      },
      body: JSON.stringify(textSearchBody)
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.places) && data.places.length > 0) {
        return data.places.map(place => {
          const placeLat = place.location?.latitude;
          const placeLng = place.location?.longitude;
          const distance = (placeLat !== undefined && placeLng !== undefined)
            ? calculateDistanceMeters(lat, lng, placeLat, placeLng)
            : null;

          return {
            placeId: place.id,
            name: place.displayName?.text || 'Print Shop',
            address: place.formattedAddress || '',
            location: { lat: placeLat, lng: placeLng },
            distance,
            rating: place.rating || 0,
            userRatingsTotal: place.userRatingCount || 0,
            businessStatus: 'OPERATIONAL',
            phoneNumber: place.nationalPhoneNumber || null,
            googleMapsUri: place.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${place.id}`,
            primaryType: place.primaryType || 'print_shop',
            isKamiPartner: false,
            orderable: false
          };
        }).filter(p => p.distance !== null && p.distance <= 1000);
      }
    } else {
      const errText = await response.text();
      console.warn(`[GooglePlacesService] Places (New) searchText HTTP ${response.status}: ${errText.substring(0, 300)}`);
    }

    // Strategy 2: Fallback to Places API (New) searchNearby
    const nearbyUrl = 'https://places.googleapis.com/v1/places:searchNearby';
    const nearbyBody = {
      includedTypes: ['stationery_store', 'store'],
      maxResultCount: 10,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: effectiveRadius
        }
      }
    };

    const nearbyRes = await fetch(nearbyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri,places.nationalPhoneNumber,places.primaryType'
      },
      body: JSON.stringify(nearbyBody)
    });

    if (nearbyRes.ok) {
      const nearbyData = await nearbyRes.json();
      if (Array.isArray(nearbyData.places) && nearbyData.places.length > 0) {
        return nearbyData.places.map(place => {
          const placeLat = place.location?.latitude;
          const placeLng = place.location?.longitude;
          const distance = (placeLat !== undefined && placeLng !== undefined)
            ? calculateDistanceMeters(lat, lng, placeLat, placeLng)
            : null;

          return {
            placeId: place.id,
            name: place.displayName?.text || 'Print Shop',
            address: place.formattedAddress || '',
            location: { lat: placeLat, lng: placeLng },
            distance,
            rating: place.rating || 0,
            userRatingsTotal: place.userRatingCount || 0,
            businessStatus: 'OPERATIONAL',
            phoneNumber: place.nationalPhoneNumber || null,
            googleMapsUri: place.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${place.id}`,
            primaryType: place.primaryType || 'print_shop',
            isKamiPartner: false,
            orderable: false
          };
        }).filter(p => p.distance !== null && p.distance <= 1000);
      }
    }

    return [];
  } catch (error) {
    console.warn('[GooglePlacesService] Discovery request captured gracefully:', error.message);
    return [];
  }
};

/**
 * Deduplicate Google Places against internal Kami vendors
 * Priority: Kami vendor is authoritative.
 * Matching rules:
 * 1. Matches vendor.googlePlaceId
 * 2. Proximity < 50m AND name similarity
 */
const deduplicatePlaces = (googlePlaces, kamiVendors) => {
  if (!Array.isArray(googlePlaces) || googlePlaces.length === 0) return [];
  if (!Array.isArray(kamiVendors) || kamiVendors.length === 0) return googlePlaces;

  return googlePlaces.filter(place => {
    // 1. Check explicit Google Place ID match (most authoritative)
    const matchesExplicitId = kamiVendors.some(v => v.googlePlaceId && v.googlePlaceId === place.placeId);
    if (matchesExplicitId) return false;

    // 2. Cautious matching: strictly within 30m AND near-identical normalized name
    const placeNormName = normalizeText(place.name);
    if (!placeNormName) return true;

    const matchesConfidentFuzzy = kamiVendors.some(v => {
      let vLat, vLng;
      if (v.location?.coordinates && Array.isArray(v.location.coordinates)) {
        [vLng, vLat] = v.location.coordinates;
      } else if (v.address?.lat && v.address?.lng) {
        vLat = v.address.lat;
        vLng = v.address.lng;
      }

      if (vLat === undefined || place.location?.lat === undefined) return false;

      const dist = calculateDistanceMeters(vLat, vLng, place.location.lat, place.location.lng);
      if (dist > 30) return false;

      const vNormName = normalizeText(v.name);
      return vNormName && (placeNormName === vNormName || placeNormName.startsWith(vNormName) || vNormName.startsWith(placeNormName));
    });

    return !matchesConfidentFuzzy;
  });
};

module.exports = {
  discoverGooglePlaces,
  deduplicatePlaces
};
