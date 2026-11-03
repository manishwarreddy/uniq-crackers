import test from 'node:test';
import assert from 'node:assert/strict';
import { ServerStore, ServerOrder, AdminNotification } from '../src/lib/server-store';
import { GET as getOrdersHandler, POST as postOrdersHandler } from '../src/app/api/orders/route';
import { GET as getNotificationsHandler, POST as postNotificationsHandler } from '../src/app/api/admin/notifications/route';
import { createAdminSessionToken, ADMIN_COOKIE_NAME } from '../src/lib/server-auth';
import { calculateDistanceKm, getDeliveryPricingForDistance, getStoreLocation } from '../src/lib/geo';
import { KNOWN_LOCALITIES } from '../src/lib/location-service';
import { calculateOrderPricing } from '../src/lib/pricing-engine';

process.env.ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'uniqcrackers_admin_session_secret_key_2026_diwali';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'UniqAdmin@2026#Velmala';

function createAdminRequest(url: string, method = 'GET', body?: any): Request {
  const token = createAdminSessionToken({
    userId: 'admin-01',
    name: 'Super Admin',
    role: 'ADMIN',
  });

  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      cookie: `${ADMIN_COOKIE_NAME}=${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function createUnauthRequest(url: string, method = 'GET', body?: any): Request {
  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ---------------------------------------------------------------------------
// TEST 1: NOTIFICATION PERSISTENCE & DISMISSAL
// ---------------------------------------------------------------------------
test('1. Admin notifications persist across reads and are not lost until explicitly dismissed', async () => {
  const testOrderNum = `UC-TEST-${Date.now()}`;
  const notif: AdminNotification = {
    id: `notif-test-${Date.now()}`,
    orderId: `ord-test-${Date.now()}`,
    orderNumber: testOrderNum,
    customerName: 'Pati Customer',
    customerPhone: '+91 9849012345',
    totalAmount: 1250,
    itemsCount: 2,
    deliveryAddress: 'Pati Village, Hyderabad 502300',
    distanceKm: 1.74,
    paymentMethod: 'COD',
    timestamp: new Date().toISOString(),
    isRead: false,
    isDismissed: false,
    whatsappUrl: 'https://wa.me/917032817823',
    formattedMessage: 'Order test notification',
  };

  // 1a. Add notification
  await ServerStore.addNotificationAsync(notif);

  // 1b. Retrieve via async getter
  const allNotifs = await ServerStore.getNotificationsAsync();
  const saved = allNotifs.find((n) => n.orderNumber === testOrderNum);
  assert.ok(saved, 'Notification must be found in ServerStore notifications');
  assert.equal(saved.customerName, 'Pati Customer');
  assert.equal(saved.isRead, false);
  assert.equal(Boolean(saved.isDismissed), false);

  // 1c. Verify GET /api/admin/notifications includes it and reflects unread count
  const req = createAdminRequest('http://localhost:3000/api/admin/notifications');
  const res = await getNotificationsHandler(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  const foundInApi = data.data.notifications.find((n: any) => n.orderNumber === testOrderNum);
  assert.ok(foundInApi, 'Notification must be returned by GET /api/admin/notifications');

  // 1d. Duplicate prevention: adding notification for same order updates rather than creates duplicate
  const duplicateNotif = { ...notif, customerName: 'Pati Customer Updated' };
  await ServerStore.addNotificationAsync(duplicateNotif);
  const afterDuplicate = await ServerStore.getNotificationsAsync();
  const matchingCount = afterDuplicate.filter((n) => n.orderNumber === testOrderNum).length;
  assert.equal(matchingCount, 1, 'Duplicate notifications for same order number must not be added');

  // 1e. Dismiss notification
  const dismissReq = createAdminRequest('http://localhost:3000/api/admin/notifications', 'POST', {
    action: 'DISMISS',
    id: notif.id,
  });
  const dismissRes = await postNotificationsHandler(dismissReq);
  assert.equal(dismissRes.status, 200);

  // 1f. Verify dismissed notification is marked as dismissed & read
  const notifsAfterDismiss = await ServerStore.getNotificationsAsync();
  const dismissedItem = notifsAfterDismiss.find((n) => n.id === notif.id);
  assert.ok(dismissedItem);
  assert.equal(dismissedItem.isDismissed, true);
  assert.equal(dismissedItem.isRead, true);

  // Clean up
  await ServerStore.deleteNotificationAsync(notif.id);
});

// ---------------------------------------------------------------------------
// TEST 2: ORDER PERSISTENCE WITH GEOGRAPHIC COORDINATES
// ---------------------------------------------------------------------------
test('2. Order creation persists geographic coordinates and ServerStore retrieves live orders', async () => {
  const testOrderNum = `UC-GEO-${Date.now()}`;
  const now = new Date().toISOString();

  const newOrder: ServerOrder = {
    id: `ord-geo-${Date.now()}`,
    orderNumber: testOrderNum,
    customerName: 'Naveen Reddy',
    customerPhone: '+91 9849088888',
    deliveryAddress: 'Pati Village Main Road, Hyderabad 502300',
    distanceKm: 1.74,
    latitude: 17.5037,
    longitude: 78.2409,
    subtotal: 1000,
    deliveryFee: 40,
    discountAmount: 0,
    totalAmount: 1040,
    paymentMethod: 'COD',
    paymentStatus: 'PENDING_COD',
    status: 'PENDING_REVIEW',
    deliveryOtp: '5678',
    orderAccessToken: 'test-token',
    items: [
      {
        productId: 'prod-sparkler-01',
        variantId: 'var-sparkler-01',
        name: 'Aura Luxe 24K Golden Sparklers',
        variantName: 'Pack of 10 Boxes',
        boxQuantity: '10 Boxes',
        price: 299,
        quantity: 2,
        image: '/images/sparklers.jpg',
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  // 2a. Save via createOrderAsync
  const saveResult = await ServerStore.createOrderAsync(newOrder);
  assert.equal(saveResult.success, true);

  // 2b. Retrieve via getOrderByIdAsync
  const retrieved = await ServerStore.getOrderByIdAsync(testOrderNum);
  assert.ok(retrieved, 'Order must be retrievable by orderNumber');
  assert.equal(retrieved.latitude, 17.5037);
  assert.equal(retrieved.longitude, 78.2409);
  assert.equal(retrieved.distanceKm, 1.74);

  // 2c. Verify GET /api/orders returns the order to admin with coordinates intact
  const adminReq = createAdminRequest('http://localhost:3000/api/orders');
  const adminRes = await getOrdersHandler(adminReq);
  assert.equal(adminRes.status, 200);
  const adminData = await adminRes.json();
  assert.equal(adminData.success, true);
  const foundOrder = adminData.data.find((o: any) => o.orderNumber === testOrderNum);
  assert.ok(foundOrder, 'Admin order list must contain the placed order');
  assert.equal(foundOrder.latitude, 17.5037);
  assert.equal(foundOrder.longitude, 78.2409);

  // Clean up
  ServerStore.deleteOrder(testOrderNum, { permanent: true });
});

// ---------------------------------------------------------------------------
// TEST 3: PATI LOCALITY & DELIVERY ELIGIBILITY
// ---------------------------------------------------------------------------
test('3. Pati locality is configured with verified coordinates and valid 7 km delivery eligibility', () => {
  // 3a. Check Pati in KNOWN_LOCALITIES
  const pati = KNOWN_LOCALITIES.find((l) => l.name === 'Pati');
  assert.ok(pati, 'Pati must be present in KNOWN_LOCALITIES');
  assert.equal(pati.lat, 17.5037, 'Pati latitude must be 17.5037');
  assert.equal(pati.lng, 78.2409, 'Pati longitude must be 78.2409');
  assert.equal(pati.pincode, '502300', 'Pati pincode must be 502300');

  // 3b. Distance calculation from Velmala Central Hub
  const storeLoc = getStoreLocation();
  const calculatedDistance = calculateDistanceKm(storeLoc, { latitude: pati.lat, longitude: pati.lng });
  // Pati is approximately 1.74 km from Velmala Hub (17.5029, 78.2573)
  assert.ok(calculatedDistance > 1.5 && calculatedDistance < 2.0, `Pati distance should be ~1.7 km, got ${calculatedDistance.toFixed(2)} km`);

  // 3c. Delivery pricing for Pati distance (~1.74 km)
  const pricing = getDeliveryPricingForDistance(calculatedDistance);
  assert.equal(pricing.isDeliverable, true, 'Pati must be deliverable within 7 km');
  assert.equal(pricing.fee, 40, 'Pati falls in 0-2 km slab with ₹40 delivery fee');

  // 3d. Order pricing engine validates Pati coordinates
  const sampleProduct = ServerStore.getProducts()[0];
  const sampleVariant = sampleProduct.variants[0];

  const orderPricing = calculateOrderPricing({
    items: [
      {
        productId: sampleProduct.id,
        variantId: sampleVariant.id,
        quantity: Math.max(2, Math.ceil(500 / sampleVariant.price)),
      },
    ],
    customerCoordinates: {
      latitude: pati.lat,
      longitude: pati.lng,
    },
    revalidateStock: false,
  });

  assert.equal(orderPricing.deliveryFee, 40);
  assert.ok(orderPricing.totalAmount > 0);
});

// ---------------------------------------------------------------------------
// TEST 4: RAPID RETRY DUPLICATE ORDER PREVENTION
// ---------------------------------------------------------------------------
test('4. Rapid double-submit / retry order is intercepted and does not create duplicate order', async () => {
  const sampleProduct = ServerStore.getProducts()[0];
  const sampleVariant = sampleProduct.variants[0];
  const testPhone = `9849${Math.floor(100000 + Math.random() * 900000)}`;

  const reqBody = {
    customerName: 'Duplicate Test Customer',
    customerPhone: testPhone,
    deliveryAddress: 'Pati Village, Hyderabad 502300',
    latitude: 17.5037,
    longitude: 78.2409,
    paymentMethod: 'COD',
    items: [
      {
        productId: sampleProduct.id,
        variantId: sampleVariant.id,
        name: sampleProduct.name,
        price: sampleVariant.price,
        quantity: Math.max(2, Math.ceil(500 / sampleVariant.price)),
      },
    ],
  };

  // Submit first order
  const req1 = createUnauthRequest('http://localhost:3000/api/orders', 'POST', reqBody);
  const res1 = await postOrdersHandler(req1);
  assert.equal(res1.status, 200);
  const data1 = await res1.json();
  assert.equal(data1.success, true);
  const orderNumber1 = data1.data.order.orderNumber;

  // Immediately submit identical request
  const req2 = createUnauthRequest('http://localhost:3000/api/orders', 'POST', reqBody);
  const res2 = await postOrdersHandler(req2);
  assert.equal(res2.status, 200, 'Duplicate submission should return 200 OK');
  const data2 = await res2.json();
  assert.equal(data2.success, true);
  assert.equal(data2.data.isDuplicate, true);
  assert.equal(data2.data.order.orderNumber, orderNumber1, 'Should return the existing order without creating a duplicate');

  // Clean up
  ServerStore.deleteOrder(orderNumber1, { permanent: true });
});
