import { ServerStore } from './server-store';
import { STORE_DEFAULTS, DELIVERY_PRICING_SLABS } from './constants';
import { Coupon } from './coupons-data';
import {
  getStoreLocation,
  getDeliveryRadiusKm,
  isValidCoordinate,
  calculateDistanceKm,
  OUT_OF_SERVICE_MESSAGE,
} from './geo';

export interface CheckoutItemInput {
  productId?: string;
  variantId?: string;
  quantity?: number;
  [key: string]: any;
}

export interface VerifiedOrderItem {
  productId: string;
  variantId: string;
  name: string;
  variantName: string;
  boxQuantity: string;
  price: number;
  originalPrice: number;
  image: string;
  quantity: number;
  subtotal: number;
}

export interface PricingCalculationResult {
  items: VerifiedOrderItem[];
  subtotal: number;
  subtotalPaise: number;
  deliveryFee: number;
  deliveryFeePaise: number;
  isFreeDelivery: boolean;
  freeDeliveryThreshold: number;
  freeDeliveryGap: number;
  discountAmount: number;
  discountPaise: number;
  appliedCoupon?: {
    code: string;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;
  };
  taxAmount: number;
  taxPaise: number;
  totalAmount: number;
  totalPaise: number;
  minOrderValue: number;
}

export interface PricingCalculationOptions {
  items: CheckoutItemInput[];
  couponCode?: string | null;
  distanceKm?: number | null;
  customerCoordinates?: { latitude?: unknown; longitude?: unknown } | null;
  revalidateStock?: boolean;
}

export class PricingValidationError extends Error {
  code: string;
  status: number;
  details?: any;

  constructor(code: string, message: string, status: number = 400, details?: any) {
    super(message);
    this.name = 'PricingValidationError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * Safely converts Rupees to integer Paise to prevent floating point inaccuracies.
 */
export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) return 0;
  return Math.round(rupees * 100);
}

/**
 * Converts integer Paise back to Rupees rounded to 2 decimal places.
 */
export function paiseToRupees(paise: number): number {
  if (!Number.isFinite(paise)) return 0;
  return Math.round(paise) / 100;
}

/**
 * Authoritative Server-Side Pricing Engine
 * Never trusts prices, subtotals, delivery fees, discounts, or totals submitted by the client.
 */
export function calculateOrderPricing(
  options: PricingCalculationOptions
): PricingCalculationResult {
  const { items: rawItems, couponCode, distanceKm, revalidateStock = true } = options;

  if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
    throw new PricingValidationError('EMPTY_CART', 'Cart contains no items to calculate pricing.');
  }

  // 1. Consolidate identical items by variantId / productId to prevent duplicate cart abuse
  const consolidatedMap = new Map<string, { productId: string; variantId: string; quantity: number }>();

  for (let i = 0; i < rawItems.length; i++) {
    const raw = rawItems[i];
    if (!raw || typeof raw !== 'object') {
      throw new PricingValidationError('INVALID_ITEM', `Cart item at index ${i} is invalid.`);
    }

    const productId = String(raw.productId || raw.id || '').trim();
    if (!productId) {
      throw new PricingValidationError('MISSING_PRODUCT_ID', `Cart item at index ${i} is missing productId.`);
    }

    // Validate quantity
    const qty = Number(raw.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new PricingValidationError(
        'INVALID_QUANTITY',
        `Quantity for product "${productId}" must be a positive integer greater than zero.`
      );
    }

    if (qty > 100) {
      throw new PricingValidationError(
        'MAX_QUANTITY_EXCEEDED',
        `Quantity for product "${productId}" exceeds the maximum purchase limit of 100 units per item.`
      );
    }

    const variantId = String(raw.variantId || '').trim();
    const key = variantId ? `${productId}:::${variantId}` : productId;

    if (consolidatedMap.has(key)) {
      const existing = consolidatedMap.get(key)!;
      const combinedQty = existing.quantity + qty;
      if (combinedQty > 100) {
        throw new PricingValidationError(
          'MAX_QUANTITY_EXCEEDED',
          `Total quantity for product "${productId}" exceeds the limit of 100 units per order.`
        );
      }
      existing.quantity = combinedQty;
    } else {
      consolidatedMap.set(key, { productId, variantId, quantity: qty });
    }
  }

  // 2. Fetch authoritative product data and prices from Server Store
  const verifiedItems: VerifiedOrderItem[] = [];
  let subtotalPaise = 0;

  for (const item of Array.from(consolidatedMap.values())) {
    const product = ServerStore.getProductById(item.productId);
    if (!product) {
      throw new PricingValidationError(
        'PRODUCT_NOT_FOUND',
        `Product with ID "${item.productId}" does not exist in the active catalog.`
      );
    }

    // Find the requested variant or default variant
    let matchedVariant = product.variants?.find((v) => v.id === item.variantId);
    if (!matchedVariant) {
      if (product.variants && product.variants.length > 0) {
        matchedVariant = product.variants[0];
      } else {
        throw new PricingValidationError(
          'VARIANT_NOT_FOUND',
          `Product "${product.name}" has no available variants.`
        );
      }
    }

    // Stock verification
    if (revalidateStock) {
      const availableStock = Number(matchedVariant.stock ?? 0);
      if (availableStock < item.quantity) {
        throw new PricingValidationError(
          'INSUFFICIENT_STOCK',
          `Insufficient stock for "${product.name}" (${matchedVariant.name}). Requested: ${item.quantity}, Available: ${availableStock}.`,
          400,
          {
            productId: product.id,
            variantId: matchedVariant.id,
            requested: item.quantity,
            available: availableStock,
          }
        );
      }
    }

    // Authoritative server-side price (never trusting client item.price)
    const serverPrice = Number(matchedVariant.price);
    if (!Number.isFinite(serverPrice) || serverPrice <= 0) {
      throw new PricingValidationError(
        'INVALID_SERVER_PRICE',
        `Product "${product.name}" does not have a valid server price.`
      );
    }

    const serverOriginalPrice = Number(matchedVariant.originalPrice || serverPrice);
    const itemPricePaise = rupeesToPaise(serverPrice);
    const itemSubtotalPaise = itemPricePaise * item.quantity;

    subtotalPaise += itemSubtotalPaise;

    verifiedItems.push({
      productId: product.id,
      variantId: matchedVariant.id,
      name: product.name,
      variantName: matchedVariant.name,
      boxQuantity: matchedVariant.boxQuantity || '1 Unit',
      price: paiseToRupees(itemPricePaise),
      originalPrice: paiseToRupees(rupeesToPaise(serverOriginalPrice)),
      image: product.image,
      quantity: item.quantity,
      subtotal: paiseToRupees(itemSubtotalPaise),
    });
  }

  const subtotal = paiseToRupees(subtotalPaise);

  // 3. Validate Minimum Order Value
  const minOrderValue = STORE_DEFAULTS.MIN_ORDER_VALUE || 500;
  if (subtotal < minOrderValue) {
    throw new PricingValidationError(
      'MIN_ORDER_VALUE_NOT_MET',
      `Minimum order value is ₹${minOrderValue}. Your current subtotal is ₹${subtotal.toFixed(2)}.`
    );
  }

  // 4. Server-Side Delivery Fee & Geofence Calculation
  const deliverySettings = ServerStore.getDeliverySettings();
  const maxRadiusKm = getDeliveryRadiusKm();
  const freeDeliveryThreshold =
    deliverySettings.freeDeliveryThreshold || STORE_DEFAULTS.DEFAULT_FREE_DELIVERY_THRESHOLD || 3000;

  let deliveryFeePaise = 0;
  let isFreeDelivery = false;
  const freeDeliveryGap = Math.max(0, freeDeliveryThreshold - subtotal);

  let verifiedDistanceKm: number | undefined = undefined;

  if (options.customerCoordinates) {
    const { latitude, longitude } = options.customerCoordinates;
    if (!isValidCoordinate(latitude, longitude)) {
      throw new PricingValidationError(
        'INVALID_COORDINATES',
        'Invalid delivery coordinates provided. Latitude must be between -90 and 90, and longitude between -180 and 180.'
      );
    }
    const storeLoc = getStoreLocation();
    verifiedDistanceKm = calculateDistanceKm(storeLoc, {
      latitude: Number(latitude),
      longitude: Number(longitude),
    });
  } else if (distanceKm !== undefined && distanceKm !== null) {
    const dist = Number(distanceKm);
    if (!Number.isFinite(dist) || dist < 0) {
      throw new PricingValidationError('INVALID_DISTANCE', 'Invalid delivery distance supplied.');
    }
    verifiedDistanceKm = dist;
  }

  if (verifiedDistanceKm !== undefined) {
    if (verifiedDistanceKm > maxRadiusKm) {
      throw new PricingValidationError(
        'OUTSIDE_DELIVERY_RADIUS',
        OUT_OF_SERVICE_MESSAGE
      );
    }

    if (subtotal >= freeDeliveryThreshold) {
      deliveryFeePaise = 0;
      isFreeDelivery = true;
    } else {
      // Lookup slab
      const slabs = deliverySettings.slabs || DELIVERY_PRICING_SLABS;
      let matchedFee = 150; // fallback boundary fee
      for (const slab of slabs) {
        if (verifiedDistanceKm >= slab.minKm && verifiedDistanceKm <= slab.maxKm) {
          matchedFee = slab.fee;
          break;
        }
      }
      deliveryFeePaise = rupeesToPaise(matchedFee);
    }
  }

  // 5. Server-Side Coupon Validation
  let discountPaise = 0;
  let appliedCoupon: PricingCalculationResult['appliedCoupon'] = undefined;

  if (couponCode && typeof couponCode === 'string') {
    const cleanCode = couponCode.trim().toUpperCase();
    const allCoupons = ServerStore.getCoupons();
    const coupon = allCoupons.find((c: Coupon) => c.code.toUpperCase() === cleanCode);

    if (!coupon) {
      throw new PricingValidationError(
        'INVALID_COUPON',
        `Coupon code "${cleanCode}" is invalid.`
      );
    }

    if (!coupon.isActive) {
      throw new PricingValidationError(
        'COUPON_INACTIVE',
        `Coupon code "${cleanCode}" has expired or is no longer active.`
      );
    }

    const minAmount = coupon.minOrderAmount || 0;
    if (subtotal < minAmount) {
      throw new PricingValidationError(
        'COUPON_MIN_ORDER_NOT_MET',
        `Coupon "${cleanCode}" requires a minimum purchase of ₹${minAmount}. Current subtotal: ₹${subtotal.toFixed(2)}.`
      );
    }

    if (coupon.discountType === 'PERCENTAGE') {
      const rawPaise = Math.round((subtotalPaise * coupon.discountValue) / 100);
      if (coupon.maxDiscount && coupon.maxDiscount > 0) {
        const maxDiscountPaise = rupeesToPaise(coupon.maxDiscount);
        discountPaise = Math.min(rawPaise, maxDiscountPaise);
      } else {
        discountPaise = rawPaise;
      }
    } else if (coupon.discountType === 'FIXED_AMOUNT') {
      discountPaise = rupeesToPaise(coupon.discountValue);
    }

    // Ensure discount cannot exceed subtotal and cannot be negative
    discountPaise = Math.max(0, Math.min(discountPaise, subtotalPaise));

    appliedCoupon = {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    };
  }

  // 6. Tax Calculation
  // Standard Indian retail rule for consumer fireworks: all published product prices are MRP inclusive of GST.
  // Taxes are 0 additional unless explicitly configured otherwise.
  const taxPaise = 0;

  // 7. Calculate Authoritative Grand Total
  const totalPaise = Math.max(0, subtotalPaise - discountPaise + deliveryFeePaise + taxPaise);
  const totalAmount = paiseToRupees(totalPaise);

  if (!Number.isFinite(totalAmount) || totalAmount < 0 || isNaN(totalAmount)) {
    throw new PricingValidationError(
      'CALCULATION_OVERFLOW',
      'An internal calculation error occurred while computing the order total.'
    );
  }

  return {
    items: verifiedItems,
    subtotal,
    subtotalPaise,
    deliveryFee: paiseToRupees(deliveryFeePaise),
    deliveryFeePaise,
    isFreeDelivery,
    freeDeliveryThreshold,
    freeDeliveryGap,
    discountAmount: paiseToRupees(discountPaise),
    discountPaise,
    appliedCoupon,
    taxAmount: paiseToRupees(taxPaise),
    taxPaise,
    totalAmount,
    totalPaise,
    minOrderValue,
  };
}
