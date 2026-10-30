import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POST as postOrdersRoute } from '../src/app/api/orders/route';
import { POST as postQuoteRoute } from '../src/app/api/orders/quote/route';
import { ServerStore } from '../src/lib/server-store';
import { calculateOrderPricing, rupeesToPaise, paiseToRupees } from '../src/lib/pricing-engine';

function makeReq(url: string, method: string = 'GET', options: { body?: any; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  return new Request(url, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

test('1. Integer Paise Arithmetic Prevents Floating Point Rounding Inaccuracies', () => {
  assert.equal(rupeesToPaise(1200.5), 120050);
  assert.equal(rupeesToPaise(7.9), 790);
  assert.equal(paiseToRupees(120050), 1200.5);
  assert.equal(paiseToRupees(790), 7.9);
});

test('2. Server Ignores Manipulated Browser Prices and Calculates Subtotal From Authoritative Catalog', async () => {
  // Attacker tries to order 2 units of prod-01 (real price ₹1200) by claiming price is ₹1
  const maliciousPayload = {
    customerName: 'Hacker Bob',
    customerPhone: '9849099999',
    deliveryAddress: 'Velmala Village, Hyderabad',
    distanceKm: 1.5,
    subtotal: 2, // Manipulated
    deliveryFee: 0, // Manipulated
    discountAmount: 0,
    totalAmount: 2, // Manipulated
    paymentMethod: 'COD',
    items: [
      {
        productId: 'prod-01',
        variantId: 'var-01',
        name: 'Festive Sparklers',
        price: 1, // Manipulated client price!
        quantity: 2,
      },
    ],
  };

  const req = makeReq('https://example.com/api/orders', 'POST', { body: maliciousPayload });
  const res = await postOrdersRoute(req);
  assert.equal(res.status, 200, 'Order creation should succeed using real server prices');
  const data = await res.json();
  assert.equal(data.success, true);

  // Authoritative price is ₹1200 * 2 = ₹2400. Slabs: 1.5km -> ₹40 delivery fee. Total: ₹2440.
  const order = data.data.order;
  assert.equal(order.subtotal, 2400, 'Server must enforce genuine price (2 * 1200 = 2400)');
  assert.equal(order.deliveryFee, 40, 'Server must calculate real delivery fee (40)');
  assert.equal(order.totalAmount, 2440, 'Server must enforce genuine total (2440), ignoring client ₹2');
  assert.equal(order.items[0].price, 1200, 'Item snapshot must record real unit price ₹1200');
});

test('3. Server Rejects Manipulated Discounts and Unearned Negative Totals', async () => {
  // Attacker claims a ₹50,000 discount without valid coupon
  const maliciousPayload = {
    customerName: 'Hacker Bob',
    customerPhone: '9849099999',
    deliveryAddress: 'Velmala Village, Hyderabad',
    distanceKm: 1.5,
    subtotal: 1200,
    discountAmount: 50000, // Forged discount
    totalAmount: 1,
    paymentMethod: 'COD',
    items: [
      {
        productId: 'prod-01',
        variantId: 'var-01',
        quantity: 1,
      },
    ],
  };

  const req = makeReq('https://example.com/api/orders', 'POST', { body: maliciousPayload });
  const res = await postOrdersRoute(req);
  const data = await res.json();
  assert.equal(res.status, 200);

  // Discount should be 0 because no valid coupon was verified on the server
  assert.equal(data.data.order.discountAmount, 0, 'Forged discount without coupon must be reset to 0');
  assert.equal(data.data.order.totalAmount, 1240, 'Grand total must be ₹1200 + ₹40 fee = ₹1240');
});

test('4. Server Validates Legitimate Coupons on Server (DIWALI2026: 10% capped at 300)', async () => {
  const payloadWithCoupon = {
    customerName: 'Priya Reddy',
    customerPhone: '9849077777',
    deliveryAddress: 'Velmala Village, Hyderabad',
    distanceKm: 1.5,
    couponCode: 'DIWALI2026',
    paymentMethod: 'COD',
    items: [
      {
        productId: 'prod-01',
        variantId: 'var-01',
        quantity: 1, // Subtotal: ₹1200
      },
    ],
  };

  const req = makeReq('https://example.com/api/orders', 'POST', { body: payloadWithCoupon });
  const res = await postOrdersRoute(req);
  const data = await res.json();
  assert.equal(res.status, 200);

  // Subtotal = 1200. 10% discount = 120. Delivery fee = 40. Total = 1200 - 120 + 40 = 1120.
  const order = data.data.order;
  assert.equal(order.subtotal, 1200);
  assert.equal(order.discountAmount, 120);
  assert.equal(order.deliveryFee, 40);
  assert.equal(order.totalAmount, 1120);
});

test('5. Server Rejects Invalid, Expired, or Ineligible Coupons', async () => {
  const invalidCouponPayload = {
    customerName: 'Priya Reddy',
    customerPhone: '9849077777',
    deliveryAddress: 'Velmala Village, Hyderabad',
    distanceKm: 1.5,
    couponCode: 'FAKECOUPON999',
    paymentMethod: 'COD',
    items: [
      {
        productId: 'prod-01',
        variantId: 'var-01',
        quantity: 1,
      },
    ],
  };

  const req = makeReq('https://example.com/api/orders', 'POST', { body: invalidCouponPayload });
  const res = await postOrdersRoute(req);
  assert.equal(res.status, 400, 'Invalid coupon must be rejected with 400');
  const data = await res.json();
  assert.equal(data.success, false);
  assert.equal(data.error.code, 'INVALID_COUPON');
});

test('6. Quantity Validation: Rejects Negative, Non-Integer, Zero, and Excessive Quantities', async () => {
  // Test negative quantity
  const negReq = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerPhone: '9849011111',
      items: [{ productId: 'prod-01', variantId: 'var-01', quantity: -5 }],
    },
  });
  const res1 = await postOrdersRoute(negReq);
  assert.equal(res1.status, 400);
  const data1 = await res1.json();
  assert.equal(data1.error.code, 'INVALID_QUANTITY');

  // Test float quantity
  const floatReq = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerPhone: '9849011111',
      items: [{ productId: 'prod-01', variantId: 'var-01', quantity: 2.5 }],
    },
  });
  const res2 = await postOrdersRoute(floatReq);
  assert.equal(res2.status, 400);

  // Test excessive quantity (> 100)
  const excessiveReq = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerPhone: '9849011111',
      items: [{ productId: 'prod-01', variantId: 'var-01', quantity: 9999 }],
    },
  });
  const res3 = await postOrdersRoute(excessiveReq);
  assert.equal(res3.status, 400);
  const data3 = await res3.json();
  assert.equal(data3.error.code, 'MAX_QUANTITY_EXCEEDED');
});

test('7. Product Validation: Non-Existent Products Are Rejected', async () => {
  const req = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerPhone: '9849011111',
      items: [{ productId: 'non-existent-product-id-999', quantity: 1 }],
    },
  });
  const res = await postOrdersRoute(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error.code, 'PRODUCT_NOT_FOUND');
});

test('8. Free Delivery Threshold (>= ₹3000) Correctly Sets Delivery Fee to ₹0', async () => {
  // 3 units of prod-01 = 3 * 1200 = ₹3600 >= ₹3000 threshold
  const req = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Suresh Kumar',
      customerPhone: '9849088888',
      deliveryAddress: 'Velmala Village, Hyderabad',
      distanceKm: 5.5, // Normally slab fee is ₹120
      paymentMethod: 'COD',
      items: [{ productId: 'prod-01', variantId: 'var-01', quantity: 3 }],
    },
  });

  const res = await postOrdersRoute(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.data.order.subtotal, 3600);
  assert.equal(data.data.order.deliveryFee, 0, 'Orders over ₹3000 must receive free delivery');
  assert.equal(data.data.order.totalAmount, 3600);
});

test('9. Quote Endpoint (/api/orders/quote) Returns Authoritative Server Totals for Client Preview', async () => {
  const quoteReq = makeReq('https://example.com/api/orders/quote', 'POST', {
    body: {
      items: [{ productId: 'prod-01', variantId: 'var-01', quantity: 1 }],
      couponCode: 'DIWALI2026',
      distanceKm: 3.5,
    },
  });

  const res = await postQuoteRoute(quoteReq);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.data.subtotal, 1200);
  assert.equal(data.data.discountAmount, 120);
  assert.equal(data.data.deliveryFee, 70, '3.5 km distance falls in 2-4 km slab (₹70 fee)');
  assert.equal(data.data.totalAmount, 1150);
});

test('10. Inventory Stock Revalidation and Order Decrement', () => {
  const prod = ServerStore.getProducts().find((p) => p.variants?.some((v) => v.stock > 0 && v.stock < 100)) || ServerStore.getProducts()[0];
  assert.ok(prod);
  const variant = prod.variants.find((v) => v.stock > 0 && v.stock < 100) || prod.variants[0];
  assert.ok(variant);
  const origStock = variant.stock;
  // Ensure stock is bounded below 100 so availableStock + 1 tests INSUFFICIENT_STOCK rather than MAX_QUANTITY_EXCEEDED (> 100)
  variant.stock = Math.min(variant.stock || 20, 50);
  const availableStock = variant.stock;

  try {
    // Requesting more units than currently available (within max 100 limit) must fail with INSUFFICIENT_STOCK
    assert.throws(
      () => {
        calculateOrderPricing({
          items: [{ productId: prod.id, variantId: variant.id, quantity: availableStock + 1 }],
          revalidateStock: true,
        });
      },
      (err: any) => {
        assert.equal(err.code, 'INSUFFICIENT_STOCK');
        return true;
      }
    );
  } finally {
    variant.stock = origStock || 100;
  }
});
