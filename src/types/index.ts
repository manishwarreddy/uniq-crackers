export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'STAFF'
  | 'DELIVERY_AGENT'
  | 'CUSTOMER'
  | 'GUEST';

export type OrderStatus =
  | 'PENDING_REVIEW'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'PLACED'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_DELIVERY'
  | 'READY_FOR_DISPATCH'
  | 'DELIVERY_AGENT_ASSIGNED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'PAYMENT_FAILED'
  | 'DELIVERY_FAILED';

export const REJECTION_REASONS = [
  'UPI payment not received / Invalid UTR',
  'Invalid phone number',
  'Incorrect delivery address',
  'Duplicate order',
  'Customer did not confirm the order',
  'Suspicious order',
  'Other',
] as const;

export type RejectionReason = (typeof REJECTION_REASONS)[number];

export type PaymentMethod = 'COD' | 'UPI_QR' | 'UPI_DIRECT' | 'RAZORPAY';

export type PaymentStatus =
  | 'PENDING'
  | 'PENDING_COD'
  | 'AWAITING_VERIFICATION'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'PAID'
  | 'REFUND_PENDING'
  | 'REFUND_INITIATED'
  | 'REFUNDED'
  | 'FAILED'
  | 'PAYMENT_FAILED'
  | 'REJECTED'
  | 'AMOUNT_MISMATCH';

export interface OrderStatusHistoryEntry {
  status: OrderStatus;
  note?: string;
  changedBy: string;
  timestamp: string;
}

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
  PENDING_REVIEW: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'READY_FOR_DELIVERY', 'READY_FOR_DISPATCH', 'DELIVERY_AGENT_ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  REJECTED: [], // Terminal state
  PLACED: ['ACCEPTED', 'REJECTED', 'CONFIRMED', 'CANCELLED', 'PAYMENT_FAILED'],
  CONFIRMED: ['PREPARING', 'READY_FOR_DELIVERY', 'READY_FOR_DISPATCH', 'DELIVERY_AGENT_ASSIGNED', 'CANCELLED'],
  PREPARING: ['READY_FOR_DELIVERY', 'READY_FOR_DISPATCH', 'ACCEPTED', 'DELIVERY_AGENT_ASSIGNED', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  READY_FOR_DELIVERY: ['OUT_FOR_DELIVERY', 'PREPARING', 'DELIVERY_AGENT_ASSIGNED', 'DELIVERED', 'CANCELLED'],
  READY_FOR_DISPATCH: ['OUT_FOR_DELIVERY', 'PREPARING', 'DELIVERY_AGENT_ASSIGNED', 'DELIVERED', 'CANCELLED'],
  DELIVERY_AGENT_ASSIGNED: ['OUT_FOR_DELIVERY', 'READY_FOR_DELIVERY', 'READY_FOR_DISPATCH', 'DELIVERED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'DELIVERY_FAILED', 'READY_FOR_DELIVERY', 'READY_FOR_DISPATCH', 'CANCELLED'],
  DELIVERED: [], // Terminal state
  CANCELLED: [], // Terminal state
  PAYMENT_FAILED: ['PLACED', 'CANCELLED'],
  DELIVERY_FAILED: ['READY_FOR_DELIVERY', 'READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY', 'DELIVERY_AGENT_ASSIGNED', 'CANCELLED'],
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
  category: 'sparklers' | 'skyshots' | 'flowerpots' | 'chakkars' | 'hampers' | 'electronic' | 'sound' | 'rockets' | 'novelty' | string;
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
  isActive?: boolean;
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
  stock?: number;
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
  confirmed?: boolean;
}
