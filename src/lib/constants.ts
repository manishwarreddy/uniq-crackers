/**
 * Uniq Crackers Master Application Constants
 */

export const STORE_DEFAULTS = {
  NAME: 'Uniq Crackers',
  CENTER_LOCATION: {
    // F6GQ+7PW, Velmala, Hyderabad, Telangana 502300
    LATITUDE: 17.502900,
    LONGITUDE: 78.257300,
    PLUS_CODE: 'F6GQ+7PW',
    ADDRESS: 'F6GQ+7PW, Velmala, Hyderabad, Telangana 502300',
    PINCODE: '502300',
  },
  DEFAULT_RADIUS_KM: 7.0,
  MIN_ORDER_VALUE: 500, // in INR
  DEFAULT_FREE_DELIVERY_THRESHOLD: 3000,
  SUPPORT_PHONE: '+91 90000 00000',
  SUPPORT_EMAIL: 'support@uniqcrackers.com',
};

export const DELIVERY_PRICING_SLABS = [
  { minKm: 0.0, maxKm: 2.0, fee: 40, label: '0 - 2 km (Local Velmala)' },
  { minKm: 2.0, maxKm: 4.0, fee: 70, label: '2 - 4 km (Outer Velmala)' },
  { minKm: 4.0, maxKm: 7.0, fee: 120, label: '4 - 7 km (Extended Boundary)' },
];

export const ORDER_STATUS_DETAILS = {
  PLACED: { label: 'Order Placed', color: 'blue', description: 'Customer initiated the order' },
  CONFIRMED: { label: 'Confirmed', color: 'indigo', description: 'Inventory reserved & confirmed' },
  PREPARING: { label: 'Preparing', color: 'yellow', description: 'Items being packed' },
  READY_FOR_DELIVERY: { label: 'Ready for Dispatch', color: 'purple', description: 'Packed and waiting for agent' },
  DELIVERY_AGENT_ASSIGNED: { label: 'Agent Assigned', color: 'amber', description: 'Delivery agent assigned' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'orange', description: 'Live tracking active' },
  DELIVERED: { label: 'Delivered', color: 'green', description: 'Delivery OTP verified & completed' },
  CANCELLED: { label: 'Cancelled', color: 'red', description: 'Order cancelled, inventory released' },
  PAYMENT_FAILED: { label: 'Payment Failed', color: 'rose', description: 'Payment attempt was not completed' },
  DELIVERY_FAILED: { label: 'Delivery Failed', color: 'red', description: 'Customer unreachable or returned' },
} as const;

export const INVENTORY_RESERVATION_TTL_MINUTES = 15;
