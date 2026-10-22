/**
 * ============================================================================
 * ORDER SERVICE (Data-Access Layer)
 * ============================================================================
 * This service handles Order Management operations for Uniq Crackers,
 * including Order Approval, Rejection with structured reasons, filtering,
 * and customer order history with server-verified authorization.
 * ============================================================================
 */

import { OrderStatus, PaymentMethod, REJECTION_REASONS, RejectionReason } from '@/types';

export { REJECTION_REASONS };
export type { RejectionReason };

export interface OrderItem {
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  boxQuantity?: string;
  price: number;
  originalPrice?: number;
  image?: string;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  distanceKm: number;
  items: OrderItem[];
  subtotal?: number;
  deliveryFee?: number;
  discountAmount?: number;
  totalAmount: number;
  paymentMethod: PaymentMethod | string;
  paymentStatus?: string;
  status: OrderStatus;
  deliveryOtp?: string;
  upiUtr?: string;
  rejectionReason?: RejectionReason | string;
  rejectionNote?: string;
  rejectedAt?: string;
  acceptedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  refundStatus?: string;
  refundInitiatedAt?: string;
  statusHistory?: Array<{
    status: OrderStatus;
    note?: string;
    changedBy: string;
    timestamp: string;
  }>;
  assignedAgentId?: string;
  assignedAgentName?: string;
  assignedAgentPhone?: string;
  createdAt: string;
  updatedAt?: string;
}

const STORAGE_KEY = 'uniq_crackers_customer_orders_v2';

/**
 * Clean mock orders array (empty by default; no customer PII stored in source code)
 */
export const INITIAL_MOCK_ORDERS: Order[] = [];

/**
 * Reads locally saved customer orders from this device's storage.
 */
function getStoredOrders(): Order[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem('uniq_customer_orders') || localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[ORDER SERVICE] Error reading localStorage:', e);
  }

  return [];
}

/**
 * Saves customer orders to local storage for persistence across reloads on this device.
 */
function saveOrdersToStorage(orders: Order[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('uniq_customer_orders', JSON.stringify(orders));
  } catch (e) {
    console.warn('[ORDER SERVICE] Error saving to localStorage:', e);
  }
}

/**
 * Sync status to API backend
 */
async function syncStatusToBackend(
  orderNumber: string,
  status: OrderStatus,
  details?: { rejectionReason?: string; rejectionNote?: string }
) {
  try {
    await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber,
        status,
        rejectionReason: details?.rejectionReason,
        rejectionNote: details?.rejectionNote,
      }),
    });
  } catch {
    // Graceful tolerance
  }
}

/**
 * Fetch orders accessible to current viewer:
 * - Admin receives store orders
 * - Delivery agent receives assigned orders
 * - Customer receives their own verified orders
 * - Anonymous callers receive empty list (401/403)
 */
export async function getOrders(): Promise<Order[]> {
  try {
    if (typeof window !== 'undefined') {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const payload = await res.json();
        if (payload.success && Array.isArray(payload.data)) {
          return payload.data as Order[];
        }
      }
    }
  } catch {
    // fallback
  }

  return getStoredOrders();
}

/**
 * Fetch a single order by ID or Order Number with cryptographic access token / session
 */
export async function getOrderById(orderIdOrNumber: string): Promise<Order | null> {
  const clean = orderIdOrNumber.trim().toUpperCase();
  if (!clean) return null;

  // 1. Try backend API first with order token or session
  try {
    if (typeof window !== 'undefined') {
      let orderToken = '';
      try {
        const rawTokens = localStorage.getItem('uniq_order_tokens');
        if (rawTokens) {
          const parsed = JSON.parse(rawTokens);
          orderToken = parsed[clean] || '';
        }
      } catch {}

      const headers: Record<string, string> = {};
      if (orderToken) {
        headers['x-order-token'] = orderToken;
      }

      const res = await fetch(`/api/orders?orderNumber=${encodeURIComponent(clean)}`, {
        headers,
      });

      if (res.ok) {
        const payload = await res.json();
        if (payload.success && payload.data) {
          return payload.data as Order;
        }
      }
    }
  } catch {}

  // 2. Check local orders saved on this specific browser device
  const localOrders = getStoredOrders();
  const match = localOrders.find(
    (o) => o.id === orderIdOrNumber || o.orderNumber.toUpperCase() === clean
  );
  if (match) return match;

  return null;
}

/**
 * Accept a pending order (Administrator action)
 */
export async function acceptOrder(
  orderIdOrNumber: string
): Promise<{ success: boolean; order?: Order; message?: string }> {
  const clean = orderIdOrNumber.trim().toUpperCase();

  try {
    const res = await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber: clean,
        action: 'ACCEPT_ORDER',
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      const updatedOrder = data.data as Order;
      const orders = getStoredOrders();
      const idx = orders.findIndex((o) => o.orderNumber.toUpperCase() === clean);
      if (idx !== -1) {
        orders[idx] = updatedOrder;
        saveOrdersToStorage(orders);
      }
      return {
        success: true,
        order: updatedOrder,
        message: `Order #${updatedOrder.orderNumber} has been accepted successfully!`,
      };
    }

    return {
      success: false,
      message: data.message || `Failed to accept order #${clean}.`,
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error accepting order.' };
  }
}

/**
 * Reject an order with a mandatory structured reason (Administrator action)
 */
export async function rejectOrder(
  orderIdOrNumber: string,
  reason: RejectionReason | string,
  note?: string
): Promise<{ success: boolean; order?: Order; message?: string }> {
  if (!reason || reason.trim().length === 0) {
    return { success: false, message: 'A rejection reason is strictly required.' };
  }

  const clean = orderIdOrNumber.trim().toUpperCase();

  try {
    const res = await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber: clean,
        action: 'REJECT_ORDER',
        rejectionReason: reason,
        rejectionNote: note?.trim(),
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      const updatedOrder = data.data as Order;
      const orders = getStoredOrders();
      const idx = orders.findIndex((o) => o.orderNumber.toUpperCase() === clean);
      if (idx !== -1) {
        orders[idx] = updatedOrder;
        saveOrdersToStorage(orders);
      }
      return {
        success: true,
        order: updatedOrder,
        message: `Order #${updatedOrder.orderNumber} has been rejected.`,
      };
    }

    return {
      success: false,
      message: data.message || `Failed to reject order #${clean}.`,
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error rejecting order.' };
  }
}

/**
 * Fetch customer orders by phone with server verification
 */
export async function getCustomerOrders(phone: string): Promise<Order[]> {
  const cleanPhone = phone.replace(/[^\d]/g, '').slice(-10);
  if (!cleanPhone) return [];

  // Try API first
  try {
    if (typeof window !== 'undefined') {
      const res = await fetch(`/api/orders?phone=${cleanPhone}`);
      if (res.ok) {
        const payload = await res.json();
        if (payload.success && Array.isArray(payload.data)) {
          return payload.data as Order[];
        }
      }
    }
  } catch {}

  // Fallback to locally stored customer orders on this device
  const localOrders = getStoredOrders();
  return localOrders.filter(
    (o) => o.customerPhone && o.customerPhone.replace(/[^\d]/g, '').endsWith(cleanPhone)
  );
}
