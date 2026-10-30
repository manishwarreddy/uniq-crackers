import { STORE_DEFAULTS } from './constants';
import { calculateDistanceKm, getDeliveryPricingForDistance } from './geo';
import { DeliveryLocationState } from '@/types';

export interface KnownLocalityPreset {
  name: string;
  address: string;
  lat: number;
  lng: number;
  pincode: string;
  popular?: boolean;
}

export const KNOWN_LOCALITIES: KnownLocalityPreset[] = [
  {
    name: 'Velmala Central Hub',
    address: 'Near Ramalayam, Velmala, Hyderabad 502300',
    lat: 17.5029,
    lng: 78.2573,
    pincode: '502300',
    popular: true,
  },
  {
    name: 'Tellapur',
    address: 'Tellapur Main Road / My Home Bhooja, Hyderabad 502032',
    lat: 17.468,
    lng: 78.291,
    pincode: '502032',
    popular: true,
  },
  {
    name: 'Kollur',
    address: 'Kollur ORR Township - Exit 2, Hyderabad 502300',
    lat: 17.4852,
    lng: 78.241,
    pincode: '502300',
    popular: true,
  },
  {
    name: 'Mokila',
    address: 'Mokila Green Meadows & Villas, Shankarpally Road 501203',
    lat: 17.472,
    lng: 78.205,
    pincode: '501203',
    popular: true,
  },
  {
    name: 'Osman Nagar',
    address: 'Osman Nagar Lake Road & Gopanpally Road, Hyderabad 500019',
    lat: 17.452,
    lng: 78.285,
    pincode: '500019',
    popular: false,
  },
  {
    name: 'Edulanagulapally',
    address: 'Edulanagulapally Residential Area, Outer Ring Road 502300',
    lat: 17.491,
    lng: 78.232,
    pincode: '502300',
    popular: false,
  },
  {
    name: 'Gopanpally',
    address: 'Gopanpally X Roads, Hyderabad 500019',
    lat: 17.4475,
    lng: 78.3032,
    pincode: '500019',
    popular: false,
  },
  {
    name: 'Nallagandla',
    address: 'Nallagandla / Aparna Sarovar, Hyderabad 500019',
    lat: 17.477,
    lng: 78.312,
    pincode: '500019',
    popular: false,
  },
  {
    name: 'Ameenpur',
    address: 'Ameenpur / Beeramguda Road, Hyderabad 502032',
    lat: 17.525,
    lng: 78.318,
    pincode: '502032',
    popular: false,
  },
];

/**
 * Finds the nearest known local community from coordinates.
 */
export function getNearestKnownLocality(lat: number, lng: number): {
  preset: KnownLocalityPreset;
  distanceKm: number;
} {
  let best = KNOWN_LOCALITIES[0];
  let minDistance = calculateDistanceKm(lat, lng, best.lat, best.lng);

  for (let i = 1; i < KNOWN_LOCALITIES.length; i++) {
    const d = calculateDistanceKm(lat, lng, KNOWN_LOCALITIES[i].lat, KNOWN_LOCALITIES[i].lng);
    if (d < minDistance) {
      minDistance = d;
      best = KNOWN_LOCALITIES[i];
    }
  }

  return { preset: best, distanceKm: minDistance };
}

export interface LiveLocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string;
  locality: string;
  pincode: string;
  distanceKm: number;
  isDeliverable: boolean;
  deliveryFee: number;
  zoneLabel: string;
  eta: string;
  isHighAccuracy: boolean;
}

/**
 * Reverse geocodes coordinates to a human-readable address with high fault-tolerance.
 */
export async function reverseGeocodeLive(
  lat: number,
  lng: number
): Promise<{ address: string; locality: string; pincode: string }> {
  const nearest = getNearestKnownLocality(lat, lng);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'UniqCrackers-DiwaliDelivery/1.0',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const locality =
        addr.suburb ||
        addr.neighbourhood ||
        addr.residential ||
        addr.village ||
        addr.city_district ||
        addr.town ||
        nearest.preset.name;
      const road = addr.road || addr.street || '';
      const city = addr.city || addr.state_district || 'Hyderabad';
      const pincode = addr.postcode || nearest.preset.pincode;

      const formatted = [road, locality, city, pincode].filter(Boolean).join(', ');
      return {
        address: formatted || `${locality}, Hyderabad ${pincode}`,
        locality,
        pincode,
      };
    }
  } catch {
    // Ignore timeout / network failure and use nearest locality snapshot
  }

  return {
    address: `${nearest.preset.name}, Hyderabad ${nearest.preset.pincode}`,
    locality: nearest.preset.name,
    pincode: nearest.preset.pincode,
  };
}

/**
 * High-accuracy geolocation acquisition:
 * 1. Queries fine GPS with enableHighAccuracy: true, maximumAge: 0.
 * 2. If timeout occurs (e.g. laptop without GPS chip), gracefully falls back to coarse network location.
 */
export function acquireLiveGpsCoordinates(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
}> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    // Attempt 1: High accuracy satellite / hardware GPS (maximumAge: 0 forces fresh GPS fix)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 10),
        });
      },
      (err) => {
        // If high accuracy timed out or failed, attempt coarse network fallback
        if (err.code === err.TIMEOUT) {
          navigator.geolocation.getCurrentPosition(
            (fallbackPos) => {
              resolve({
                latitude: fallbackPos.coords.latitude,
                longitude: fallbackPos.coords.longitude,
                accuracy: Math.round(fallbackPos.coords.accuracy || 50),
              });
            },
            (fallbackErr) => {
              reject(new Error(getFriendlyGpsErrorMessage(fallbackErr)));
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
          );
        } else {
          reject(new Error(getFriendlyGpsErrorMessage(err)));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  });
}

function getFriendlyGpsErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return 'Location access was denied. Please allow location permissions in your browser or select your locality below.';
    case err.POSITION_UNAVAILABLE:
      return 'Location signal currently unavailable. Please select your locality below.';
    case err.TIMEOUT:
      return 'GPS request timed out. Please check your network or choose a locality from the list.';
    default:
      return err.message || 'Could not acquire GPS position.';
  }
}

/**
 * Full live location resolver:
 * Acquires GPS coordinates, reverse geocodes the street address,
 * computes distance from store hub, and calculates pricing.
 */
export async function getLiveDeliveryLocation(): Promise<LiveLocationResult> {
  const coords = await acquireLiveGpsCoordinates();

  const storeLat = STORE_DEFAULTS.CENTER_LOCATION.LATITUDE;
  const storeLng = STORE_DEFAULTS.CENTER_LOCATION.LONGITUDE;

  const distanceKm = calculateDistanceKm(storeLat, storeLng, coords.latitude, coords.longitude);
  const pricing = getDeliveryPricingForDistance(distanceKm);
  const geoInfo = await reverseGeocodeLive(coords.latitude, coords.longitude);

  let eta = '30-45 mins';
  if (distanceKm <= 2) eta = '15-25 mins';
  else if (distanceKm <= 4) eta = '25-35 mins';
  else if (distanceKm <= 7) eta = '35-45 mins';
  else eta = 'Beyond 7 KM';

  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    address: geoInfo.address,
    locality: geoInfo.locality,
    pincode: geoInfo.pincode,
    distanceKm,
    isDeliverable: pricing.isDeliverable,
    deliveryFee: pricing.fee,
    zoneLabel: pricing.label,
    eta,
    isHighAccuracy: coords.accuracy <= 100,
  };
}

export interface LocationSearchResult {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  pincode: string;
  distanceKm: number;
  isDeliverable: boolean;
  deliveryFee: number;
  zoneLabel: string;
}

/**
 * Searches locations across preset communities and OpenStreetMap.
 */
export async function searchDeliveryLocations(query: string): Promise<LocationSearchResult[]> {
  const cleanQuery = query.trim().toLowerCase();
  const storeLat = STORE_DEFAULTS.CENTER_LOCATION.LATITUDE;
  const storeLng = STORE_DEFAULTS.CENTER_LOCATION.LONGITUDE;

  const results: LocationSearchResult[] = [];
  const seenKeys = new Set<string>();

  // 1. Preset localities match
  for (const preset of KNOWN_LOCALITIES) {
    if (
      !cleanQuery ||
      preset.name.toLowerCase().includes(cleanQuery) ||
      preset.address.toLowerCase().includes(cleanQuery) ||
      preset.pincode.includes(cleanQuery)
    ) {
      const distanceKm = calculateDistanceKm(storeLat, storeLng, preset.lat, preset.lng);
      const pricing = getDeliveryPricingForDistance(distanceKm);
      const key = `${preset.lat.toFixed(4)},${preset.lng.toFixed(4)}`;
      seenKeys.add(key);

      results.push({
        name: preset.name,
        address: preset.address,
        latitude: preset.lat,
        longitude: preset.lng,
        pincode: preset.pincode,
        distanceKm,
        isDeliverable: pricing.isDeliverable,
        deliveryFee: pricing.fee,
        zoneLabel: pricing.label,
      });
    }
  }

  // 2. OpenStreetMap Nominatim search for custom queries
  if (cleanQuery.length >= 2) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      // Search near Hyderabad region
      const searchUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        `${query}, Hyderabad, Telangana`
      )}&countrycodes=in&viewbox=78.10,17.65,78.45,17.35&bounded=0&limit=5`;

      const res = await fetch(searchUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'UniqCrackers-DiwaliDelivery/1.0',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        for (const item of data) {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            const distanceKm = calculateDistanceKm(storeLat, storeLng, lat, lng);
            const pricing = getDeliveryPricingForDistance(distanceKm);
            const name = item.name || item.display_name.split(',')[0];
            results.push({
              name,
              address: item.display_name,
              latitude: lat,
              longitude: lng,
              pincode: item.address?.postcode || '502300',
              distanceKm,
              isDeliverable: pricing.isDeliverable,
              deliveryFee: pricing.fee,
              zoneLabel: pricing.label,
            });
          }
        }
      }
    } catch {
      // Ignore network search errors; presets already populated
    }
  }

  return results;
}

/**
 * Calculates delivery state for specified coordinates.
 */
export async function calculateLocationDetails(
  lat: number,
  lng: number,
  addressOverride?: string,
  pincodeOverride?: string
): Promise<DeliveryLocationState> {
  const storeLat = STORE_DEFAULTS.CENTER_LOCATION.LATITUDE;
  const storeLng = STORE_DEFAULTS.CENTER_LOCATION.LONGITUDE;
  const distanceKm = calculateDistanceKm(storeLat, storeLng, lat, lng);
  const pricing = getDeliveryPricingForDistance(distanceKm);

  let address = addressOverride;
  let pincode = pincodeOverride || '502300';

  if (!address) {
    const geo = await reverseGeocodeLive(lat, lng);
    address = geo.address;
    pincode = geo.pincode;
  }

  return {
    address,
    latitude: lat,
    longitude: lng,
    pincode,
    distanceKm,
    isDeliverable: pricing.isDeliverable,
    deliveryFee: pricing.fee,
    zoneLabel: pricing.label,
    confirmed: true,
  };
}
