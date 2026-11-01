import fs from 'fs';
import path from 'path';
import { INITIAL_PRODUCTS } from '@/lib/products-data';
import { INITIAL_COUPONS } from '@/lib/coupons-data';
import { ProductItem, OrderStatus, PaymentMethod, VALID_ORDER_TRANSITIONS, OrderStatusHistoryEntry } from '@/types';
import {
  syncProductToSupabase,
  deleteProductFromSupabase,
  syncOrderToSupabase,
  fetchProductsFromSupabase,
  deleteImageFromSupabaseStorage,
  deleteProductImageInSupabase,
  ensureCatalogSeededInSupabase,
  fetchInactiveProductIdsFromSupabase,
} from '@/lib/supabase-sync';
import { isSupabaseConfigured } from '@/lib/supabase';

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
  paymentGateway?: string;
  paymentTransactionId?: string;
  gatewayOrderId?: string;
  paymentVerifiedAt?: string;
  paymentAmountCaptured?: number;
  paymentCurrency?: string;
  paymentFailureReason?: string;
  refundStatus?: string;
  refundInitiatedAt?: string;
  status: OrderStatus;
  deliveryOtp: string;
  deliveryOtpVerified?: boolean;
  deliveryOtpAttempts?: number;
  deliveredAt?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  assignedAgentPhone?: string;
  orderAccessToken?: string;
  stockRestored?: boolean;
  upiUtr?: string;
  paymentScreenshot?: string;
  paymentScreenshotUploadedAt?: string;
  paymentRejectionReason?: string;
  rejectionReason?: string;
  rejectionNote?: string;
  rejectedAt?: string;
  acceptedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
  statusHistory?: OrderStatusHistoryEntry[];
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
  upiUtr?: string;
  paymentScreenshot?: string;
  paymentScreenshotUploadedAt?: string;
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

export interface DeliverySettings {
  adminWhatsAppNumber: string;
  freeDeliveryThreshold: number;
  maxRadiusKm: number;
  centerLatitude?: number;
  centerLongitude?: number;
  centerAddress?: string;
  smsApiKey?: string;
  slabs: Array<{
    minKm: number;
    maxKm: number;
    fee: number;
    label: string;
  }>;
}

const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  adminWhatsAppNumber: process.env.ADMIN_WHATSAPP_PHONE || process.env.ADMIN_PHONE || '9000000000',
  freeDeliveryThreshold: 3000,
  maxRadiusKm: 7.0,
  centerLatitude: 17.502900,
  centerLongitude: 78.257300,
  centerAddress: 'F6GQ+7PW, Velmala, Hyderabad, Telangana 502300',
  slabs: [
    { minKm: 0.0, maxKm: 2.0, fee: 40, label: '0 - 2 km (Local Velmala)' },
    { minKm: 2.0, maxKm: 4.0, fee: 70, label: '2 - 4 km (Outer Velmala)' },
    { minKm: 4.0, maxKm: 7.0, fee: 120, label: '4 - 7 km (Extended Boundary)' },
  ],
};

// In-memory runtime cache
let productsCache: ProductItem[] = [...INITIAL_PRODUCTS];
let deletedProductIds = new Set<string>();
let couponsCache = [...INITIAL_COUPONS];
let ordersCache: ServerOrder[] = [];
let notificationsCache: AdminNotification[] = [];
let deliverySettingsCache: DeliverySettings = { ...DEFAULT_DELIVERY_SETTINGS };
const otpMap = new Map<string, OtpRecord>();
const processedWebhookEvents = new Set<string>();
const sentNotificationKeys = new Set<string>();

// File storage path for persistence across dev server restarts
const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
let isLoaded = false;
let lastLoadedMtime = 0;

function ensureDataLoaded() {
  if (isLoaded) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DATA_FILE)) {
      lastLoadedMtime = fs.statSync(DATA_FILE).mtimeMs;
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.deletedProductIds)) {
        for (const id of parsed.deletedProductIds) {
          deletedProductIds.add(id);
        }
      }
      if (Array.isArray(parsed.products) && parsed.products.length > 0) {
        productsCache = parsed.products.filter((p: ProductItem) => !deletedProductIds.has(p.id));
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
      if (parsed.deliverySettings && typeof parsed.deliverySettings === 'object') {
        deliverySettingsCache = { ...DEFAULT_DELIVERY_SETTINGS, ...parsed.deliverySettings };
      }
      const seedItems = [
        { id: 'prod-01', variantId: 'var-01', name: 'Festive Sparklers & Crackers Combo', price: 1200 },
        { id: 'p1', variantId: 'v1', name: 'Sparkler A', price: 500 },
        { id: 'p2', variantId: 'v2', name: 'Sparkler B', price: 900 },
        { id: 'p3', variantId: 'v3', name: 'Anar B', price: 750 },
        { id: 'p4', variantId: 'v4', name: 'Private Fireworks', price: 1500 },
        { id: 'p5', variantId: 'v5', name: 'Chakkars', price: 600 },
        { id: 'p6', variantId: 'v6', name: 'Ground Wheel', price: 1100 },
      ];
      for (const item of seedItems) {
        if (deletedProductIds.has(item.id)) continue;
        const existing = productsCache.find((p) => p.id === item.id);
        if (!existing) {
          productsCache.push({
            id: item.id,
            name: item.name,
            slug: `${item.id}-slug`,
            category: 'sparklers',
            categoryLabel: 'Sparklers & Phooljhadi',
            description: `${item.name} celebratory festive pack.`,
            image: '/images/sparklers.jpg',
            rating: 4.9,
            reviewsCount: 30,
            isGreenCertified: true,
            soundDecibel: 'Low',
            smokeLevel: 'Low',
            variants: [
              {
                id: item.variantId,
                name: 'Standard Unit',
                sku: `SKU-${item.id.toUpperCase()}`,
                price: item.price,
                originalPrice: Math.round(item.price * 1.25),
                boxQuantity: '1 Box',
                stock: 100,
              },
            ],
            safetyTips: ['Keep bucket of water nearby'],
          });
        } else if (existing.variants?.[0] && existing.variants[0].stock < 20) {
          existing.variants[0].stock = 100;
        }
      }
    } else {
      saveData();
    }
    isLoaded = true;
  } catch (err) {
    console.warn('[SERVER STORE] Failed to load disk cache:', err);
    isLoaded = true;
  }
}

function saveData() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = path.join(DATA_DIR, `store.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
    const payload = JSON.stringify(
      {
        products: productsCache,
        deletedProductIds: Array.from(deletedProductIds),
        orders: ordersCache,
        notifications: notificationsCache,
        coupons: couponsCache,
        deliverySettings: deliverySettingsCache,
      },
      null,
      2
    );
    try {
      fs.writeFileSync(tempFile, payload, 'utf-8');
      try {
        fs.renameSync(tempFile, DATA_FILE);
      } catch {
        // Fallback for Windows file locks or rename issues across processes
        fs.copyFileSync(tempFile, DATA_FILE);
        try { fs.unlinkSync(tempFile); } catch { }
      }
    } catch {
      // Direct write fallback
      fs.writeFileSync(DATA_FILE, payload, 'utf-8');
    }
  } catch (err) {
    console.warn('[SERVER STORE] Failed to save disk cache:', err);
  }
}

// Initialize on module load
ensureDataLoaded();

export const ServerStore = {
  // PRODUCTS
  getProducts(): ProductItem[] {
    ensureDataLoaded();
    return productsCache;
  },

  async getProductsAsync(): Promise<ProductItem[]> {
    ensureDataLoaded();
    if (isSupabaseConfigured()) {
      try {
        // Authoritative sync: fetch all inactive product IDs from Supabase
        const remoteInactiveIds = await fetchInactiveProductIdsFromSupabase();
        for (const id of remoteInactiveIds) {
          deletedProductIds.add(id);
        }

        // Ensure locally deleted IDs are also deactivated in Supabase
        const localDeletedArray = Array.from(deletedProductIds);
        for (const id of localDeletedArray) {
          if (!remoteInactiveIds.includes(id)) {
            await deleteProductFromSupabase(id);
          }
        }

        await ensureCatalogSeededInSupabase(INITIAL_PRODUCTS, deletedProductIds);
        const remote = await fetchProductsFromSupabase();
        if (remote && Array.isArray(remote)) {
          // Keep remote as authoritative, excluding locally tracked deleted IDs
          const remoteIdSet = new Set(remote.map((p) => p.id));
          const localPending = productsCache.filter(
            (p) => !remoteIdSet.has(p.id) && !deletedProductIds.has(p.id) && p.id.startsWith('prod-custom-')
          );
          productsCache = [...remote.filter((p) => !deletedProductIds.has(p.id)), ...localPending];
          saveData();
          return productsCache;
        }
      } catch (e) {
        console.warn('[SERVER STORE] Failed to fetch products from Supabase, using cache:', e);
      }
    }
    return productsCache.filter((p) => !deletedProductIds.has(p.id));
  },

  isProductDeleted(idOrSlug: string): boolean {
    ensureDataLoaded();
    if (deletedProductIds.has(idOrSlug)) return true;
    const initial = INITIAL_PRODUCTS.find((p) => p.slug === idOrSlug || p.id === idOrSlug);
    if (initial && deletedProductIds.has(initial.id)) return true;
    return false;
  },


  getProductById(id: string): ProductItem | undefined {
    ensureDataLoaded();
    return productsCache.find((p) => p.id === id || p.slug === id);
  },

  async addProduct(product: ProductItem): Promise<ProductItem> {
    deletedProductIds.delete(product.id);
    productsCache.unshift(product);
    saveData();
    if (isSupabaseConfigured()) {
      try {
        const synced = await syncProductToSupabase(product);
        if (!synced) {
          console.warn('[SERVER STORE] Failed to sync new product to Supabase');
        }
      } catch (err) {
        console.warn('[SERVER STORE] Error during syncProductToSupabase in addProduct:', err);
      }
    }
    return product;
  },

  async updateProduct(id: string, updates: Partial<ProductItem>): Promise<ProductItem | null> {
    ensureDataLoaded();
    let idx = productsCache.findIndex((p) => p.id === id);
    if (idx === -1 && isSupabaseConfigured()) {
      await this.getProductsAsync();
      idx = productsCache.findIndex((p) => p.id === id);
    }
    if (idx === -1) return null;
    productsCache[idx] = {
      ...productsCache[idx],
      ...updates,
    };
    saveData();
    if (isSupabaseConfigured()) {
      await syncProductToSupabase(productsCache[idx]);
    }
    return productsCache[idx];
  },

  async deleteProductImage(productId: string, imageUrl?: string): Promise<boolean> {
    ensureDataLoaded();
    const fallbackImage = '/images/sparklers.jpg';
    let prod = productsCache.find((p) => p.id === productId);

    if (prod) {
      const oldImage = prod.image;
      prod.image = fallbackImage;
      saveData();
      if (oldImage && oldImage !== fallbackImage) {
        await deleteImageFromSupabaseStorage(oldImage);
      }
      if (imageUrl && imageUrl !== fallbackImage && imageUrl !== oldImage) {
        await deleteImageFromSupabaseStorage(imageUrl);
      }
    } else if (imageUrl && imageUrl !== fallbackImage) {
      await deleteImageFromSupabaseStorage(imageUrl);
    }

    if (isSupabaseConfigured()) {
      const result = await deleteProductImageInSupabase(productId, fallbackImage, imageUrl);
      if (result.success) {
        return true;
      }
      if (prod) {
        await syncProductToSupabase(prod);
        return true;
      }
    }

    return Boolean(prod);
  },

  async updateProductPrice(
    productId: string,
    variantId: string,
    newPrice: number,
    newOriginalPrice?: number,
    newStock?: number
  ): Promise<ProductItem | null> {
    const idx = productsCache.findIndex((p) => p.id === productId);
    if (idx === -1) return null;
    const prod = productsCache[idx];
    const updatedVariants = prod.variants.map((v) => {
      if (!variantId || v.id === variantId) {
        return {
          ...v,
          price: newPrice,
          originalPrice: newOriginalPrice ? newOriginalPrice : v.originalPrice,
          ...(typeof newStock === 'number' && !isNaN(newStock) ? { stock: Math.max(0, newStock) } : {}),
        };
      }
      return v;
    });
    productsCache[idx] = { ...prod, variants: updatedVariants };
    saveData();
    if (isSupabaseConfigured()) {
      await syncProductToSupabase(productsCache[idx]);
    }
    return productsCache[idx];
  },

  async deleteProduct(id: string): Promise<boolean> {
    ensureDataLoaded();
    const target = productsCache.find((p) => p.id === id);
    productsCache = productsCache.filter((p) => p.id !== id);
    deletedProductIds.add(id);
    saveData();
    if (isSupabaseConfigured()) {
      try {
        await deleteProductFromSupabase(id);
      } catch (err) {
        console.warn('[SERVER STORE] Failed to delete product in Supabase:', err);
      }
    }
    if (target?.image && !target.image.includes('/products/')) {
      await deleteImageFromSupabaseStorage(target.image);
    }
    return true;
  },


  /**
   * Atomically validates available stock and reserves items to prevent overselling during simultaneous checkouts.
   * If any item has insufficient stock, no items are decremented and an error is returned.
   */
  reserveStockForOrder(
    items: Array<{ productId: string; variantId: string; quantity: number }>
  ): {
    success: boolean;
    error?: string;
    message: string;
    outOfStockItem?: string;
    availableStock?: number;
  } {
    ensureDataLoaded();

    // 1. Pre-flight check: verify every requested item has sufficient stock
    for (const item of items) {
      const prod = productsCache.find((p) => p.id === item.productId);
      if (!prod) {
        return {
          success: false,
          error: 'PRODUCT_NOT_FOUND',
          message: `Product ID "${item.productId}" is not available in the store catalog.`,
        };
      }

      const variant = prod.variants?.find((v) => v.id === item.variantId) || prod.variants?.[0];
      if (!variant) {
        return {
          success: false,
          error: 'VARIANT_NOT_FOUND',
          message: `Variant "${item.variantId}" for product "${prod.name}" was not found.`,
        };
      }

      const available = Number(variant.stock || 0);
      const requested = Number(item.quantity || 0);

      if (available < requested) {
        return {
          success: false,
          error: 'INSUFFICIENT_STOCK',
          message: `Only ${available} unit(s) of "${prod.name}" are currently in stock, but ${requested} were requested.`,
          outOfStockItem: prod.name,
          availableStock: available,
        };
      }
    }

    // 2. All items verified: perform atomic reservation (decrement stock)
    for (const item of items) {
      const prod = productsCache.find((p) => p.id === item.productId);
      if (prod && prod.variants) {
        const variant = prod.variants.find((v) => v.id === item.variantId) || prod.variants[0];
        if (variant) {
          variant.stock = Math.max(0, (variant.stock || 0) - item.quantity);
        }
      }
    }

    saveData();
    return {
      success: true,
      message: 'Stock successfully reserved.',
    };
  },

  decrementStockForOrder(items: Array<{ productId: string; variantId: string; quantity: number }>): void {
    ensureDataLoaded();
    for (const item of items) {
      const prod = productsCache.find((p) => p.id === item.productId);
      if (prod && prod.variants) {
        const variant = prod.variants.find((v) => v.id === item.variantId);
        if (variant) {
          variant.stock = Math.max(0, (variant.stock || 0) - item.quantity);
        }
      }
    }
    saveData();
  },

  restoreStockForOrder(items: Array<{ productId: string; variantId: string; quantity: number }>): void {
    ensureDataLoaded();
    for (const item of items) {
      const prod = productsCache.find((p) => p.id === item.productId);
      if (prod && prod.variants) {
        const variant = prod.variants.find((v) => v.id === item.variantId);
        if (variant) {
          variant.stock = (variant.stock || 0) + item.quantity;
        }
      }
    }
    saveData();
  },

  // ORDERS
  getOrders(filterPhone?: string, includeDeleted: boolean = false): ServerOrder[] {
    ensureDataLoaded();
    let list = ordersCache;
    if (!includeDeleted) {
      list = list.filter((o) => !o.isDeleted);
    }
    if (filterPhone) {
      const cleanPhone = filterPhone.replace(/[^\d]/g, '').slice(-10);
      return list.filter((o) => o.customerPhone.replace(/[^\d]/g, '').endsWith(cleanPhone));
    }
    return list;
  },

  getOrderById(idOrNumber: string, includeDeleted: boolean = false): ServerOrder | undefined {
    ensureDataLoaded();
    const clean = idOrNumber.trim().toUpperCase();
    return ordersCache.find(
      (o) =>
        (o.id === idOrNumber || o.orderNumber.toUpperCase() === clean) &&
        (includeDeleted || !o.isDeleted)
    );
  },

  deleteOrder(
    orderIdOrNumber: string,
    options?: {
      deletedBy?: string;
      reason?: string;
      permanent?: boolean;
    }
  ): {
    success: boolean;
    error?: 'ORDER_NOT_FOUND' | 'CANNOT_DELETE' | 'ALREADY_DELETED';
    message: string;
    order?: ServerOrder;
  } {
    ensureDataLoaded();
    const clean = orderIdOrNumber.trim().toUpperCase();
    const idx = ordersCache.findIndex(
      (o) => o.id === orderIdOrNumber || o.orderNumber.toUpperCase() === clean
    );
    if (idx === -1) {
      return {
        success: false,
        error: 'ORDER_NOT_FOUND',
        message: `Order #${orderIdOrNumber} not found.`,
      };
    }

    const order = ordersCache[idx];
    if (order.isDeleted) {
      return {
        success: false,
        error: 'ALREADY_DELETED',
        message: `Order #${order.orderNumber} is already deleted.`,
      };
    }

    const now = new Date().toISOString();
    const actor = options?.deletedBy || 'Store Administrator';

    // Remove from active notifications in all cases
    notificationsCache = notificationsCache.filter(
      (n) => n.orderNumber.toUpperCase() !== clean && n.orderId !== order.id
    );

    // If permanent deletion is explicitly requested and allowed (no captured payment records)
    if (options?.permanent && order.paymentStatus !== 'PAID' && order.paymentStatus !== 'CAPTURED') {
      ordersCache.splice(idx, 1);
      saveData();
      return {
        success: true,
        message: `Order #${order.orderNumber} has been permanently deleted.`,
        order,
      };
    }

    // Default: Soft delete / archive to preserve financial records, audit history & dispute records
    const updatedOrder: ServerOrder = {
      ...order,
      isDeleted: true,
      deletedAt: now,
      deletedBy: actor,
      deleteReason: options?.reason || (order.paymentStatus === 'PAID' ? 'Archived (financial records preserved)' : 'Archived by administrator'),
      updatedAt: now,
    };
    ordersCache[idx] = updatedOrder;
    saveData();

    return {
      success: true,
      message: `Order #${order.orderNumber} deleted successfully.`,
      order: updatedOrder,
    };
  },

  deleteAllOrders(options?: {
    deletedBy?: string;
    reason?: string;
    permanent?: boolean;
    filter?: 'ALL' | 'COMPLETED_OR_CANCELLED' | 'OLD_ONLY';
    olderThanDays?: number;
    restoreStock?: boolean;
  }): {
    success: boolean;
    deletedCount: number;
    message: string;
  } {
    ensureDataLoaded();
    const now = new Date().toISOString();
    const actor = options?.deletedBy || 'Store Administrator';
    const permanent = options?.permanent ?? true;
    const filter = options?.filter || 'ALL';
    const olderThanDays = options?.olderThanDays ?? 0;
    const shouldRestoreStock = options?.restoreStock ?? true;

    const cutoffDate = olderThanDays > 0 ? new Date(Date.now() - olderThanDays * 86400000) : null;

    const isMatch = (o: ServerOrder) => {
      if (filter === 'COMPLETED_OR_CANCELLED') {
        const terminalStatuses: OrderStatus[] = ['DELIVERED', 'REJECTED', 'CANCELLED'];
        if (!terminalStatuses.includes(o.status)) return false;
      }
      if (cutoffDate) {
        const orderTime = new Date(o.createdAt).getTime();
        if (orderTime > cutoffDate.getTime()) return false;
      }
      return true;
    };

    const targetOrders = ordersCache.filter((o) => !o.isDeleted && isMatch(o));
    const targetOrderNumbers = new Set(targetOrders.map((o) => o.orderNumber.toUpperCase()));
    const targetOrderIds = new Set(targetOrders.map((o) => o.id));

    if (targetOrders.length === 0) {
      return {
        success: true,
        deletedCount: 0,
        message: 'No matching orders found to delete.',
      };
    }

    // Optionally restore stock for unfulfilled orders being purged
    if (shouldRestoreStock) {
      for (const order of targetOrders) {
        if (!order.stockRestored && order.status !== 'DELIVERED' && Array.isArray(order.items)) {
          ServerStore.restoreStockForOrder(order.items);
          order.stockRestored = true;
        }
      }
    }

    // Remove notifications for target orders
    notificationsCache = notificationsCache.filter(
      (n) => !targetOrderNumbers.has(n.orderNumber.toUpperCase()) && !targetOrderIds.has(n.orderId)
    );

    if (permanent) {
      ordersCache = ordersCache.filter(
        (o) => !targetOrderNumbers.has(o.orderNumber.toUpperCase()) && !targetOrderIds.has(o.id)
      );
    } else {
      for (let i = 0; i < ordersCache.length; i++) {
        const o = ordersCache[i];
        if (targetOrderNumbers.has(o.orderNumber.toUpperCase()) || targetOrderIds.has(o.id)) {
          ordersCache[i] = {
            ...o,
            isDeleted: true,
            deletedAt: now,
            deletedBy: actor,
            deleteReason: options?.reason || 'Bulk deleted by administrator',
            updatedAt: now,
          };
        }
      }
    }

    saveData();

    return {
      success: true,
      deletedCount: targetOrders.length,
      message: `Successfully removed ${targetOrders.length} order(s).`,
    };
  },

  createOrder(order: ServerOrder): ServerOrder {
    ordersCache.unshift(order);
    saveData();
    syncOrderToSupabase(order).catch(() => { });
    return order;
  },

  updateOrderStatus(
    orderIdOrNumber: string,
    status: OrderStatus,
    details?: {
      rejectionReason?: string;
      rejectionNote?: string;
      reviewedBy?: string;
      changedBy?: string;
      note?: string;
      forceTransition?: boolean;
    }
  ): {
    success: boolean;
    order?: ServerOrder;
    error?: 'ORDER_NOT_FOUND' | 'INVALID_STATE_TRANSITION' | 'MISSING_REJECTION_REASON' | 'INVALID_REQUEST';
    message: string;
    isDuplicate?: boolean;
  } {
    ensureDataLoaded();
    const clean = orderIdOrNumber.trim().toUpperCase();
    const idx = ordersCache.findIndex(
      (o) => o.id === orderIdOrNumber || o.orderNumber.toUpperCase() === clean
    );
    if (idx === -1) {
      return {
        success: false,
        error: 'ORDER_NOT_FOUND',
        message: `Order #${orderIdOrNumber} not found.`,
      };
    }

    const currentOrder = ordersCache[idx];
    const now = new Date().toISOString();

    let targetStatus: OrderStatus = status;
    if ((targetStatus as string) === 'READY_FOR_DISPATCH') {
      targetStatus = 'READY_FOR_DELIVERY';
    }

    // 1. Idempotency Check: if order is already in target status
    if (currentOrder.status === targetStatus) {
      return {
        success: true,
        isDuplicate: true,
        order: currentOrder,
        message: `Order #${currentOrder.orderNumber} is already in status ${targetStatus}.`,
      };
    }

    // 2. Validate state transition against VALID_ORDER_TRANSITIONS
    const allowedNext = VALID_ORDER_TRANSITIONS[currentOrder.status] || [];
    if (!details?.forceTransition && !allowedNext.includes(targetStatus)) {
      return {
        success: false,
        error: 'INVALID_STATE_TRANSITION',
        message: `Cannot transition order #${currentOrder.orderNumber} from ${currentOrder.status} to ${targetStatus}.`,
      };
    }

    // 3. Validation for REJECTED status: Rejection requires a meaningful reason
    if (targetStatus === 'REJECTED') {
      const reason = details?.rejectionReason?.trim();
      if (!reason || reason.length < 3) {
        return {
          success: false,
          error: 'MISSING_REJECTION_REASON',
          message: 'A meaningful rejection reason is required to reject an order.',
        };
      }
    }

    // 4. Handle refund state for prepaid vs COD on REJECTED (never claim REFUNDED until provider confirms)
    let newPaymentStatus = currentOrder.paymentStatus;
    let newRefundStatus = currentOrder.refundStatus;
    let refundInitiatedAt = currentOrder.refundInitiatedAt;
    let newStockRestored = currentOrder.stockRestored;

    if (targetStatus === 'REJECTED' || targetStatus === 'CANCELLED') {
      // Restore inventory stock only if not already restored (prevents double restoration on duplicate requests)
      if (!currentOrder.stockRestored && currentOrder.items && Array.isArray(currentOrder.items)) {
        ServerStore.restoreStockForOrder(currentOrder.items);
        newStockRestored = true;
      }

      const isPrepaid =
        currentOrder.paymentMethod === 'RAZORPAY' ||
        currentOrder.paymentMethod === 'UPI_QR' ||
        currentOrder.paymentMethod === 'UPI_DIRECT' ||
        String(currentOrder.paymentMethod).startsWith('UPI');
      const isPaidOrCaptured =
        currentOrder.paymentStatus === 'PAID' || currentOrder.paymentStatus === 'CAPTURED';

      if (targetStatus === 'REJECTED') {
        if (isPrepaid && isPaidOrCaptured) {
          // Prepaid and paid: mark as REFUND_PENDING (never claim REFUNDED until confirmed by gateway)
          newPaymentStatus = 'REFUND_PENDING';
          newRefundStatus = 'REFUND_PENDING';
          refundInitiatedAt = now;
        } else if (currentOrder.paymentMethod === 'COD') {
          // COD payment is cancelled on rejection unless already paid
          newPaymentStatus = currentOrder.paymentStatus === 'PAID' ? 'REFUND_PENDING' : 'CANCELLED';
        } else {
          // Unpaid or pending verification
          if (currentOrder.paymentStatus !== 'PAID') {
            newPaymentStatus = 'FAILED';
          }
        }
      }
    }

    // 5. Prepare audit history entry
    const history: OrderStatusHistoryEntry[] = Array.isArray(currentOrder.statusHistory)
      ? [...currentOrder.statusHistory]
      : [];

    let historyNote = details?.note;
    if (!historyNote) {
      if (targetStatus === 'REJECTED') {
        const reasonText = details?.rejectionReason?.trim();
        const noteText = details?.rejectionNote?.trim();
        historyNote = `Order rejected by ${details?.reviewedBy || 'Store Administrator'}. Reason: ${reasonText}${noteText ? ` (${noteText})` : ''
          }.${newRefundStatus === 'REFUND_PENDING'
            ? ' Refund marked as REFUND_PENDING awaiting payment provider confirmation.'
            : ''
          }`;
      } else if (targetStatus === 'ACCEPTED') {
        historyNote = `Order accepted by ${details?.reviewedBy || 'Store Administrator'}.`;
      } else if (targetStatus === 'CANCELLED') {
        historyNote = `Order cancelled.`;
      }
    }

    history.push({
      status: targetStatus,
      note: historyNote,
      changedBy: details?.reviewedBy || details?.changedBy || 'Store Administrator',
      timestamp: now,
    });

    // 6. Update order in store
    ordersCache[idx] = {
      ...currentOrder,
      status: targetStatus,
      paymentStatus: newPaymentStatus,
      stockRestored: newStockRestored,
      ...(newRefundStatus ? { refundStatus: newRefundStatus, refundInitiatedAt } : {}),
      updatedAt: now,
      statusHistory: history,
      ...(targetStatus === 'ACCEPTED'
        ? {
          acceptedAt: now,
          reviewedBy: details?.reviewedBy || 'Store Administrator',
          reviewedAt: now,
        }
        : {}),
      ...(targetStatus === 'REJECTED'
        ? {
          rejectedAt: now,
          reviewedBy: details?.reviewedBy || 'Store Administrator',
          reviewedAt: now,
          rejectionReason: details?.rejectionReason?.trim(),
          rejectionNote: details?.rejectionNote?.trim() || undefined,
        }
        : {}),
    };

    // Mark matching notifications as read when order is reviewed
    if (['ACCEPTED', 'REJECTED', 'CONFIRMED', 'CANCELLED'].includes(targetStatus)) {
      notificationsCache.forEach((n) => {
        if (n.orderNumber.toUpperCase() === clean || n.orderId === currentOrder.id) {
          n.isRead = true;
        }
      });
    }

    saveData();
    syncOrderToSupabase(ordersCache[idx]).catch(() => { });
    return {
      success: true,
      order: ordersCache[idx],
      message: `Order #${currentOrder.orderNumber} status transitioned to ${targetStatus}.`,
    };
  },

  updatePaymentStatus(
    orderIdOrNumber: string,
    paymentStatus: string,
    upiUtr?: string,
    autoAccept: boolean = true
  ): ServerOrder | null {
    const idx = ordersCache.findIndex(
      (o) => o.id === orderIdOrNumber || o.orderNumber.toUpperCase() === orderIdOrNumber.toUpperCase()
    );
    if (idx === -1) return null;
    const now = new Date().toISOString();
    const current = ordersCache[idx];
    const willAccept = autoAccept && current.status === 'PENDING_REVIEW';

    const history: OrderStatusHistoryEntry[] = Array.isArray(current.statusHistory)
      ? [...current.statusHistory]
      : [];

    if (willAccept) {
      history.push({
        status: 'ACCEPTED',
        note: `UPI Payment verified (${paymentStatus}). Order accepted.`,
        changedBy: 'Store Administrator',
        timestamp: now,
      });
    }

    ordersCache[idx] = {
      ...current,
      paymentStatus,
      ...(upiUtr ? { upiUtr } : {}),
      ...(willAccept
        ? {
          status: 'ACCEPTED',
          acceptedAt: now,
          reviewedBy: 'Store Administrator',
          reviewedAt: now,
        }
        : {}),
      statusHistory: history,
      updatedAt: now,
    };
    saveData();
    return ordersCache[idx];
  },

  updateOrderPaymentProof(
    orderIdOrNumber: string,
    screenshotPath: string,
    upiUtr?: string
  ): ServerOrder | null {
    ensureDataLoaded();
    const clean = orderIdOrNumber.trim().toUpperCase();
    const idx = ordersCache.findIndex(
      (o) => o.id === orderIdOrNumber || o.orderNumber.toUpperCase() === clean
    );
    if (idx === -1) return null;
    const now = new Date().toISOString();
    const current = ordersCache[idx];

    const history: OrderStatusHistoryEntry[] = Array.isArray(current.statusHistory)
      ? [...current.statusHistory]
      : [];

    history.push({
      status: current.status,
      note: `Payment proof uploaded by customer${upiUtr ? ` (UTR: ${upiUtr})` : ''}. Awaiting admin verification.`,
      changedBy: 'CUSTOMER',
      timestamp: now,
    });

    ordersCache[idx] = {
      ...current,
      paymentScreenshot: screenshotPath,
      paymentScreenshotUploadedAt: now,
      ...(upiUtr ? { upiUtr } : {}),
      statusHistory: history,
      updatedAt: now,
    };

    // Also update notification if present
    const notif = notificationsCache.find((n) => n.orderNumber.toUpperCase() === clean);
    if (notif) {
      notif.paymentScreenshot = screenshotPath;
      notif.paymentScreenshotUploadedAt = now;
      if (upiUtr) {
        notif.upiUtr = upiUtr;
        notif.paymentMethod = `UPI (UTR: ${upiUtr})`;
      }
    }

    saveData();
    return ordersCache[idx];
  },

  isWebhookProcessed(eventId: string): boolean {
    return processedWebhookEvents.has(eventId);
  },

  recordProcessedWebhook(eventId: string): void {
    processedWebhookEvents.add(eventId);
  },

  verifyAndCapturePayment(
    orderIdOrNumber: string,
    details: {
      gateway: string;
      transactionId: string;
      amount: number;
      currency?: string;
      gatewayOrderId?: string;
      rawWebhookData?: any;
    }
  ): { success: boolean; error?: string; message: string; order?: ServerOrder } {
    ensureDataLoaded();
    const clean = orderIdOrNumber.trim().toUpperCase();
    const idx = ordersCache.findIndex(
      (o) => o.id === orderIdOrNumber || o.orderNumber.toUpperCase() === clean
    );
    if (idx === -1) {
      return { success: false, error: 'ORDER_NOT_FOUND', message: `Order #${orderIdOrNumber} not found.` };
    }

    const order = ordersCache[idx];

    // Idempotent return if already verified and paid
    if (order.paymentStatus === 'PAID') {
      return {
        success: true,
        message: 'Order was already verified and marked as PAID.',
        order,
      };
    }

    // Verify expected amount
    const expectedAmount = Number(order.totalAmount);
    if (Math.abs(expectedAmount - details.amount) >= 0.01) {
      // Flag amount mismatch without confirming order
      const now = new Date().toISOString();
      ordersCache[idx] = {
        ...order,
        paymentStatus: 'AMOUNT_MISMATCH',
        paymentGateway: details.gateway,
        paymentFailureReason: `Expected ₹${expectedAmount}, but received ₹${details.amount} from ${details.gateway}.`,
        updatedAt: now,
      };
      saveData();
      return {
        success: false,
        error: 'AMOUNT_MISMATCH',
        message: `Payment amount mismatch: Expected ₹${expectedAmount}, but received ₹${details.amount}.`,
        order: ordersCache[idx],
      };
    }

    // Verify currency (must be INR)
    if (details.currency && details.currency.toUpperCase() !== 'INR') {
      const now = new Date().toISOString();
      ordersCache[idx] = {
        ...order,
        paymentStatus: 'FAILED',
        paymentFailureReason: `Invalid payment currency: Expected INR, but received ${details.currency}.`,
        updatedAt: now,
      };
      saveData();
      return {
        success: false,
        error: 'INVALID_CURRENCY',
        message: `Currency mismatch: Expected INR, but received ${details.currency}.`,
        order: ordersCache[idx],
      };
    }

    // Success: mark as PAID, transition status to ACCEPTED
    const now = new Date().toISOString();
    const history: OrderStatusHistoryEntry[] = Array.isArray(order.statusHistory)
      ? [...order.statusHistory]
      : [];
    if (order.status === 'PENDING_REVIEW') {
      history.push({
        status: 'ACCEPTED',
        note: `Payment of ₹${details.amount} verified and captured via ${details.gateway}`,
        changedBy: `PAYMENT_GATEWAY (${details.gateway})`,
        timestamp: now,
      });
    }

    ordersCache[idx] = {
      ...order,
      paymentStatus: 'PAID',
      paymentGateway: details.gateway,
      paymentTransactionId: details.transactionId,
      gatewayOrderId: details.gatewayOrderId || order.gatewayOrderId,
      paymentVerifiedAt: now,
      paymentAmountCaptured: details.amount,
      paymentCurrency: details.currency || 'INR',
      statusHistory: history,
      ...(details.transactionId && !order.upiUtr ? { upiUtr: details.transactionId } : {}),
      ...(order.status === 'PENDING_REVIEW' ? { status: 'ACCEPTED', acceptedAt: now } : {}),
      updatedAt: now,
    };
    saveData();

    return {
      success: true,
      message: `Payment of ₹${details.amount} successfully verified via ${details.gateway}.`,
      order: ordersCache[idx],
    };
  },

  recordPaymentFailure(
    orderIdOrNumber: string,
    reason: string,
    details?: { gateway?: string; transactionId?: string; status?: string }
  ): ServerOrder | null {
    ensureDataLoaded();
    const idx = ordersCache.findIndex(
      (o) => o.id === orderIdOrNumber || o.orderNumber.toUpperCase() === orderIdOrNumber.toUpperCase()
    );
    if (idx === -1) return null;
    const now = new Date().toISOString();
    ordersCache[idx] = {
      ...ordersCache[idx],
      paymentStatus: details?.status || 'FAILED',
      paymentFailureReason: reason,
      ...(details?.gateway ? { paymentGateway: details.gateway } : {}),
      ...(details?.transactionId ? { paymentTransactionId: details.transactionId } : {}),
      updatedAt: now,
    };
    saveData();
    return ordersCache[idx];
  },

  recordPaymentRefund(
    orderIdOrNumber: string,
    refundAmount: number,
    refundId: string
  ): ServerOrder | null {
    ensureDataLoaded();
    const idx = ordersCache.findIndex(
      (o) => o.id === orderIdOrNumber || o.orderNumber.toUpperCase() === orderIdOrNumber.toUpperCase()
    );
    if (idx === -1) return null;
    const now = new Date().toISOString();
    const history: OrderStatusHistoryEntry[] = Array.isArray(ordersCache[idx].statusHistory)
      ? [...ordersCache[idx].statusHistory]
      : [];
    history.push({
      status: ordersCache[idx].status,
      note: `Payment refund confirmed by provider: ₹${refundAmount} (Refund ID: ${refundId})`,
      changedBy: 'PAYMENT_GATEWAY_WEBHOOK',
      timestamp: now,
    });

    ordersCache[idx] = {
      ...ordersCache[idx],
      paymentStatus: 'REFUNDED',
      refundStatus: 'REFUNDED',
      rejectionReason: `Refund processed: ₹${refundAmount} (Refund ID: ${refundId})`,
      statusHistory: history,
      updatedAt: now,
    };
    saveData();
    return ordersCache[idx];
  },

  assignDeliveryAgent(
    orderIdOrNumber: string,
    agentId: string,
    agentName: string,
    agentPhone?: string
  ): ServerOrder | null {
    const idx = ordersCache.findIndex(
      (o) => o.id === orderIdOrNumber || o.orderNumber.toUpperCase() === orderIdOrNumber.toUpperCase()
    );
    if (idx === -1) return null;

    const currentOrder = ordersCache[idx];
    if (['CANCELLED', 'REJECTED', 'DELIVERED'].includes(currentOrder.status)) {
      return null;
    }

    const now = new Date().toISOString();
    const history: OrderStatusHistoryEntry[] = Array.isArray(currentOrder.statusHistory)
      ? [...currentOrder.statusHistory]
      : [];
    history.push({
      status: 'DELIVERY_AGENT_ASSIGNED',
      note: `Assigned to delivery agent ${agentName}${agentPhone ? ` (${agentPhone})` : ''}`,
      changedBy: 'Store Administrator',
      timestamp: now,
    });

    ordersCache[idx] = {
      ...currentOrder,
      assignedAgentId: agentId,
      assignedAgentName: agentName,
      ...(agentPhone ? { assignedAgentPhone: agentPhone } : {}),
      status: 'DELIVERY_AGENT_ASSIGNED',
      statusHistory: history,
      updatedAt: now,
    };
    saveData();
    return ordersCache[idx];
  },

  verifyDeliveryOtp(
    orderIdOrNumber: string,
    inputOtp: string,
    agentId?: string
  ): { success: boolean; message: string; error?: string; order?: ServerOrder } {
    const idx = ordersCache.findIndex(
      (o) => o.id === orderIdOrNumber || o.orderNumber.toUpperCase() === orderIdOrNumber.toUpperCase()
    );
    if (idx === -1) {
      return { success: false, error: 'NOT_FOUND', message: 'Order not found.' };
    }

    const order = ordersCache[idx];

    // If agent is specified, verify that the order was assigned to this agent
    if (agentId && order.assignedAgentId && order.assignedAgentId !== agentId) {
      return {
        success: false,
        error: 'UNAUTHORIZED_AGENT',
        message: 'This delivery task is not assigned to your account.',
      };
    }

    // Check if already delivered / verified (prevent replay / reuse)
    if (order.deliveryOtpVerified || order.status === 'DELIVERED') {
      return {
        success: false,
        error: 'ALREADY_DELIVERED',
        message: 'Delivery OTP has already been verified for this order.',
      };
    }

    // Check attempt limits on delivery OTP (max 5)
    const attempts = (order.deliveryOtpAttempts || 0) + 1;
    order.deliveryOtpAttempts = attempts;

    if (attempts > 5) {
      saveData();
      return {
        success: false,
        error: 'MAX_ATTEMPTS_EXCEEDED',
        message: 'Maximum delivery OTP verification attempts exceeded. Please contact store dispatch.',
      };
    }

    const cleanInputOtp = (inputOtp || '').trim();
    if (cleanInputOtp !== order.deliveryOtp) {
      saveData();
      return {
        success: false,
        error: 'INVALID_OTP',
        message: `Incorrect delivery OTP. ${5 - attempts} attempt(s) remaining.`,
      };
    }

    // Successfully verified!
    const now = new Date().toISOString();
    const history: OrderStatusHistoryEntry[] = Array.isArray(order.statusHistory)
      ? [...order.statusHistory]
      : [];
    history.push({
      status: 'DELIVERED',
      note: 'Delivery OTP verified at doorstep',
      changedBy: agentId || 'DELIVERY_AGENT',
      timestamp: now,
    });

    ordersCache[idx] = {
      ...order,
      status: 'DELIVERED',
      deliveryOtpVerified: true,
      deliveredAt: now,
      statusHistory: history,
      updatedAt: now,
    };
    saveData();

    return {
      success: true,
      message: `Order #${order.orderNumber} successfully marked as DELIVERED!`,
      order: ordersCache[idx],
    };
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

  deleteNotification(id: string): boolean {
    const prevLen = notificationsCache.length;
    notificationsCache = notificationsCache.filter((n) => n.id !== id);
    if (notificationsCache.length !== prevLen) {
      saveData();
      return true;
    }
    return false;
  },

  deleteAllNotifications(): void {
    notificationsCache = [];
    saveData();
  },

  // DELIVERY & HUB SETTINGS
  getDeliverySettings(): DeliverySettings {
    return deliverySettingsCache;
  },

  updateDeliverySettings(settings: Partial<DeliverySettings>): DeliverySettings {
    deliverySettingsCache = {
      ...deliverySettingsCache,
      ...settings,
      slabs: settings.slabs || deliverySettingsCache.slabs,
    };
    saveData();
    return deliverySettingsCache;
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

  hasNotificationBeenSent(key: string): boolean {
    return sentNotificationKeys.has(key);
  },

  recordNotificationSent(key: string): void {
    sentNotificationKeys.add(key);
  },
};
