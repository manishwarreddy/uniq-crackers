import fs from 'fs';
import path from 'path';
import { INITIAL_PRODUCTS } from '@/lib/products-data';
import { INITIAL_COUPONS } from '@/lib/coupons-data';
import { ProductItem, OrderStatus, PaymentMethod } from '@/types';

export interface ServerOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  distanceKm: number;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod | string;
  paymentStatus: string;
  status: OrderStatus;
  deliveryOtp: string;
  items: Array<{
    productId: string;
    variantId: string;
    name: string;
    variantName: string;
    boxQuantity: string;
    price: number;
    originalPrice?: number;
    image: string;
    quantity: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNotification {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  itemsCount: number;
  deliveryAddress: string;
  distanceKm: number;
  paymentMethod: string;
  timestamp: string;
  isRead: boolean;
  whatsappUrl: string;
  formattedMessage: string;
}

export interface OtpRecord {
  phone: string;
  otp: string;
  name?: string;
  expiresAt: number;
  verified: boolean;
}

// In-memory runtime cache
let productsCache: ProductItem[] = [...INITIAL_PRODUCTS];
let couponsCache = [...INITIAL_COUPONS];
let ordersCache: ServerOrder[] = [];
let notificationsCache: AdminNotification[] = [];
const otpMap = new Map<string, OtpRecord>();

// File storage path for persistence across dev server restarts
const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

function ensureDataLoaded() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.products) && parsed.products.length > 0) {
        productsCache = parsed.products;
      }
      if (Array.isArray(parsed.orders)) {
        ordersCache = parsed.orders;
      }
      if (Array.isArray(parsed.notifications)) {
        notificationsCache = parsed.notifications;
      }
      if (Array.isArray(parsed.coupons)) {
        couponsCache = parsed.coupons;
      }
    } else {
      saveData();
    }
  } catch (err) {
    console.warn('[SERVER STORE] Failed to load disk cache:', err);
  }
}

function saveData() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(
        {
          products: productsCache,
          orders: ordersCache,
          notifications: notificationsCache,
          coupons: couponsCache,
        },
        null,
        2
      )
    );
  } catch (err) {
    console.warn('[SERVER STORE] Failed to save disk cache:', err);
  }
}

// Initialize on module load
ensureDataLoaded();

export const ServerStore = {
  // PRODUCTS
  getProducts(): ProductItem[] {
    return productsCache;
  },

  getProductById(id: string): ProductItem | undefined {
    return productsCache.find((p) => p.id === id || p.slug === id);
  },

  addProduct(product: ProductItem): ProductItem {
    productsCache.unshift(product);
    saveData();
    return product;
  },

  updateProduct(id: string, updates: Partial<ProductItem>): ProductItem | null {
    const idx = productsCache.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    productsCache[idx] = {
      ...productsCache[idx],
      ...updates,
    };
    saveData();
    return productsCache[idx];
  },

  updateProductPrice(productId: string, variantId: string, newPrice: number, newOriginalPrice?: number): ProductItem | null {
    const idx = productsCache.findIndex((p) => p.id === productId);
    if (idx === -1) return null;
    const prod = productsCache[idx];
    const updatedVariants = prod.variants.map((v) => {
      if (!variantId || v.id === variantId) {
        return {
          ...v,
          price: newPrice,
          originalPrice: newOriginalPrice ? newOriginalPrice : v.originalPrice,
        };
      }
      return v;
    });
    productsCache[idx] = { ...prod, variants: updatedVariants };
    saveData();
    return productsCache[idx];
  },

  deleteProduct(id: string): boolean {
    const beforeLen = productsCache.length;
    productsCache = productsCache.filter((p) => p.id !== id);
    const deleted = productsCache.length < beforeLen;
    if (deleted) saveData();
    return deleted;
  },

  // ORDERS
  getOrders(filterPhone?: string): ServerOrder[] {
    if (filterPhone) {
      const cleanPhone = filterPhone.replace(/[^\d]/g, '').slice(-10);
      return ordersCache.filter((o) => o.customerPhone.replace(/[^\d]/g, '').endsWith(cleanPhone));
    }
    return ordersCache;
  },

  getOrderById(idOrNumber: string): ServerOrder | undefined {
    return ordersCache.find(
      (o) => o.id === idOrNumber || o.orderNumber.toUpperCase() === idOrNumber.toUpperCase()
    );
  },

  createOrder(order: ServerOrder): ServerOrder {
    ordersCache.unshift(order);
    saveData();
    return order;
  },

  updateOrderStatus(orderIdOrNumber: string, status: OrderStatus): ServerOrder | null {
    const idx = ordersCache.findIndex(
      (o) => o.id === orderIdOrNumber || o.orderNumber.toUpperCase() === orderIdOrNumber.toUpperCase()
    );
    if (idx === -1) return null;
    ordersCache[idx] = {
      ...ordersCache[idx],
      status,
      updatedAt: new Date().toISOString(),
    };
    saveData();
    return ordersCache[idx];
  },

  // NOTIFICATIONS
  getNotifications(): AdminNotification[] {
    return notificationsCache;
  },

  getUnreadNotificationsCount(): number {
    return notificationsCache.filter((n) => !n.isRead).length;
  },

  addNotification(notif: AdminNotification): AdminNotification {
    notificationsCache.unshift(notif);
    // Keep max 100 recent notifications
    if (notificationsCache.length > 100) {
      notificationsCache = notificationsCache.slice(0, 100);
    }
    saveData();
    return notif;
  },

  markNotificationAsRead(id: string): boolean {
    const notif = notificationsCache.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      saveData();
      return true;
    }
    return false;
  },

  markAllNotificationsAsRead(): void {
    notificationsCache.forEach((n) => (n.isRead = true));
    saveData();
  },

  // COUPONS
  getCoupons() {
    return couponsCache;
  },

  addCoupon(coupon: any) {
    couponsCache.unshift(coupon);
    saveData();
    return coupon;
  },

  // OTP STORE
  setOtp(phone: string, otp: string, name?: string): OtpRecord {
    const cleanPhone = phone.replace(/[^\d]/g, '').slice(-10);
    const record: OtpRecord = {
      phone: cleanPhone,
      otp,
      name,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 mins
      verified: false,
    };
    otpMap.set(cleanPhone, record);
    return record;
  },

  verifyOtp(phone: string, inputOtp: string): { success: boolean; name?: string; message: string } {
    const cleanPhone = phone.replace(/[^\d]/g, '').slice(-10);
    const record = otpMap.get(cleanPhone);

    if (!record) {
      return { success: false, message: 'OTP expired or not requested. Please request a new OTP.' };
    }

    if (Date.now() > record.expiresAt) {
      otpMap.delete(cleanPhone);
      return { success: false, message: 'OTP has expired. Please request a new OTP.' };
    }

    if (record.otp !== inputOtp.trim()) {
      return { success: false, message: 'Invalid OTP entered. Please check and try again.' };
    }

    record.verified = true;
    return { success: true, name: record.name, message: 'Phone number verified successfully!' };
  },
};
