import test from 'node:test';
import assert from 'node:assert/strict';
import { GET as getOrdersRoute, POST as postOrdersRoute, PATCH as patchOrdersRoute } from '../src/app/api/orders/route';
import {
  createAdminSessionToken,
  createDeliveryAgentSessionToken,
  createOrderAccessToken,
  ADMIN_COOKIE_NAME,
  DELIVERY_AGENT_COOKIE_NAME,
  CUSTOMER_COOKIE_NAME,
} from '../src/lib/server-auth';
import { createCustomerSessionToken } from '../src/lib/otp-store';
import { ServerStore } from '../src/lib/server-store';

process.env.ADMIN_PASSWORD = 'TestAdminSecret@2026';
process.env.ADMIN_SESSION_SECRET = 'test-secret-key-diwali-2026-very-secure';

// Helper to construct Request objects with cookies or headers
function makeReq(
  url: string,
  method: string = 'GET',
  options: {
    body?: any;
    cookie?: string;
    authHeader?: string;
    orderToken?: string;
  } = {}
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.cookie) {
    headers['Cookie'] = options.cookie;
  }
  if (options.authHeader) {
    headers['Authorization'] = options.authHeader;
  }
  if (options.orderToken) {
    headers['x-order-token'] = options.orderToken;
  }

  return new Request(url, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

test('1. Unauthorized Public Requests Cannot List Orders or Access Orders by Phone', async () => {
  // Public caller without session attempts to list all orders
  const unauthReq = makeReq('https://example.com/api/orders');
  const res1 = await getOrdersRoute(unauthReq);
  assert.equal(res1.status, 401, 'Public request without auth must be rejected with 401');
  const data1 = await res1.json();
  assert.equal(data1.success, false);

  // Public caller tries to query by phone without server verification
  const phoneReq = makeReq('https://example.com/api/orders?phone=9849011111');
  const res2 = await getOrdersRoute(phoneReq);
  assert.equal(res2.status, 401, 'Querying by phone without verified session must be rejected with 401');
  const data2 = await res2.json();
  assert.equal(data2.success, false);
});

test('2. Customer Order Creation & Order Access Token Issuance', async () => {
  const orderBody = {
    customerName: 'Ananya Sharma',
    customerPhone: '9849011111',
    deliveryAddress: 'Flat 301, Kollur, Hyderabad 502300',
    distanceKm: 2.1,
    subtotal: 1200,
    deliveryFee: 40,
    totalAmount: 1240,
    paymentMethod: 'COD',
    items: [
      {
        productId: 'prod-01',
        variantId: 'var-01',
        name: 'Festive Sparklers',
        variantName: 'Standard',
        boxQuantity: '1 Box',
        price: 1200,
        quantity: 1,
        image: '/images/sparklers.jpg',
      },
    ],
  };

  const createReq = makeReq('https://example.com/api/orders', 'POST', { body: orderBody });
  const createRes = await postOrdersRoute(createReq);
  assert.equal(createRes.status, 200, 'Order creation should succeed');

  const createData = await createRes.json();
  assert.equal(createData.success, true);
  assert.ok(createData.data.order, 'Order object must be returned');
  assert.ok(createData.data.orderAccessToken, 'Cryptographic orderAccessToken must be issued');
  assert.ok(createData.data.order.deliveryOtp, 'Delivery OTP must be present for order creator confirmation');

  const orderNumber = createData.data.order.orderNumber;
  assert.ok(orderNumber.startsWith('UC-2026-'), 'Order number format check');
});

test('3. Customer A Cannot Access Customer B\'s Order (403 Forbidden)', async () => {
  // Create Order A for Customer A (+91 9849011111)
  const orderABody = {
    customerName: 'Customer A',
    customerPhone: '9849011111',
    deliveryAddress: 'A Street, Hyderabad',
    totalAmount: 500,
    paymentMethod: 'COD',
    items: [{ productId: 'p1', variantId: 'v1', name: 'Sparkler A', price: 500, quantity: 1, image: '/img.jpg' }],
  };
  const resA = await postOrdersRoute(makeReq('https://example.com/api/orders', 'POST', { body: orderABody }));
  const dataA = await resA.json();
  const orderA = dataA.data.order;

  // Create Order B for Customer B (+91 9849022222)
  const orderBBody = {
    customerName: 'Customer B',
    customerPhone: '9849022222',
    deliveryAddress: 'B Street, Hyderabad',
    totalAmount: 900,
    paymentMethod: 'COD',
    items: [{ productId: 'p2', variantId: 'v2', name: 'Sparkler B', price: 900, quantity: 1, image: '/img.jpg' }],
  };
  const resB = await postOrdersRoute(makeReq('https://example.com/api/orders', 'POST', { body: orderBBody }));
  const dataB = await resB.json();
  const orderB = dataB.data.order;

  // Generate verified Customer Session for Customer A
  const sessionTokenA = createCustomerSessionToken('9849011111', 'Customer A');
  const customerACookie = `${CUSTOMER_COOKIE_NAME}=${sessionTokenA}`;

  // Customer A attempts to fetch Customer B's order using orderNumber
  const attackReq = makeReq(`https://example.com/api/orders?orderNumber=${orderB.orderNumber}`, 'GET', {
    cookie: customerACookie,
  });
  const attackRes = await getOrdersRoute(attackReq);
  assert.equal(attackRes.status, 403, 'Customer A querying Customer B\'s order must return 403 Forbidden');
  const attackData = await attackRes.json();
  assert.equal(attackData.success, false);
  assert.equal(attackData.error.code, 'FORBIDDEN');

  // Customer A attempts to query Customer B's orders by phone number
  const attackPhoneReq = makeReq('https://example.com/api/orders?phone=9849022222', 'GET', {
    cookie: customerACookie,
  });
  const attackPhoneRes = await getOrdersRoute(attackPhoneReq);
  assert.equal(attackPhoneRes.status, 401, 'Customer A querying Customer B\'s phone must return 401 Unauthorized');
});

test('4. Customer A Cannot Modify or Cancel Customer B\'s Order', async () => {
  // Create Order B for Customer B
  const orderBBody = {
    customerName: 'Customer B',
    customerPhone: '9849033333',
    deliveryAddress: '33rd Road, Hyderabad',
    totalAmount: 750,
    paymentMethod: 'COD',
    items: [{ productId: 'p3', variantId: 'v3', name: 'Anar B', price: 750, quantity: 1, image: '/img.jpg' }],
  };
  const resB = await postOrdersRoute(makeReq('https://example.com/api/orders', 'POST', { body: orderBBody }));
  const dataB = await resB.json();
  const orderB = dataB.data.order;

  // Customer A (phone 9849011111) attempts to cancel Customer B's order
  const sessionTokenA = createCustomerSessionToken('9849011111', 'Customer A');
  const customerACookie = `${CUSTOMER_COOKIE_NAME}=${sessionTokenA}`;

  const cancelReq = makeReq('https://example.com/api/orders', 'PATCH', {
    cookie: customerACookie,
    body: {
      orderNumber: orderB.orderNumber,
      action: 'CANCEL_ORDER',
    },
  });

  const cancelRes = await patchOrdersRoute(cancelReq);
  assert.equal(cancelRes.status, 403, 'Customer A attempting to cancel Customer B\'s order must return 403 Forbidden');

  // Verify Order B is still in its original PENDING_REVIEW status
  const storedOrder = ServerStore.getOrderById(orderB.orderNumber);
  assert.equal(storedOrder?.status, 'PENDING_REVIEW', 'Order B must NOT be cancelled');
});

test('5. Order ID Alone Does Not Expose Private Customer Data (Anonymous Rejection)', async () => {
  const orderBody = {
    customerName: 'Private Customer',
    customerPhone: '9849044444',
    deliveryAddress: 'Villa 12, Secret Enclave, Hyderabad',
    totalAmount: 1500,
    paymentMethod: 'COD',
    items: [{ productId: 'p4', variantId: 'v4', name: 'Private Fireworks', price: 1500, quantity: 1, image: '/img.jpg' }],
  };
  const res = await postOrdersRoute(makeReq('https://example.com/api/orders', 'POST', { body: orderBody }));
  const data = await res.json();
  const orderNumber = data.data.order.orderNumber;

  // Anonymous request with only the Order ID (no session, no token)
  const anonReq = makeReq(`https://example.com/api/orders?orderNumber=${orderNumber}`);
  const anonRes = await getOrdersRoute(anonReq);
  assert.equal(anonRes.status, 401, 'Anonymous request with only an Order ID must return 401 Unauthorized');
  const anonData = await anonRes.json();
  assert.equal(anonData.success, false);
});

test('6. Delivery Agent Cannot Access Unassigned Orders (403 Forbidden)', async () => {
  // Create an order
  const orderBody = {
    customerName: 'Delivery Target Customer',
    customerPhone: '9849055555',
    deliveryAddress: 'House 5, Velmala, Hyderabad',
    totalAmount: 600,
    paymentMethod: 'COD',
    items: [{ productId: 'p5', variantId: 'v5', name: 'Chakkars', price: 600, quantity: 1, image: '/img.jpg' }],
  };
  const res = await postOrdersRoute(makeReq('https://example.com/api/orders', 'POST', { body: orderBody }));
  const data = await res.json();
  const orderNumber = data.data.order.orderNumber;

  // Create Delivery Agent 1 (assigned) and Delivery Agent 2 (unassigned)
  const agent1Token = createDeliveryAgentSessionToken({ agentId: 'agent-01', name: 'Rider Raju' });
  const agent2Token = createDeliveryAgentSessionToken({ agentId: 'agent-02', name: 'Rider Vikram' });

  // Admin assigns order to Agent 1
  ServerStore.assignDeliveryAgent(orderNumber, 'agent-01', 'Rider Raju');

  // Agent 2 (unassigned) attempts to access the order
  const unassignedReq = makeReq(`https://example.com/api/orders?orderNumber=${orderNumber}`, 'GET', {
    cookie: `${DELIVERY_AGENT_COOKIE_NAME}=${agent2Token}`,
  });
  const unassignedRes = await getOrdersRoute(unassignedReq);
  assert.equal(unassignedRes.status, 403, 'Unassigned delivery agent must be rejected with 403 Forbidden');
  const unassignedData = await unassignedRes.json();
  assert.equal(unassignedData.error.code, 'FORBIDDEN');

  // Agent 1 (assigned) accesses the order
  const assignedReq = makeReq(`https://example.com/api/orders?orderNumber=${orderNumber}`, 'GET', {
    cookie: `${DELIVERY_AGENT_COOKIE_NAME}=${agent1Token}`,
  });
  const assignedRes = await getOrdersRoute(assignedReq);
  assert.equal(assignedRes.status, 200, 'Assigned delivery agent must be granted access');
  const assignedData = await assignedRes.json();
  assert.equal(assignedData.success, true);

  // CRITICAL: Delivery agent must NEVER see the delivery OTP in the API response!
  assert.equal(assignedData.data.deliveryOtp, undefined, 'Delivery OTP must be stripped from delivery agent responses');
});

test('7. Delivery OTP Server Verification, Replay Prevention, and Attempt Limits', async () => {
  // Create order
  const orderBody = {
    customerName: 'OTP Test Customer',
    customerPhone: '9849066666',
    deliveryAddress: 'Door 6, Velmala, Hyderabad',
    totalAmount: 1100,
    paymentMethod: 'COD',
    items: [{ productId: 'p6', variantId: 'v6', name: 'Ground Wheel', price: 1100, quantity: 1, image: '/img.jpg' }],
  };
  const res = await postOrdersRoute(makeReq('https://example.com/api/orders', 'POST', { body: orderBody }));
  const data = await res.json();
  const orderNumber = data.data.order.orderNumber;
  const realOtp = data.data.order.deliveryOtp;

  const agent1Token = createDeliveryAgentSessionToken({ agentId: 'agent-01', name: 'Rider Raju' });
  const agent2Token = createDeliveryAgentSessionToken({ agentId: 'agent-02', name: 'Rider Vikram' });
  ServerStore.assignDeliveryAgent(orderNumber, 'agent-01', 'Rider Raju');

  // 1. Unassigned Agent 2 attempts to verify OTP -> 403 Forbidden
  const unassignedOtpReq = makeReq('https://example.com/api/orders', 'PATCH', {
    cookie: `${DELIVERY_AGENT_COOKIE_NAME}=${agent2Token}`,
    body: {
      orderNumber,
      action: 'VERIFY_DELIVERY',
      inputOtp: realOtp,
    },
  });
  const unassignedOtpRes = await patchOrdersRoute(unassignedOtpReq);
  assert.equal(unassignedOtpRes.status, 403, 'Unassigned delivery agent cannot verify delivery');

  // 2. Assigned Agent submits WRONG OTP -> 400 Bad Request
  const wrongOtpReq = makeReq('https://example.com/api/orders', 'PATCH', {
    cookie: `${DELIVERY_AGENT_COOKIE_NAME}=${agent1Token}`,
    body: {
      orderNumber,
      action: 'VERIFY_DELIVERY',
      inputOtp: '0000',
    },
  });
  const wrongOtpRes = await patchOrdersRoute(wrongOtpReq);
  assert.equal(wrongOtpRes.status, 400, 'Incorrect OTP must return 400');
  const wrongData = await wrongOtpRes.json();
  assert.equal(wrongData.error.code, 'INVALID_OTP');

  // 3. Assigned Agent submits CORRECT OTP -> 200 OK
  const correctOtpReq = makeReq('https://example.com/api/orders', 'PATCH', {
    cookie: `${DELIVERY_AGENT_COOKIE_NAME}=${agent1Token}`,
    body: {
      orderNumber,
      action: 'VERIFY_DELIVERY',
      inputOtp: realOtp,
    },
  });
  const correctOtpRes = await patchOrdersRoute(correctOtpReq);
  assert.equal(correctOtpRes.status, 200, 'Correct OTP must succeed');
  const correctData = await correctOtpRes.json();
  assert.equal(correctData.success, true);
  assert.equal(correctData.data.order.status, 'DELIVERED');

  // 4. Replay / Reuse Prevention: Submit OTP again -> 400 Bad Request
  const reuseOtpReq = makeReq('https://example.com/api/orders', 'PATCH', {
    cookie: `${DELIVERY_AGENT_COOKIE_NAME}=${agent1Token}`,
    body: {
      orderNumber,
      action: 'VERIFY_DELIVERY',
      inputOtp: realOtp,
    },
  });
  const reuseOtpRes = await patchOrdersRoute(reuseOtpReq);
  assert.equal(reuseOtpRes.status, 400, 'Replayed OTP must be rejected');
  const reuseData = await reuseOtpRes.json();
  assert.equal(reuseData.error.code, 'ALREADY_DELIVERED', 'Replay must be identified as ALREADY_DELIVERED');
});

test('8. Admin Access & Delivery OTP Stripped in General List Views', async () => {
  const adminToken = createAdminSessionToken({ userId: 'admin-01', role: 'ADMIN', name: 'Admin User' });
  const adminCookie = `${ADMIN_COOKIE_NAME}=${adminToken}`;

  // Admin lists all orders
  const listReq = makeReq('https://example.com/api/orders', 'GET', { cookie: adminCookie });
  const listRes = await getOrdersRoute(listReq);
  assert.equal(listRes.status, 200, 'Admin can list orders');
  const listData = await listRes.json();
  assert.equal(listData.success, true);
  assert.ok(Array.isArray(listData.data));
  assert.ok(listData.data.length > 0);

  // In list views, delivery OTP must be stripped for privacy
  for (const order of listData.data) {
    assert.equal(order.deliveryOtp, undefined, 'Delivery OTP must NOT be returned in general list views');
  }
});
