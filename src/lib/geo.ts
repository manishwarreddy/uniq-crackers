import { STORE_DEFAULTS, DELIVERY_PRICING_SLABS } from './constants';
import { env } from './env';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeofenceCheckResult {
  isDeliverable: boolean;
  distanceKm: number;
  maxRadiusKm: number;
  deliveryFee: number;
  storeLocation: Coordinates;
  message: string;
}

export interface PricingResult {
  isDeliverable: boolean;
  fee: number;
  label: string;
}

/**
 * Standard rejection message when customer location is outside permitted service area.
 */
export const OUT_OF_SERVICE_MESSAGE = "We don't deliver to your location";

/**
 * Strict Coordinate Validator: validates bounds and finite number ranges
 */
export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) return false;
  if (isNaN(numLat) || isNaN(numLng)) return false;
  if (numLat < -90 || numLat > 90) return false;
  if (numLng < -180 || numLng > 180) return false;
  return true;
}

/**
 * Retrieves the configurable store location from environment or defaults
 */
export function getStoreLocation(): Coordinates {
  const storeLat =
    (typeof process !== 'undefined' && process.env?.STORE_LAT ? parseFloat(process.env.STORE_LAT) : null) ??
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_STORE_LAT ? parseFloat(process.env.NEXT_PUBLIC_STORE_LAT) : null) ??
    env.NEXT_PUBLIC_STORE_LAT ??
    STORE_DEFAULTS.CENTER_LOCATION.LATITUDE;

  const storeLng =
    (typeof process !== 'undefined' && process.env?.STORE_LNG ? parseFloat(process.env.STORE_LNG) : null) ??
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_STORE_LNG ? parseFloat(process.env.NEXT_PUBLIC_STORE_LNG) : null) ??
    env.NEXT_PUBLIC_STORE_LNG ??
    STORE_DEFAULTS.CENTER_LOCATION.LONGITUDE;

  return {
    latitude: storeLat,
    longitude: storeLng,
  };
}

/**
 * Retrieves the configurable delivery radius in kilometers
 */
export function getDeliveryRadiusKm(): number {
  const radius =
    (typeof process !== 'undefined' && process.env?.DELIVERY_RADIUS_KM ? parseFloat(process.env.DELIVERY_RADIUS_KM) : null) ??
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_DEFAULT_DELIVERY_RADIUS_KM ? parseFloat(process.env.NEXT_PUBLIC_DEFAULT_DELIVERY_RADIUS_KM) : null) ??
    env.NEXT_PUBLIC_DEFAULT_DELIVERY_RADIUS_KM ??
    STORE_DEFAULTS.DEFAULT_RADIUS_KM ??
    7.0;

  return radius;
}

// ─────────────────────────────────────────────────────────────────────────────
// Haversine Distance — internal scalar implementation
// ─────────────────────────────────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371.0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public overloads — supports both (Coordinates, Coordinates) and (lat, lng, lat, lng)
// ─────────────────────────────────────────────────────────────────────────────
export function calculateDistanceKm(coord1: Coordinates, coord2: Coordinates): number;
export function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number;
export function calculateDistanceKm(
  coord1OrLat1: Coordinates | number,
  coord2OrLng1: Coordinates | number,
  lat2?: number,
  lng2?: number
): number {
  if (typeof coord1OrLat1 === 'number') {
    return haversineKm(
      coord1OrLat1,
      coord2OrLng1 as number,
      lat2 as number,
      lng2 as number
    );
  }
  const c1 = coord1OrLat1 as Coordinates;
  const c2 = coord2OrLng1 as Coordinates;
  return haversineKm(c1.latitude, c1.longitude, c2.latitude, c2.longitude);
}

// ─────────────────────────────────────────────────────────────────────────────
// Delivery fee slab lookup
// ─────────────────────────────────────────────────────────────────────────────
export function calculateDeliveryFee(
  distanceKm: number,
  customSlabs?: Array<{ minKm: number; maxKm: number; fee: number; label: string }>
): number {
  const slabs = customSlabs && customSlabs.length > 0 ? customSlabs : DELIVERY_PRICING_SLABS;
  for (const slab of slabs) {
    if (distanceKm >= slab.minKm && distanceKm <= slab.maxKm) {
      return slab.fee;
    }
  }
  return 150; // fallback for edge of boundary
}

/**
 * Returns deliverability status and slab-based pricing for a given distance.
 * Used client-side by CartContext and LocationSelectorModal.
 */
export function getDeliveryPricingForDistance(
  distanceKm: number,
  customSlabs?: Array<{ minKm: number; maxKm: number; fee: number; label: string }>,
  maxRadius = getDeliveryRadiusKm()
): PricingResult {
  if (distanceKm > maxRadius) {
    return {
      isDeliverable: false,
      fee: 0,
      label: OUT_OF_SERVICE_MESSAGE,
    };
  }
  const slabs = customSlabs && customSlabs.length > 0 ? customSlabs : DELIVERY_PRICING_SLABS;
  for (const slab of slabs) {
    if (distanceKm >= slab.minKm && distanceKm <= slab.maxKm) {
      return {
        isDeliverable: true,
        fee: slab.fee,
        label: slab.label,
      };
    }
  }
  return { isDeliverable: true, fee: slabs[0]?.fee ?? 10, label: slabs[0]?.label ?? '0 - 2 km (Local Velmala)' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Full geofence validation (used by the API route and server validation)
// ─────────────────────────────────────────────────────────────────────────────
export function validateDeliveryLocation(
  customerLocation: Coordinates,
  customRadiusKm?: number,
  customStoreLocation?: Coordinates,
  customSlabs?: Array<{ minKm: number; maxKm: number; fee: number; label: string }>
): GeofenceCheckResult {
  const storeLocation: Coordinates = customStoreLocation || getStoreLocation();
  const maxRadiusKm = customRadiusKm ?? getDeliveryRadiusKm();

  const distanceKm = calculateDistanceKm(storeLocation, customerLocation);
  const isDeliverable = distanceKm <= maxRadiusKm;
  const deliveryFee = isDeliverable ? calculateDeliveryFee(distanceKm, customSlabs) : 0;

  return {
    isDeliverable,
    distanceKm,
    maxRadiusKm,
    deliveryFee,
    storeLocation,
    message: isDeliverable
      ? `Location is within our ${maxRadiusKm} km delivery zone (${distanceKm} km from store).`
      : OUT_OF_SERVICE_MESSAGE,
  };
}
