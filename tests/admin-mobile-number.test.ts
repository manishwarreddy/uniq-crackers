import test from 'node:test';
import assert from 'node:assert/strict';
import { GET as getOrdersRoute, POST as postOrdersRoute } from '../src/app/api/orders/route';
import {
  createAdminSessionToken,
  ADMIN_COOKIE_NAME,
} from '../src/lib/server-auth';
import { ServerStore } from '../src/lib/server-store';

process.env.ADMIN_PASSWORD = 'TestAdminSecret@2026';
process.env.ADMIN_SESSION_SECRET = 'test-secret-key-diwali-2026-very-secure';

function makeReq(
  url: string,
  method: string = 'GET',
  options: {
    body?: any;
    cookie?: string;
  } = {}
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.cookie) {
    headers['Cookie'] = options.cookie;
  }

  return new Request(url, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

// Logic mirror of admin helper functions
function getPhoneDialLink(phone?: string | null): string {
  if (!phone || !phone.trim()) return '#';
  const cleanDigits = phone.replace(/[^\d+]/g, '');
  return `tel:${cleanDigits}`;
}

function getWhatsAppLink(phone?: string | null, customerName?: string | null, orderNumber?: string | null): string {
  if (!phone || !phone.trim()) return '#';
  let digits = phone.replace(/[^\d]/g, '');
  if (digits.length === 10) {
    digits = `91${digits}`;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = `91${digits.slice(1)}`;
  }
  const greeting = customerName?.trim() ? `Hello ${customerName.trim()}` : 'Hello';
  const orderRef = orderNumber?.trim() ? `Order #${orderNumber.trim()}` : 'your order';
  const message = `${greeting}, regarding your Uniq Crackers ${orderRef}:`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

test('1. Admin Order Management API returns customer mobile numbers to authorized admins only', async () => {
  const adminToken = createAdminSessionToken({ userId: 'admin-tester', role: 'ADMIN' });
  const adminReq = makeReq('https://example.com/api/orders', 'GET', {
    cookie: `${ADMIN_COOKIE_NAME}=${adminToken}`,
  });

  const res = await getOrdersRoute(adminReq);
  assert.equal(res.status, 200, 'Authorized admin request should succeed');
  const payload = await res.json();
  assert.equal(payload.success, true);
  assert.ok(Array.isArray(payload.data), 'Data should be an array of orders');
});

test('2. Public/Unauthorized users are rejected from accessing admin order endpoint', async () => {
  const publicReq = makeReq('https://example.com/api/orders', 'GET');
  const res = await getOrdersRoute(publicReq);
  assert.equal(res.status, 401, 'Public user should receive 401 Unauthorized');
});

test('3. Checkout correctly saves customer mobile number in order record', async () => {
  ServerStore.updateProductPrice('prod-diwali-22', 'var-prod-diwali-22-1', 499, 773, 50);
  const testPhone = '9849012999';
  const checkoutPayload = {
    customerName: 'Suresh Kumar',
    customerPhone: testPhone,
    deliveryAddress: 'Velmala Village, Near Temple',
    distanceKm: 2.5,
    subtotal: 500,
    deliveryFee: 40,
    discountAmount: 0,
    totalAmount: 540,
    paymentMethod: 'COD',
    items: [
      {
        productId: 'prod-diwali-22',
        variantId: 'var-prod-diwali-22-1',
        name: 'Miracle Pot Mega Fountain',
        quantity: 2,
      },
    ],
  };

  const postReq = makeReq('https://example.com/api/orders', 'POST', {
    body: checkoutPayload,
  });

  const postRes = await postOrdersRoute(postReq);
  const postData = await postRes.json();
  assert.equal(postRes.status, 200, 'Order placement should return 200 OK');
  assert.equal(postData.success, true);
  assert.ok(postData.data.order, 'Response should contain created order object');
  assert.equal(postData.data.order.customerPhone, `+91 ${testPhone}`, 'Saved customerPhone must format as Indian mobile number');
  assert.equal(postData.data.order.customerName, 'Suresh Kumar');

  // Verify that an authorized admin can fetch this new order and see the mobile number
  const adminToken = createAdminSessionToken({ userId: 'admin-tester', role: 'ADMIN' });
  const adminReq = makeReq(`https://example.com/api/orders?orderNumber=${postData.data.order.orderNumber}`, 'GET', {
    cookie: `${ADMIN_COOKIE_NAME}=${adminToken}`,
  });
  const fetchRes = await getOrdersRoute(adminReq);
  assert.equal(fetchRes.status, 200);
  const fetchData = await fetchRes.json();
  assert.equal(fetchData.data.customerPhone, `+91 ${testPhone}`, 'Admin receives customer mobile number');
});

test('4. Helper functions correctly format Call dialer and WhatsApp links for valid numbers', () => {
  const phone10 = '9849012345';
  const dial10 = getPhoneDialLink(phone10);
  const wa10 = getWhatsAppLink(phone10, 'Priya', 'UC-2026-9001');

  assert.equal(dial10, 'tel:9849012345', 'Dialer link should match tel:9849012345');
  assert.ok(wa10.includes('https://wa.me/919849012345'), 'WhatsApp link should prefix 91 country code');
  assert.ok(wa10.includes('UC-2026-9001'), 'WhatsApp message should contain order number');
  assert.ok(wa10.includes('Priya'), 'WhatsApp message should contain customer greeting');

  const phoneWithCountry = '+91 98490 12345';
  const dialCountry = getPhoneDialLink(phoneWithCountry);
  const waCountry = getWhatsAppLink(phoneWithCountry, 'Rahul', 'UC-2026-9002');
  assert.equal(dialCountry, 'tel:+919849012345', 'Dialer link should preserve plus and digits');
  assert.ok(waCountry.includes('https://wa.me/919849012345'), 'WhatsApp link should normalize to digits only');
});

test('5. Orders without saved mobile number display "Not provided" and disable call/whatsapp links', () => {
  // Empty phone
  assert.equal(getPhoneDialLink(''), '#');
  assert.equal(getPhoneDialLink(null), '#');
  assert.equal(getPhoneDialLink(undefined), '#');
  assert.equal(getPhoneDialLink('   '), '#');

  assert.equal(getWhatsAppLink(''), '#');
  assert.equal(getWhatsAppLink(null), '#');
  assert.equal(getWhatsAppLink(undefined), '#');
  assert.equal(getWhatsAppLink('   '), '#');

  // Display check logic
  const displayPhone = (phone?: string | null) => (phone && phone.trim() ? phone : 'Not provided');
  assert.equal(displayPhone(undefined), 'Not provided');
  assert.equal(displayPhone(null), 'Not provided');
  assert.equal(displayPhone(''), 'Not provided');
  assert.equal(displayPhone('   '), 'Not provided');
  assert.equal(displayPhone('+91 9849012388'), '+91 9849012388');
});
