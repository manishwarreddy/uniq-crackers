export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'STAFF'
  | 'DELIVERY_AGENT'
  | 'CUSTOMER'
  | 'GUEST';

export type OrderStatus =
  | 'PLACED'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_DELIVERY'
  | 'DELIVERY_AGENT_ASSIGNED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'PAYMENT_FAILED'
  | 'DELIVERY_FAILED';

export type PaymentMethod = 'COD' | 'UPI_DIRECT' | 'RAZORPAY';

export type PaymentStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'REFUNDED';

export type AgentDutyStatus =
  | 'OFFLINE'
  | 'ONLINE'
  | 'ON_BREAK'
  | 'ON_DELIVERY';

export interface UserSession {
  userId: string;
  phone?: string | null;
  name: string;
  role: Role;
  isGuest?: boolean;
}

/**
 * Valid state transitions for the Order state machine
 */
export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ['CONFIRMED', 'CANCELLED', 'PAYMENT_FAILED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY_FOR_DELIVERY', 'CANCELLED'],
  READY_FOR_DELIVERY: ['DELIVERY_AGENT_ASSIGNED', 'CANCELLED'],
  DELIVERY_AGENT_ASSIGNED: ['OUT_FOR_DELIVERY', 'READY_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'DELIVERY_FAILED', 'CANCELLED'],
  DELIVERED: [], // Terminal state
  CANCELLED: [], // Terminal state
  PAYMENT_FAILED: ['PLACED', 'CANCELLED'],
  DELIVERY_FAILED: ['READY_FOR_DELIVERY', 'CANCELLED'],
};

export interface GpsLocationPing {
  sessionId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  timestamp: string;
}

export interface GeofenceCheckPayload {
  latitude: number;
  longitude: number;
}

export interface ProductVariantOption {
  id: string;
  name: string;
  sku: string;
  price: number;
  originalPrice: number;
  boxQuantity: string;
  stock: number;
}

export interface ProductItem {
  id: string;
  name: string;
  slug: string;
  category: 'sparklers' | 'skyshots' | 'flowerpots' | 'chakkars' | 'hampers' | 'electronic';
  categoryLabel: string;
  description: string;
  image: string;
  imageAlt?: string;
  rating: number;
  reviewsCount: number;
  isGreenCertified: boolean;
  soundDecibel: string;
  smokeLevel: string;
  durationSeconds?: number;
  heightFeet?: number;
  variants: ProductVariantOption[];
  featured?: boolean;
  bestSeller?: boolean;
  badgeText?: string;
  safetyTips: string[];
}

export interface CartItem {
  productId: string;
  variantId: string;
  name: string;
  variantName: string;
  boxQuantity: string;
  price: number;
  originalPrice: number;
  image: string;
  quantity: number;
}

export interface DeliveryLocationState {
  address: string;
  latitude: number;
  longitude: number;
  pincode: string;
  distanceKm: number;
  isDeliverable: boolean;
  deliveryFee: number;
  zoneLabel: string;
}
