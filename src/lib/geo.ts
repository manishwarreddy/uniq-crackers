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

/**
 * Calculates Great-Circle distance between two coordinates in Kilometers using the Haversine formula
 */
export function calculateDistanceKm(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371.0; // Earth's mean radius in kilometers
  const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const lat1Rad = (coord1.latitude * Math.PI) / 180;
  const lat2Rad = (coord2.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) *
      Math.sin(dLon / 2) *
      Math.cos(lat1Rad) *
      Math.cos(lat2Rad);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Round to two decimal places
  return Math.round(distance * 100) / 100;
}

/**
 * Validates whether the customer's coordinates fall within the configurable delivery radius
 * Default center: Velmala (F6GQ+7PW, Hyderabad)
 */
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

  let deliveryFee = 0;
  if (isDeliverable) {
    deliveryFee = calculateDeliveryFee(distanceKm);
  }

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

/**
 * Calculates delivery fee based on distance slabs
 */
export function calculateDeliveryFee(distanceKm: number): number {
  for (const slab of DELIVERY_PRICING_SLABS) {
    if (distanceKm >= slab.minKm && distanceKm <= slab.maxKm) {
      return slab.fee;
    }
  }
  // Default fee for max boundary
  return 150;
}
