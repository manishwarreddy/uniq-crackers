import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as postOrdersRoute, PATCH as patchOrdersRoute, GET as getOrdersRoute } from '../src/app/api/orders/route';
import { DELETE as deleteNotificationsRoute, POST as postNotificationsRoute } from '../src/app/api/admin/notifications/route';
import {
  createAdminSessionToken,
  ADMIN_COOKIE_NAME,
  createDeliveryAgentSessionToken,
  DELIVERY_AGENT_COOKIE_NAME,
} from '../src/lib/server-auth';
import { ServerStore } from '../src/lib/server-store';
import {
  notifyCustomerOrderConfirmed,
  notifyCustomerOrderStatus,
  notifyCustomerOutForDelivery,
  notifyCustomerDeliveryCompleted,
  notifyCustomerOrderCancelled,
  notifyAdminNewOrder,
  notifyAdminPaymentVerified,
  notifyAdminOrderCancelled,
  notifyDeliveryAgentAssigned,
  notifyDeliveryAgentStatusChange,
  notifyDeliveryAgentOrderCancelled,
  dispatchWhatsAppWithFallback,
} from '../src/lib/notifications';

process.env.ADMIN_PASSWORD = 'TestAdminSecret@2026';
process.env.ADMIN_SESSION_SECRET = 'test-secret-key-diwali-2026-very-secure';

function makeReq(
  url: string,
  method: string = 'GET',
  options: {
    body?: any;
    cookie?: string;
    authHeader?: string;
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

  return new Request(url, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

const adminToken = createAdminSessionToken({ userId: 'admin-tester' });
const adminCookie = `${ADMIN_COOKIE_NAME}=${adminToken}`;

const agent101Token = createDeliveryAgentSessionToken({
  agentId: 'agent-101',
  name: 'Ravi Kumar',
  phone: '9888800001',
});
const agent101Cookie = `${DELIVERY_AGENT_COOKIE_NAME}=${agent101Token}`;

const agent102Token = createDeliveryAgentSessionToken({
  agentId: 'agent-102',
  name: 'Suresh Rao',
  phone: '9888800002',
});
const agent102Cookie = `${DELIVERY_AGENT_COOKIE_NAME}=${agent102Token}`;

test('1. Inventory: Stock Validation and Prevention of Overselling in Simultaneous Checkouts', async () => {
  // Ensure prod-01 stock is healthy for other test suites
  const prod01 = ServerStore.getProductById('prod-01');
  if (prod01 && prod01.variants[0]) prod01.variants[0].stock = 100;

  // Create isolated product with exactly 5 units stock and price 600 (>= 500 minimum order value)
  ServerStore.addProduct({
    id: 'test-inv-prod-01',
    name: 'Stock Concurrency Sparklers',
    slug: 'stock-concurrency-sparklers',
    category: 'sparklers',
    categoryLabel: 'Sparklers',
    description: 'Testing inventory concurrency',
    image: '/images/products/sparkler.jpg',
    rating: 5,
    reviewsCount: 1,
    isGreenCertified: true,
    soundDecibel: 'Low',
    smokeLevel: 'Low',
    variants: [
      {
        id: 'test-inv-var-01',
        name: 'Pack of 5',
        sku: 'SKU-INV-01',
        price: 600,
        originalPrice: 800,
        boxQuantity: '1 Box',
        stock: 5,
      },
    ],
    safetyTips: [],
  });

  // Checkout 1: Customer requests 3 units (5 - 3 = 2 remaining)
  const req1 = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Customer Alpha',
      customerPhone: '9888800011',
      deliveryAddress: 'Velmala Village, Hyderabad',
      distanceKm: 2.0,
      items: [
        {
          productId: 'test-inv-prod-01',
          variantId: 'test-inv-var-01',
          quantity: 3,
          name: 'Stock Concurrency Sparklers',
          price: 600,
        },
      ],
      paymentMethod: 'COD',
    },
  });

  const res1 = await postOrdersRoute(req1);
  const data1 = await res1.json();
  assert.equal(res1.status, 200, `Order 1 within stock limit should succeed, got error: ${JSON.stringify(data1)}`);
  assert.equal(data1.success, true);

  // Check remaining stock in store
  const updatedProduct = ServerStore.getProductById('test-inv-prod-01');
  const updatedVariant = updatedProduct?.variants.find((v) => v.id === 'test-inv-var-01');
  assert.equal(updatedVariant?.stock, 2, 'Stock should be decremented from 5 to 2');

  // Checkout 2: Simultaneous request for 3 units (exceeds available 2 units)
  const req2 = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Customer Beta',
      customerPhone: '9888800012',
      deliveryAddress: 'Velmala Village, Hyderabad',
      distanceKm: 2.0,
      items: [
        {
          productId: 'test-inv-prod-01',
          variantId: 'test-inv-var-01',
          quantity: 3,
          name: 'Stock Concurrency Sparklers',
          price: 600,
        },
      ],
      paymentMethod: 'COD',
    },
  });

  const res2 = await postOrdersRoute(req2);
  const data2 = await res2.json();
  assert.ok([400, 409].includes(res2.status), 'Over-stock checkout must be rejected with 400 or 409');
  assert.equal(data2.error.code, 'INSUFFICIENT_STOCK');

  // Ensure stock was NOT decremented further or allowed to go negative
  const finalVariant = ServerStore.getProductById('test-inv-prod-01')?.variants.find(
    (v) => v.id === 'test-inv-var-01'
  );
  assert.equal(finalVariant?.stock, 2, 'Stock must stay at 2, completely preventing overselling');
});

test('2. Inventory: Restores Stock on Order Cancellation and Prevents Duplicate Restorations', async () => {
  // Create isolated product with exactly 10 units stock
  ServerStore.addProduct({
    id: 'test-inv-prod-02',
    name: 'Cancellation Stock Sparklers',
    slug: 'cancellation-stock-sparklers',
    category: 'sparklers',
    categoryLabel: 'Sparklers',
    description: 'Testing cancellation stock restoration',
    image: '/images/products/sparkler.jpg',
    rating: 5,
    reviewsCount: 1,
    isGreenCertified: true,
    soundDecibel: 'Low',
    smokeLevel: 'Low',
    variants: [
      {
        id: 'test-inv-var-02',
        name: 'Pack of 10',
        sku: 'SKU-INV-02',
        price: 550,
        originalPrice: 750,
        boxQuantity: '1 Box',
        stock: 10,
      },
    ],
    safetyTips: [],
  });

  // Place order for 4 units (Stock becomes 6)
  const createReq = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Cancel Test User',
      customerPhone: '9888800013',
      deliveryAddress: 'Velmala Village, Hyderabad',
      distanceKm: 1.5,
      items: [
        {
          productId: 'test-inv-prod-02',
          variantId: 'test-inv-var-02',
          quantity: 4,
          name: 'Cancellation Stock Sparklers',
          price: 550,
        },
      ],
      paymentMethod: 'COD',
    },
  });

  const createRes = await postOrdersRoute(createReq);
  const createData = await createRes.json();
  assert.equal(createData.success, true);
  const orderNum = createData.data.order.orderNumber;
  const orderToken = createData.data.orderAccessToken;

  let currentVariant = ServerStore.getProductById('test-inv-prod-02')?.variants.find(
    (v) => v.id === 'test-inv-var-02'
  );
  assert.equal(currentVariant?.stock, 6, 'Stock should be 6 after order placement');

  // Customer cancels the order (First cancellation)
  const cancelReq1 = makeReq('https://example.com/api/orders', 'PATCH', {
    cookie: `order_token_${orderNum.replace(/[^\w]/g, '_')}=${orderToken}`,
    body: {
      orderNumber: orderNum,
      action: 'CANCEL_ORDER',
    },
  });

  const cancelRes1 = await patchOrdersRoute(cancelReq1);
  const cancelData1 = await cancelRes1.json();
  assert.equal(cancelRes1.status, 200);
  assert.equal(cancelData1.success, true);
  assert.equal(cancelData1.data.order.status, 'CANCELLED');

  // Stock should be restored back to 10
  currentVariant = ServerStore.getProductById('test-inv-prod-02')?.variants.find(
    (v) => v.id === 'test-inv-var-02'
  );
  assert.equal(currentVariant?.stock, 10, 'Stock must be restored to 10 on cancellation');

  // Duplicate cancellation request (e.g. user double clicks or network retry)
  const cancelReq2 = makeReq('https://example.com/api/orders', 'PATCH', {
    cookie: `order_token_${orderNum.replace(/[^\w]/g, '_')}=${orderToken}`,
    body: {
      orderNumber: orderNum,
      action: 'CANCEL_ORDER',
    },
  });

  const cancelRes2 = await patchOrdersRoute(cancelReq2);
  assert.equal(cancelRes2.status, 400, 'Duplicate cancellation of already cancelled order is rejected');

  // Verify stock was NOT restored a second time (must remain 10, not 14!)
  currentVariant = ServerStore.getProductById('test-inv-prod-02')?.variants.find(
    (v) => v.id === 'test-inv-var-02'
  );
  assert.equal(currentVariant?.stock, 10, 'Stock must NOT be restored twice on duplicate cancellation');
});

test('3. Delivery: Administrator Assignment Permissions & Terminal Status Guard', async () => {
  // Create an order
  const createReq = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Assignment Test',
      customerPhone: '9888800014',
      deliveryAddress: 'Velmala Village, Hyderabad',
      distanceKm: 2.0,
      items: [{ productId: 'prod-01', variantId: 'var-01', quantity: 1, name: 'Product', price: 1200 }],
      paymentMethod: 'COD',
    },
  });
  const createRes = await postOrdersRoute(createReq);
  const createData = await createRes.json();
  const orderNum = createData.data.order.orderNumber;

  // Accept the order first
  await patchOrdersRoute(
    makeReq('https://example.com/api/orders', 'PATCH', {
      cookie: adminCookie,
      body: { orderNumber: orderNum, action: 'ACCEPT_ORDER' },
    })
  );

  // 1. Unauthenticated or customer cannot assign delivery agent
  const unauthAssignReq = makeReq('https://example.com/api/orders', 'PATCH', {
    body: {
      orderNumber: orderNum,
      action: 'ASSIGN_AGENT',
      agentId: 'agent-101',
      agentName: 'Ravi Kumar',
    },
  });
  const unauthAssignRes = await patchOrdersRoute(unauthAssignReq);
  assert.equal(unauthAssignRes.status, 401, 'Unauthenticated assignment must be 401 Unauthorized');

  // 2. Delivery agent cannot assign delivery agent
  const agentAssignReq = makeReq('https://example.com/api/orders', 'PATCH', {
    cookie: agent101Cookie,
    body: {
      orderNumber: orderNum,
      action: 'ASSIGN_AGENT',
      agentId: 'agent-101',
      agentName: 'Ravi Kumar',
    },
  });
  const agentAssignRes = await patchOrdersRoute(agentAssignReq);
  assert.ok(
    [401, 403].includes(agentAssignRes.status),
    'Delivery agent cannot assign orders (denied by admin verification)'
  );

  // 3. Authorized Admin successfully assigns delivery agent
  const adminAssignReq = makeReq('https://example.com/api/orders', 'PATCH', {
    cookie: adminCookie,
    body: {
      orderNumber: orderNum,
      action: 'ASSIGN_AGENT',
      agentId: 'agent-101',
      agentName: 'Ravi Kumar',
      agentPhone: '9888800001',
    },
  });
  const adminAssignRes = await patchOrdersRoute(adminAssignReq);
  const adminAssignData = await adminAssignRes.json();
  assert.equal(adminAssignRes.status, 200);
  assert.equal(adminAssignData.data.assignedAgentId, 'agent-101');
  assert.equal(adminAssignData.data.assignedAgentName, 'Ravi Kumar');
  assert.equal(adminAssignData.data.status, 'DELIVERY_AGENT_ASSIGNED');

  // 4. Reject/Cancel order, then try to assign agent -> Must be rejected
  const cancelOrderReq = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Cancelled Order Assignment Test',
      customerPhone: '9888800015',
      deliveryAddress: 'Velmala Village, Hyderabad',
      distanceKm: 2.0,
      items: [{ productId: 'prod-01', variantId: 'var-01', quantity: 1, name: 'Product', price: 1200 }],
      paymentMethod: 'COD',
    },
  });
  const cancelOrderRes = await postOrdersRoute(cancelOrderReq);
  const cancelOrderData = await cancelOrderRes.json();
  const cancelOrderNum = cancelOrderData.data.order.orderNumber;

  // Admin rejects this order
  await patchOrdersRoute(
    makeReq('https://example.com/api/orders', 'PATCH', {
      cookie: adminCookie,
      body: { orderNumber: cancelOrderNum, action: 'REJECT_ORDER', rejectionReason: 'Out of service area' },
    })
  );

  // Attempt to assign agent to REJECTED order -> 400
  const assignToRejectedRes = await patchOrdersRoute(
    makeReq('https://example.com/api/orders', 'PATCH', {
      cookie: adminCookie,
      body: {
        orderNumber: cancelOrderNum,
        action: 'ASSIGN_AGENT',
        agentId: 'agent-101',
        agentName: 'Ravi Kumar',
      },
    })
  );
  assert.equal(assignToRejectedRes.status, 400, 'Cannot assign agent to a rejected order');
});

test('4. Delivery: Agents Can View Only Their Assigned Orders', async () => {
  // Create Order A and assign to agent-101
  const reqA = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Customer A',
      customerPhone: '9888800016',
      deliveryAddress: 'Velmala Hub 1',
      distanceKm: 1.0,
      items: [{ productId: 'prod-01', variantId: 'var-01', quantity: 1, name: 'Product', price: 1200 }],
      paymentMethod: 'COD',
    },
  });
  const resA = await postOrdersRoute(reqA);
  const dataA = await resA.json();
  const orderNumA = dataA.data.order.orderNumber;

  // Accept and assign Order A to agent-101
  await patchOrdersRoute(
    makeReq('https://example.com/api/orders', 'PATCH', {
      cookie: adminCookie,
      body: { orderNumber: orderNumA, action: 'ACCEPT_ORDER' },
    })
  );
  await patchOrdersRoute(
    makeReq('https://example.com/api/orders', 'PATCH', {
      cookie: adminCookie,
      body: { orderNumber: orderNumA, action: 'ASSIGN_AGENT', agentId: 'agent-101', agentName: 'Ravi Kumar' },
    })
  );

  // Agent-101 can view Order A
  const viewRes101 = await getOrdersRoute(
    makeReq(`https://example.com/api/orders?orderNumber=${orderNumA}`, 'GET', {
      cookie: agent101Cookie,
    })
  );
  const viewData101 = await viewRes101.json();
  assert.equal(viewRes101.status, 200);
  assert.equal(viewData101.data.orderNumber, orderNumA);

  // Agent-102 CANNOT view Order A (403 Forbidden)
  const viewRes102 = await getOrdersRoute(
    makeReq(`https://example.com/api/orders?orderNumber=${orderNumA}`, 'GET', {
      cookie: agent102Cookie,
    })
  );
  assert.equal(viewRes102.status, 403, 'Agent-102 must be forbidden from accessing Agent-101 assigned order');
});

test('5. Delivery: Server Status Transitions & Assigned Agent START_DELIVERY', async () => {
  // Create order
  const createRes = await postOrdersRoute(
    makeReq('https://example.com/api/orders', 'POST', {
      body: {
        customerName: 'Status Transition Test',
        customerPhone: '9888800017',
        deliveryAddress: 'Velmala Hub',
        distanceKm: 2.0,
        items: [{ productId: 'prod-01', variantId: 'var-01', quantity: 1, name: 'Product', price: 1200 }],
        paymentMethod: 'COD',
      },
    })
  );
  const orderNum = (await createRes.json()).data.order.orderNumber;

  // Accept and assign to agent-101
  await patchOrdersRoute(
    makeReq('https://example.com/api/orders', 'PATCH', {
      cookie: adminCookie,
      body: { orderNumber: orderNum, action: 'ACCEPT_ORDER' },
    })
  );
  await patchOrdersRoute(
    makeReq('https://example.com/api/orders', 'PATCH', {
      cookie: adminCookie,
      body: { orderNumber: orderNum, action: 'ASSIGN_AGENT', agentId: 'agent-101', agentName: 'Ravi Kumar' },
    })
  );

  // Agent-102 tries to start delivery -> 403 Forbidden
  const agent102StartRes = await patchOrdersRoute(
    makeReq('https://example.com/api/orders', 'PATCH', {
      cookie: agent102Cookie,
      body: { orderNumber: orderNum, action: 'START_DELIVERY' },
    })
  );
  assert.equal(agent102StartRes.status, 403, 'Unassigned agent cannot start delivery');

  // Assigned Agent-101 starts delivery -> 200 OK (Status becomes OUT_FOR_DELIVERY)
  const agent101StartRes = await patchOrdersRoute(
    makeReq('https://example.com/api/orders', 'PATCH', {
      cookie: agent101Cookie,
      body: { orderNumber: orderNum, action: 'START_DELIVERY' },
    })
  );
  const startData = await agent101StartRes.json();
  assert.equal(agent101StartRes.status, 200);
  assert.equal(startData.data.status, 'OUT_FOR_DELIVERY');

  // Invalid state transition test: Cannot jump from OUT_FOR_DELIVERY back to PENDING_REVIEW or ACCEPTED
  const invalidTransitionRes = await patchOrdersRoute(
    makeReq('https://example.com/api/orders', 'PATCH', {
      cookie: adminCookie,
      body: { orderNumber: orderNum, status: 'PENDING_REVIEW' },
    })
  );
  assert.equal(invalidTransitionRes.status, 400, 'Invalid transition to PENDING_REVIEW must be rejected');
});

test('6. Delivery: Secure OTP Verification, Replay Prevention, and Reuse Protection', async () => {
  // Create order
  const createRes = await postOrdersRoute(
    makeReq('https://example.com/api/orders', 'POST', {
      body: {
        customerName: 'OTP Security Test',
        customerPhone: '9888800018',
        deliveryAddress: 'Velmala Hub',
        distanceKm: 2.0,
        items: [{ productId: 'prod-01', variantId: 'var-01', quantity: 1, name: 'Product', price: 1200 }],
        paymentMethod: 'COD',
      },
    })
  );
  const orderNum = (await createRes.json()).data.order.orderNumber;

  // Admin accepts, assigns to agent-101, and agent starts delivery
  await patchOrdersRoute(
    makeReq('https://example.com/api/orders', 'PATCH', {
      cookie: adminCookie,
      body: { orderNumber: orderNum, action: 'ACCEPT_ORDER' },
    })
  );
  await patchOrdersRoute(
    makeReq('https://example.com/api/orders', 'PATCH', {
      cookie: adminCookie,
      body: { orderNumber: orderNum, action: 'ASSIGN_AGENT', agentId: 'agent-101', agentName: 'Ravi Kumar' },
    })
  );
  await patchOrdersRoute(
    makeReq('https://example.com/api/orders', 'PATCH', {
      cookie: agent101Cookie,
      body: { orderNumber: orderNum, action: 'START_DELIVERY' },
    })
  );

  // Retrieve raw order from server store to get OTP for testing
  const rawOrder = ServerStore.getOrderById(orderNum);
  assert.ok(rawOrder?.deliveryOtp, 'Order must have a valid delivery OTP');
  const otp = rawOrder!.deliveryOtp!;

  // 1. Wrong OTP attempt fails
  const wrongOtpRes = await patchOrdersRoute(
    makeReq('https://example.com/api/orders', 'PATCH', {
      cookie: agent101Cookie,
      body: { orderNumber: orderNum, action: 'VERIFY_DELIVERY', inputOtp: '000000' },
    })
  );
  assert.equal(wrongOtpRes.status, 400, 'Wrong OTP must be rejected');

  // 2. Correct OTP verification succeeds
  const correctOtpRes = await patchOrdersRoute(
    makeReq('https://example.com/api/orders', 'PATCH', {
      cookie: agent101Cookie,
      body: { orderNumber: orderNum, action: 'VERIFY_DELIVERY', inputOtp: otp },
    })
  );
  const correctOtpData = await correctOtpRes.json();
  assert.equal(correctOtpRes.status, 200);
  assert.equal(correctOtpData.data.order.status, 'DELIVERED');

  // 3. Replay / Reuse attack: Trying to verify the same OTP again fails
  const replayRes = await patchOrdersRoute(
    makeReq('https://example.com/api/orders', 'PATCH', {
      cookie: agent101Cookie,
      body: { orderNumber: orderNum, action: 'VERIFY_DELIVERY', inputOtp: otp },
    })
  );
  const replayData = await replayRes.json();
  assert.equal(replayRes.status, 400, 'Replay of used OTP must fail');
  assert.equal(replayData.error.code, 'ALREADY_DELIVERED');
});

test('7. Notifications: Strict Channel Rules & WhatsApp Delivery Distinction', async () => {
  const dummyOrder = {
    id: 'test-order-notif-1',
    orderNumber: 'UC-NOTIF-001',
    customerName: 'Ananya Rao',
    customerPhone: '9888800019',
    deliveryAddress: 'Velmala Hub',
    distanceKm: 2.0,
    subtotal: 1500,
    deliveryFee: 0,
    discountAmount: 0,
    totalAmount: 1500,
    paymentMethod: 'COD',
    paymentStatus: 'PENDING_COD' as const,
    status: 'PLACED' as const,
    deliveryOtp: '1234',
    items: [
      {
        productId: 'prod-01',
        variantId: 'var-01',
        quantity: 2,
        name: 'Chakkars',
        variantName: 'Standard Unit',
        boxQuantity: '1 Box',
        image: '/images/sparklers.jpg',
        price: 750,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Customer notifications: MUST be SMS or logged, NEVER WhatsApp
  const custRes1 = await notifyCustomerOrderConfirmed(dummyOrder);
  assert.equal(custRes1.success, true);
  assert.notEqual(custRes1.channel, 'whatsapp', 'Customer notification must never use WhatsApp');

  const custRes2 = await notifyCustomerOutForDelivery(dummyOrder);
  assert.equal(custRes2.success, true);
  assert.notEqual(custRes2.channel, 'whatsapp', 'Customer notification must never use WhatsApp');

  const custRes3 = await notifyCustomerDeliveryCompleted(dummyOrder);
  assert.equal(custRes3.success, true);
  assert.notEqual(custRes3.channel, 'whatsapp', 'Customer notification must never use WhatsApp');

  // 2. Admin & Delivery Agent notifications: Send WhatsApp message & share link
  const adminRes = await notifyAdminNewOrder(dummyOrder);
  assert.ok(adminRes.shareLink.startsWith('https://wa.me/'), 'Admin must receive a WhatsApp share link');
  assert.equal(adminRes.automatedDelivery.configured, false, 'Without token, automatedDelivery is not configured');

  const agentRes = await notifyDeliveryAgentAssigned(dummyOrder, '9888800001', 'Ravi Kumar');
  assert.ok(agentRes.shareLink.includes('919888800001'), 'Delivery agent share link contains agent phone number');
  assert.equal(agentRes.automatedDelivery.configured, false, 'Does not fake automated delivery success');

  // 3. Notification Idempotency: Duplicate calls do not resend
  const dupCustomer = await notifyCustomerOrderConfirmed(dummyOrder);
  assert.equal(dupCustomer.idempotentSkip, true, 'Duplicate customer notification skipped idempotently');

  const dupAdmin = await notifyAdminNewOrder(dummyOrder);
  assert.equal(dupAdmin.idempotentSkip, true, 'Duplicate admin notification skipped idempotently');

  const dupAgent = await notifyDeliveryAgentAssigned(dummyOrder, '9888800001', 'Ravi Kumar');
  assert.equal(dupAgent.idempotentSkip, true, 'Duplicate agent notification skipped idempotently');
});

test('7. Admin Delete All Live Order Notifications Clears Notification Feed', async () => {
  // 1. Ensure at least one notification exists
  ServerStore.addNotification({
    id: `notif-test-${Date.now()}`,
    orderId: 'ord-test-1',
    orderNumber: 'UC-TEST-99',
    customerName: 'Test Alert User',
    customerPhone: '9849011111',
    totalAmount: 1200,
    itemsCount: 1,
    deliveryAddress: 'Velmala Village',
    distanceKm: 1.0,
    paymentMethod: 'COD',
    timestamp: new Date().toISOString(),
    isRead: false,
    whatsappUrl: 'https://wa.me/test',
    formattedMessage: 'Test message',
  });

  const countBefore = ServerStore.getNotifications().length;
  assert.ok(countBefore >= 1, 'Notifications should exist before deletion');

  // 2. DELETE /api/admin/notifications?all=true with admin authorization
  const deleteReq = makeReq('https://example.com/api/admin/notifications?all=true', 'DELETE', {
    cookie: adminCookie,
  });
  const res = await deleteNotificationsRoute(deleteReq);
  assert.equal(res.status, 200, 'DELETE should return 200 OK');
  const data = await res.json();
  assert.equal(data.success, true);

  // 3. Verify notifications cache is empty
  const countAfter = ServerStore.getNotifications().length;
  assert.equal(countAfter, 0, 'Notifications feed must be completely emptied');
  assert.equal(ServerStore.getUnreadNotificationsCount(), 0, 'Unread count must be 0');
});

test('8. Customer Cannot Order More Than Available In-Stock Quantity', async () => {
  const products = ServerStore.getProducts();
  const prod = products.find((p) => p.id === 'prod-01');
  if (prod && prod.variants[0]) {
    prod.variants[0].stock = 5;
  }

  // Attempt to place an order requesting more than available stock (8 > 5)
  const req = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Excessive Buyer',
      customerPhone: '9849077701',
      deliveryAddress: 'Velmala Village, Hyderabad',
      distanceKm: 1.0,
      items: [
        {
          productId: 'prod-01',
          variantId: prod?.variants[0].id,
          quantity: 8,
          name: prod?.name,
          price: prod?.variants[0].price,
        },
      ],
      paymentMethod: 'COD',
    },
  });

  const res = await postOrdersRoute(req);
  assert.equal(res.status, 400, 'Ordering more than available stock must return 400');
  const data = await res.json();
  assert.equal(data.success, false);
  assert.equal(data.error.code, 'INSUFFICIENT_STOCK');
});

test('9. Stock Reduces Automatically Upon Customer Order and Confirmed by Admin', async () => {
  const products = ServerStore.getProducts();
  const prod = products.find((p) => p.id === 'prod-01');
  const variant = prod?.variants[0];
  const initialStock = variant?.stock || 0;

  // 1. Customer places order for 2 units
  const orderReq = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Stock Test Customer',
      customerPhone: '9849077702',
      deliveryAddress: 'Velmala Village, Hyderabad',
      distanceKm: 1.0,
      items: [
        {
          productId: 'prod-01',
          variantId: variant?.id,
          quantity: 2,
          name: prod?.name,
          price: variant?.price,
        },
      ],
      paymentMethod: 'COD',
    },
  });

  const orderRes = await postOrdersRoute(orderReq);
  assert.equal(orderRes.status, 200, 'Order must succeed');
  const orderData = await orderRes.json();
  const orderNum = orderData.data.order.orderNumber;

  // 2. Stock must be decremented immediately by 2
  const updatedProd = ServerStore.getProducts().find((p) => p.id === 'prod-01');
  const stockAfterOrder = updatedProd?.variants[0].stock || 0;
  assert.equal(stockAfterOrder, initialStock - 2, 'Stock must automatically reduce by 2');

  // 3. Admin confirms the order
  const acceptReq = makeReq('https://example.com/api/orders', 'PATCH', {
    cookie: adminCookie,
    body: {
      orderNumber: orderNum,
      action: 'ACCEPT_ORDER',
    },
  });

  const acceptRes = await patchOrdersRoute(acceptReq);
  assert.equal(acceptRes.status, 200);

  // 4. Stock remains deducted and confirmed
  const stockAfterAccept = ServerStore.getProducts().find((p) => p.id === 'prod-01')?.variants[0].stock || 0;
  assert.equal(stockAfterAccept, initialStock - 2, 'Stock remains confirmed and deducted');
});

