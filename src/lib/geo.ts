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
export function calculateDeliveryFee(distanceKm: number): number {
  for (const slab of DELIVERY_PRICING_SLABS) {
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
export function getDeliveryPricingForDistance(distanceKm: number): PricingResult {
  const maxRadius = STORE_DEFAULTS.DEFAULT_RADIUS_KM;
  if (distanceKm > maxRadius) {
    return {
      isDeliverable: false,
      fee: 0,
      label: `Outside 7 km delivery zone (${distanceKm.toFixed(2)} km from Velmala)`,
    };
  }
  for (const slab of DELIVERY_PRICING_SLABS) {
    if (distanceKm >= slab.minKm && distanceKm <= slab.maxKm) {
      return {
        isDeliverable: true,
        fee: slab.fee,
        label: slab.label,
      };
    }
  }
  return { isDeliverable: true, fee: 40, label: '0 - 2 km (Local Velmala)' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Full geofence validation (used by the API route)
// ─────────────────────────────────────────────────────────────────────────────
export function validateDeliveryLocation(
  customerLocation: Coordinates,
  customRadiusKm?: number,
  customStoreLocation?: Coordinates
): GeofenceCheckResult {
  const storeLocation: Coordinates = customStoreLocation || {
    latitude: env.NEXT_PUBLIC_STORE_LAT || STORE_DEFAULTS.CENTER_LOCATION.LATITUDE,
    longitude: env.NEXT_PUBLIC_STORE_LNG || STORE_DEFAULTS.CENTER_LOCATION.LONGITUDE,
  };

  const maxRadiusKm =
    customRadiusKm ??
    env.NEXT_PUBLIC_DEFAULT_DELIVERY_RADIUS_KM ??
    STORE_DEFAULTS.DEFAULT_RADIUS_KM;

  const distanceKm = calculateDistanceKm(storeLocation, customerLocation);
  const isDeliverable = distanceKm <= maxRadiusKm;
  const deliveryFee = isDeliverable ? calculateDeliveryFee(distanceKm) : 0;

  return {
    isDeliverable,
    distanceKm,
    maxRadiusKm,
    deliveryFee,
    storeLocation,
    message: isDeliverable
      ? `Location is within our ${maxRadiusKm} km delivery zone (${distanceKm} km from Velmala store).`
      : `We don't deliver to your location (${distanceKm} km away). Our delivery service is limited to ${maxRadiusKm} km from Velmala.`,
  };
}
