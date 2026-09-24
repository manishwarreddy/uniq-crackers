import { Coordinates, validateDeliveryLocation, calculateDistanceKm, GeofenceCheckResult } from '@/lib/geo';
import { STORE_DEFAULTS } from '@/lib/constants';

export interface AgentRecommendation {
  agentId: string;
  agentName: string;
  distanceToStoreKm: number;
  activeOrdersCount: number;
  score: number; // Lowest score = top recommendation
}

export class DeliveryService {
  /**
   * Evaluates if a customer coordinate is within deliverable area (7 KM from Velmala)
   */
  static checkCustomerEligibility(location: Coordinates): GeofenceCheckResult {
    return validateDeliveryLocation(location);
  }

  /**
   * Distance calculation utility between store and any destination
   */
  static getDistanceToStore(destination: Coordinates): number {
    const storeLocation: Coordinates = {
      latitude: STORE_DEFAULTS.CENTER_LOCATION.LATITUDE,
      longitude: STORE_DEFAULTS.CENTER_LOCATION.LONGITUDE,
    };
    return calculateDistanceKm(storeLocation, destination);
  }
}
