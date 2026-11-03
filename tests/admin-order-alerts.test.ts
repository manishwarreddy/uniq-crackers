import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ServerStore, ServerOrder, AdminNotification } from '../src/lib/server-store';
import { GET as getNotificationsHandler, POST as postNotificationsHandler } from '../src/app/api/admin/notifications/route';
import { POST as postOrdersHandler } from '../src/app/api/orders/route';
import { createAdminSessionToken, ADMIN_COOKIE_NAME } from '../src/lib/server-auth';
import { STORE_DEFAULTS } from '../src/lib/constants';

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
// TEST 1: NEW-ORDER NOTIFICATION DETECTION & ORDER CREATION
// ---------------------------------------------------------------------------
test('1. Every successfully saved order creates or is detected as an admin notification', async () => {
  const sampleProduct = ServerStore.getProducts()[0];
  const sampleVariant = sampleProduct.variants[0];
  const testPhone = `9849${Math.floor(100000 + Math.random() * 900000)}`;

  const orderPayload = {
    customerName: 'Alarm Test Customer',
    customerPhone: testPhone,
    deliveryAddress: 'Velmala Village, Hyderabad 502300',
    latitude: 17.5029,
    longitude: 78.2573,
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

  const postReq = createUnauthRequest('http://localhost:3000/api/orders', 'POST', orderPayload);
  const postRes = await postOrdersHandler(postReq);
  assert.equal(postRes.status, 200);
  const postData = await postRes.json();
  assert.equal(postData.success, true);
  const createdOrderNum = postData.data.order.orderNumber;

  // Retrieve notifications
  const notifReq = createAdminRequest('http://localhost:3000/api/admin/notifications');
  const notifRes = await getNotificationsHandler(notifReq);
  assert.equal(notifRes.status, 200);
  const notifData = await notifRes.json();
  assert.equal(notifData.success, true);

  const foundNotif = notifData.data.notifications.find(
    (n: AdminNotification) => n.orderNumber.toUpperCase() === createdOrderNum.toUpperCase()
  );
  assert.ok(foundNotif, 'New order must be detected in notifications list');
  assert.equal(foundNotif.customerName, 'Alarm Test Customer');
  assert.equal(foundNotif.isRead, false);
  assert.equal(foundNotif.isDismissed, false);
  assert.ok(foundNotif.totalAmount >= 500);

  // Clean up
  ServerStore.deleteOrder(createdOrderNum, { permanent: true });
  ServerStore.deleteNotification(foundNotif.id);
});

// ---------------------------------------------------------------------------
// TEST 2: PERSISTENT NOTIFICATION RETRIEVAL & RETENTION ACROSS READS
// ---------------------------------------------------------------------------
test('2. Unread and undismissed notifications persist across reads and page refreshes', async () => {
  const testNum = `UC-PERSIST-${Date.now()}`;
  const notif: AdminNotification = {
    id: `notif-persist-${Date.now()}`,
    orderId: `ord-persist-${Date.now()}`,
    orderNumber: testNum,
    customerName: 'Persistent Customer',
    customerPhone: '+91 70328 17823',
    totalAmount: 1850,
    itemsCount: 3,
    deliveryAddress: 'Pati Village Main Road',
    distanceKm: 1.74,
    paymentMethod: 'COD',
    timestamp: new Date().toISOString(),
    isRead: false,
    isDismissed: false,
    whatsappUrl: 'https://wa.me/917032817823',
    formattedMessage: 'Order notification',
  };

  await ServerStore.addNotificationAsync(notif);

  // Fetch multiple times (simulating reloads and polling)
  for (let i = 0; i < 3; i++) {
    const req = createAdminRequest('http://localhost:3000/api/admin/notifications');
    const res = await getNotificationsHandler(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    const target = data.data.notifications.find((n: AdminNotification) => n.orderNumber === testNum);
    assert.ok(target, `Notification must remain available on read #${i + 1}`);
    assert.equal(target.isDismissed, false);
  }

  // Clean up
  ServerStore.deleteNotification(notif.id);
});

// ---------------------------------------------------------------------------
// TEST 3: DUPLICATE NOTIFICATION PREVENTION
// ---------------------------------------------------------------------------
test('3. Duplicate notifications for the same order are prevented', async () => {
  const testNum = `UC-DEDUP-${Date.now()}`;
  const notif1: AdminNotification = {
    id: `notif-dup-1-${Date.now()}`,
    orderId: `ord-dup-${Date.now()}`,
    orderNumber: testNum,
    customerName: 'Dedup Customer',
    customerPhone: '+91 70328 17823',
    totalAmount: 1200,
    itemsCount: 2,
    deliveryAddress: 'Velmala',
    distanceKm: 1.0,
    paymentMethod: 'COD',
    timestamp: new Date().toISOString(),
    isRead: false,
    isDismissed: false,
    whatsappUrl: 'https://wa.me/917032817823',
    formattedMessage: 'Message 1',
  };

  const notif2: AdminNotification = {
    ...notif1,
    id: `notif-dup-2-${Date.now()}`,
    formattedMessage: 'Message 2 (updated)',
  };

  await ServerStore.addNotificationAsync(notif1);
  await ServerStore.addNotificationAsync(notif2);

  const notifications = await ServerStore.getNotificationsAsync();
  const matching = notifications.filter((n) => n.orderNumber.toUpperCase() === testNum.toUpperCase());
  assert.equal(matching.length, 1, 'Should never create duplicate notifications for the same order');

  // Clean up
  ServerStore.deleteNotification(matching[0].id);
});

// ---------------------------------------------------------------------------
// TEST 4: AUDIBLE ALARM ACTIVATION STATE & ACKNOWLEDGEMENT / DISMISSAL
// ---------------------------------------------------------------------------
test('4. Unacknowledged notifications activate alarm criteria, and dismissal stops alarm', async () => {
  const testNum = `UC-ALARM-${Date.now()}`;
  const notif: AdminNotification = {
    id: `notif-alarm-${Date.now()}`,
    orderId: `ord-alarm-${Date.now()}`,
    orderNumber: testNum,
    customerName: 'Alarm User',
    customerPhone: '+91 70328 17823',
    totalAmount: 2500,
    itemsCount: 4,
    deliveryAddress: 'Velmala',
    distanceKm: 0.5,
    paymentMethod: 'COD',
    timestamp: new Date().toISOString(),
    isRead: false,
    isDismissed: false,
    whatsappUrl: 'https://wa.me/917032817823',
    formattedMessage: 'Alarm Test Message',
  };

  await ServerStore.addNotificationAsync(notif);

  // 4a. Verify notification meets unacknowledged alarm criteria (!isRead && !isDismissed)
  const allNotifs = await ServerStore.getNotificationsAsync();
  const unacknowledged = allNotifs.filter((n) => !n.isRead && !n.isDismissed);
  assert.ok(unacknowledged.some((n) => n.orderNumber === testNum), 'Must be active in unacknowledged alarm list');

  // 4b. Dismiss the notification via API
  const dismissReq = createAdminRequest('http://localhost:3000/api/admin/notifications', 'POST', {
    action: 'DISMISS',
    id: notif.id,
  });
  const dismissRes = await postNotificationsHandler(dismissReq);
  assert.equal(dismissRes.status, 200);
  const dismissData = await dismissRes.json();
  assert.equal(dismissData.success, true);

  // 4c. Verify notification is no longer in unacknowledged list (alarm silences)
  const refreshedNotifs = await ServerStore.getNotificationsAsync();
  const target = refreshedNotifs.find((n) => n.id === notif.id);
  assert.ok(target);
  assert.equal(target.isDismissed, true, 'Notification is marked dismissed');

  const remainingUnacknowledged = refreshedNotifs.filter((n) => !n.isRead && !n.isDismissed && n.id === notif.id);
  assert.equal(remainingUnacknowledged.length, 0, 'Dismissed notification stops triggering audio alarm');

  // Clean up
  ServerStore.deleteNotification(notif.id);
});

// ---------------------------------------------------------------------------
// TEST 5: DELIVERY PARTNER PHONE NUMBER VERIFICATION
// ---------------------------------------------------------------------------
test('5. Delivery Partner phone number is +91 70328 17823 across all customer contact points', async () => {
  // 5a. STORE_DEFAULTS.SUPPORT_PHONE must be +91 70328 17823
  const expectedPhone = '+91 70328 17823';
  assert.equal(STORE_DEFAULTS.SUPPORT_PHONE, expectedPhone, 'STORE_DEFAULTS.SUPPORT_PHONE must match +91 70328 17823');

  // 5b. Track order page must contain tel:+917032817823 and display +91 70328 17823
  const trackOrderFile = path.join(process.cwd(), 'src/app/track-order/page.tsx');
  const trackOrderCode = fs.readFileSync(trackOrderFile, 'utf8');
  assert.ok(
    trackOrderCode.includes('href="tel:+917032817823"'),
    'Call Delivery Partner must use href="tel:+917032817823"'
  );
  assert.ok(
    trackOrderCode.includes('+91 70328 17823'),
    'Track order page must display formatted +91 70328 17823'
  );

  // 5c. Header contact link must use +917032817823
  const headerFile = path.join(process.cwd(), 'src/components/layout/Header.tsx');
  const headerCode = fs.readFileSync(headerFile, 'utf8');
  assert.ok(
    headerCode.includes('href="tel:+917032817823"'),
    'Header hub contact link must use tel:+917032817823'
  );

  // 5d. Homepage floating WhatsApp button must use 917032817823
  const homeFile = path.join(process.cwd(), 'src/app/page.tsx');
  const homeCode = fs.readFileSync(homeFile, 'utf8');
  assert.ok(
    homeCode.includes('wa.me/917032817823'),
    'Homepage WhatsApp floating link must use wa.me/917032817823'
  );
});

// ---------------------------------------------------------------------------
// TEST 6: NO REMAINING INCORRECT DELIVERY-PARTNER REFERENCES TO 9000000000
// ---------------------------------------------------------------------------
test('6. No delivery partner or store support contacts reference 9000000000', async () => {
  const filesToCheck = [
    'src/lib/constants.ts',
    'src/app/track-order/page.tsx',
    'src/components/layout/Header.tsx',
    'src/app/page.tsx',
    'src/lib/notifications.ts',
    'src/app/api/orders/route.ts',
    'src/app/api/admin/notifications/whatsapp/route.ts',
    'docs/ENVIRONMENT_CONFIG.md',
    'prisma/schema.prisma',
  ];

  for (const relPath of filesToCheck) {
    const fullPath = path.join(process.cwd(), relPath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.equal(
      content.includes('9000000000'),
      false,
      `File ${relPath} must not contain 9000000000 delivery partner contact reference`
    );
  }
});

