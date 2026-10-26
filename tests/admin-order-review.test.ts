import test from 'node:test';
import assert from 'node:assert/strict';
import { GET as getOrdersRoute, POST as postOrdersRoute, PATCH as patchOrdersRoute, PUT as putOrdersRoute, DELETE as deleteOrdersRoute } from '../src/app/api/orders/route';
import {
  createAdminSessionToken,
  ADMIN_COOKIE_NAME,
  CUSTOMER_COOKIE_NAME,
} from '../src/lib/server-auth';
import { createCustomerSessionToken } from '../src/lib/otp-store';
import { ServerStore } from '../src/lib/server-store';

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

test('1. Unauthorized Acceptance and Rejection Are Denied (401 / 403)', async () => {
  // Create an order in PENDING_REVIEW
  const createReq = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Suresh Kumar',
      customerPhone: '9849012345',
      deliveryAddress: 'Velmala Village, Hyderabad',
      distanceKm: 2.5,
      items: [{ productId: 'prod-01', variantId: 'var-01', quantity: 2, name: 'Product', price: 1200 }],
      paymentMethod: 'COD',
    },
  });
  const createRes = await postOrdersRoute(createReq);
  const createData = await createRes.json();
  assert.equal(createData.success, true);
  const orderNum = createData.data.order.orderNumber;

  // Unauthenticated user attempts to accept order
  const unauthAccept = makeReq('https://example.com/api/orders', 'PATCH', {
    body: {
      orderNumber: orderNum,
      action: 'ACCEPT_ORDER',
    },
  });
  const unauthRes = await patchOrdersRoute(unauthAccept);
  assert.equal(unauthRes.status, 401, 'Unauthenticated acceptance must be rejected with 401');

  // Customer attempts to accept order
  const custToken = createCustomerSessionToken('9849012345');
  const custCookie = `${CUSTOMER_COOKIE_NAME}=${custToken}`;
  const custAccept = makeReq('https://example.com/api/orders', 'PATCH', {
    cookie: custCookie,
    body: {
      orderNumber: orderNum,
      action: 'ACCEPT_ORDER',
    },
  });
  const custRes = await patchOrdersRoute(custAccept);
  assert.equal(custRes.status, 401, 'Customer cannot accept orders');

  // Unauthenticated user attempts to reject order via PUT
  const unauthReject = makeReq('https://example.com/api/orders', 'PUT', {
    body: {
      orderNumber: orderNum,
      action: 'REJECT_ORDER',
      rejectionReason: 'Invalid phone number',
    },
  });
  const unauthRejectRes = await putOrdersRoute(unauthReject);
  assert.equal(unauthRejectRes.status, 401, 'Unauthenticated rejection must be rejected with 401');
});

test('2. Rejection Without a Meaningful Reason Is Rejected (400 MISSING_REJECTION_REASON)', async () => {
  // Create order
  const createReq = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Priya Sharma',
      customerPhone: '9849012346',
      deliveryAddress: 'Velmala, Hyderabad',
      distanceKm: 1.5,
      items: [{ productId: 'prod-01', variantId: 'var-01', quantity: 1, name: 'Product', price: 1200 }],
      paymentMethod: 'COD',
    },
  });
  const createRes = await postOrdersRoute(createReq);
  const createData = await createRes.json();
  const orderNum = createData.data.order.orderNumber;

  // Rejection with empty reason
  const emptyReasonReq = makeReq('https://example.com/api/orders', 'PATCH', {
    cookie: adminCookie,
    body: {
      orderNumber: orderNum,
      action: 'REJECT_ORDER',
      rejectionReason: '',
    },
  });
  const emptyRes = await patchOrdersRoute(emptyReasonReq);
  assert.equal(emptyRes.status, 400, 'Empty rejection reason must return 400');
  const emptyData = await emptyRes.json();
  assert.equal(emptyData.error.code, 'MISSING_REJECTION_REASON');

  // Rejection with only whitespace
  const whitespaceReq = makeReq('https://example.com/api/orders', 'PUT', {
    cookie: adminCookie,
    body: {
      orderNumber: orderNum,
      action: 'REJECT_ORDER',
      rejectionReason: '    ',
    },
  });
  const wsRes = await putOrdersRoute(whitespaceReq);
  assert.equal(wsRes.status, 400, 'Whitespace rejection reason must return 400');
  const wsData = await wsRes.json();
  assert.equal(wsData.error.code, 'MISSING_REJECTION_REASON');
});

test('3. Valid Rejection Records Reason, Admin Identity, Timestamp, and Restores Stock', async () => {
  const initialCatalog = ServerStore.getProducts();
  const product = initialCatalog.find((p) => p.id === 'prod-01');
  const variant = product?.variants[0];
  const initialStock = variant?.stock || 0;

  // Create an order (stock will decrement by 2)
  const createReq = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Ramesh Varma',
      customerPhone: '9849012347',
      deliveryAddress: 'Velmala Center, Hyderabad',
      distanceKm: 2.0,
      items: [{ productId: 'prod-01', variantId: 'var-01', quantity: 2, name: 'Product', price: 1200 }],
      paymentMethod: 'COD',
    },
  });
  const createRes = await postOrdersRoute(createReq);
  const createData = await createRes.json();
  const orderNum = createData.data.order.orderNumber;

  // Check that stock was reserved
  const reservedProd = ServerStore.getProducts().find((p) => p.id === 'prod-01');
  const reservedStock = reservedProd?.variants[0].stock || 0;
  assert.equal(reservedStock, initialStock - 2, 'Stock must be reserved on order placement');

  // Admin performs valid rejection
  const rejectReq = makeReq('https://example.com/api/orders', 'PATCH', {
    cookie: adminCookie,
    body: {
      orderNumber: orderNum,
      action: 'REJECT_ORDER',
      rejectionReason: 'Invalid phone number',
      rejectionNote: 'Called customer 3 times, number not reachable.',
    },
  });
  const rejectRes = await patchOrdersRoute(rejectReq);
  assert.equal(rejectRes.status, 200);
  const rejectData = await rejectRes.json();
  assert.equal(rejectData.success, true);
  assert.equal(rejectData.data.status, 'REJECTED');
  assert.equal(rejectData.data.rejectionReason, 'Invalid phone number');

  // Verify internal store order details
  const storedOrder = ServerStore.getOrderById(orderNum);
  assert.ok(storedOrder);
  assert.equal(storedOrder.status, 'REJECTED');
  assert.equal(storedOrder.rejectionReason, 'Invalid phone number');
  assert.equal(storedOrder.rejectionNote, 'Called customer 3 times, number not reachable.');
  assert.ok(storedOrder.rejectedAt, 'rejectedAt timestamp must be recorded');
  assert.ok(storedOrder.reviewedBy, 'reviewedBy administrator must be recorded');
  assert.match(storedOrder.reviewedBy, /ADMIN|admin-tester/i);

  // Verify stock was restored
  const restoredProd = ServerStore.getProducts().find((p) => p.id === 'prod-01');
  assert.equal(restoredProd?.variants[0].stock, initialStock, 'Stock must be restored on rejection');

  // Verify audit history
  assert.ok(Array.isArray(storedOrder.statusHistory));
  const lastHistory = storedOrder.statusHistory[storedOrder.statusHistory.length - 1];
  assert.equal(lastHistory.status, 'REJECTED');
  assert.match(lastHistory.note || '', /Invalid phone number/);

  // Customer view test: rejectionReason and note are visible, but reviewedBy is stripped
  const custGetReq = makeReq(`https://example.com/api/orders?orderNumber=${orderNum}`, 'GET', {
    cookie: `${CUSTOMER_COOKIE_NAME}=${createCustomerSessionToken('9849012347')}`,
  });
  const custGetRes = await getOrdersRoute(custGetReq);
  const custGetData = await custGetRes.json();
  assert.equal(custGetData.success, true);
  assert.equal(custGetData.data.rejectionReason, 'Invalid phone number');
  assert.equal(custGetData.data.reviewedBy, undefined, 'Internal admin identity must NOT be leaked to customer');
});

test('4. Valid Acceptance Transitions Order and Records Admin Identity & Audit History', async () => {
  const createReq = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Ananya Reddy',
      customerPhone: '9849012348',
      deliveryAddress: 'Velmala Lake View, Hyderabad',
      distanceKm: 3.0,
      items: [{ productId: 'prod-01', variantId: 'var-01', quantity: 1, name: 'Product', price: 1200 }],
      paymentMethod: 'COD',
    },
  });
  const createRes = await postOrdersRoute(createReq);
  const createData = await createRes.json();
  const orderNum = createData.data.order.orderNumber;

  // Admin accepts order
  const acceptReq = makeReq('https://example.com/api/orders', 'PATCH', {
    cookie: adminCookie,
    body: {
      orderNumber: orderNum,
      action: 'ACCEPT_ORDER',
    },
  });
  const acceptRes = await patchOrdersRoute(acceptReq);
  assert.equal(acceptRes.status, 200);
  const acceptData = await acceptRes.json();
  assert.equal(acceptData.success, true);
  assert.equal(acceptData.data.status, 'ACCEPTED');

  const storedOrder = ServerStore.getOrderById(orderNum);
  assert.ok(storedOrder);
  assert.equal(storedOrder.status, 'ACCEPTED');
  assert.ok(storedOrder.acceptedAt);
  assert.ok(storedOrder.reviewedBy);
  assert.match(storedOrder.reviewedBy, /ADMIN|admin-tester/i);

  // Verify statusHistory
  const history = storedOrder.statusHistory || [];
  const acceptEntry = history.find((h) => h.status === 'ACCEPTED');
  assert.ok(acceptEntry, 'statusHistory must contain ACCEPTED transition entry');
});

test('5. Duplicate Actions Are Idempotent and Do Not Duplicate Notifications or Corrupt State', async () => {
  const createReq = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Kavitha Rao',
      customerPhone: '9849012349',
      deliveryAddress: 'Velmala Outer, Hyderabad',
      distanceKm: 3.5,
      items: [{ productId: 'prod-01', variantId: 'var-01', quantity: 1, name: 'Product', price: 1200 }],
      paymentMethod: 'COD',
    },
  });
  const createRes = await postOrdersRoute(createReq);
  const createData = await createRes.json();
  const orderNum = createData.data.order.orderNumber;

  // First Accept
  const acceptReq1 = makeReq('https://example.com/api/orders', 'PATCH', {
    cookie: adminCookie,
    body: { orderNumber: orderNum, action: 'ACCEPT_ORDER' },
  });
  const res1 = await patchOrdersRoute(acceptReq1);
  assert.equal(res1.status, 200);

  const orderAfterFirst = ServerStore.getOrderById(orderNum);
  const historyLength1 = orderAfterFirst?.statusHistory?.length || 0;

  // Second Accept (Duplicate click)
  const acceptReq2 = makeReq('https://example.com/api/orders', 'PATCH', {
    cookie: adminCookie,
    body: { orderNumber: orderNum, action: 'ACCEPT_ORDER' },
  });
  const res2 = await patchOrdersRoute(acceptReq2);
  assert.equal(res2.status, 200, 'Duplicate accept must return 200 smoothly');

  const orderAfterSecond = ServerStore.getOrderById(orderNum);
  const historyLength2 = orderAfterSecond?.statusHistory?.length || 0;
  assert.equal(historyLength2, historyLength1, 'Duplicate request must NOT create redundant status history entries');
});

test('6. Prepaid Rejection Sets REFUND_PENDING and Keeps COD Distinct', async () => {
  // Scenario A: Prepaid Order (Razorpay) that is PAID
  const createPrepaid = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Vikram Joshi',
      customerPhone: '9849012350',
      deliveryAddress: 'Velmala Township, Hyderabad',
      distanceKm: 2.0,
      items: [{ productId: 'prod-01', variantId: 'var-01', quantity: 1, name: 'Product', price: 1200 }],
      paymentMethod: 'RAZORPAY',
    },
  });
  const resPrepaid = await postOrdersRoute(createPrepaid);
  const dataPrepaid = await resPrepaid.json();
  const prepaidOrderNum = dataPrepaid.data.order.orderNumber;

  // Simulate payment capture
  ServerStore.verifyAndCapturePayment(prepaidOrderNum, {
    gateway: 'razorpay',
    transactionId: 'pay_test_99887766',
    amount: dataPrepaid.data.order.totalAmount,
    currency: 'INR',
  });
  // Reset status to PENDING_REVIEW for testing admin review
  const capturedOrder = ServerStore.getOrderById(prepaidOrderNum)!;
  capturedOrder.status = 'PENDING_REVIEW';

  // Admin rejects prepaid order
  const rejectPrepaid = makeReq('https://example.com/api/orders', 'PATCH', {
    cookie: adminCookie,
    body: {
      orderNumber: prepaidOrderNum,
      action: 'REJECT_ORDER',
      rejectionReason: 'Out of stock on requested variant',
    },
  });
  const resRejectPrepaid = await patchOrdersRoute(rejectPrepaid);
  assert.equal(resRejectPrepaid.status, 200);

  const storedPrepaid = ServerStore.getOrderById(prepaidOrderNum);
  assert.equal(storedPrepaid?.status, 'REJECTED');
  assert.equal(storedPrepaid?.paymentStatus, 'REFUND_PENDING', 'Prepaid order must enter REFUND_PENDING, not REFUNDED');
  assert.equal(storedPrepaid?.refundStatus, 'REFUND_PENDING');
  assert.ok(storedPrepaid?.refundInitiatedAt);

  // Scenario B: COD Order Rejection
  const createCod = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Deepak Verma',
      customerPhone: '9849012351',
      deliveryAddress: 'Velmala, Hyderabad',
      distanceKm: 1.0,
      items: [{ productId: 'prod-01', variantId: 'var-01', quantity: 1, name: 'Product', price: 1200 }],
      paymentMethod: 'COD',
    },
  });
  const resCod = await postOrdersRoute(createCod);
  const dataCod = await resCod.json();
  const codOrderNum = dataCod.data.order.orderNumber;

  const rejectCod = makeReq('https://example.com/api/orders', 'PATCH', {
    cookie: adminCookie,
    body: {
      orderNumber: codOrderNum,
      action: 'REJECT_ORDER',
      rejectionReason: 'Customer did not confirm the order',
    },
  });
  const resRejectCod = await patchOrdersRoute(rejectCod);
  assert.equal(resRejectCod.status, 200);

  const storedCod = ServerStore.getOrderById(codOrderNum);
  assert.equal(storedCod?.status, 'REJECTED');
  assert.notEqual(storedCod?.paymentStatus, 'REFUND_PENDING', 'COD order must not initiate a refund');
  assert.equal(storedCod?.refundStatus, undefined);
});

test('7. State Machine Blocks Illegal Transitions (Cannot Accept Rejected or Cancelled Order)', async () => {
  // Create order
  const createReq = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Manoj Pillai',
      customerPhone: '9849012352',
      deliveryAddress: 'Velmala, Hyderabad',
      distanceKm: 2.0,
      items: [{ productId: 'prod-01', variantId: 'var-01', quantity: 1, name: 'Product', price: 1200 }],
      paymentMethod: 'COD',
    },
  });
  const createRes = await postOrdersRoute(createReq);
  const createData = await createRes.json();
  const orderNum = createData.data.order.orderNumber;

  // Reject the order
  await patchOrdersRoute(
    makeReq('https://example.com/api/orders', 'PATCH', {
      cookie: adminCookie,
      body: {
        orderNumber: orderNum,
        action: 'REJECT_ORDER',
        rejectionReason: 'Duplicate order',
      },
    })
  );

  // Try to Accept the already REJECTED order
  const illegalAccept = makeReq('https://example.com/api/orders', 'PATCH', {
    cookie: adminCookie,
    body: {
      orderNumber: orderNum,
      action: 'ACCEPT_ORDER',
    },
  });
  const illegalRes = await patchOrdersRoute(illegalAccept);
  assert.equal(illegalRes.status, 400, 'Accepting a REJECTED order must fail with 400 INVALID_STATE_TRANSITION');
  const illegalData = await illegalRes.json();
  assert.equal(illegalData.error.code, 'INVALID_STATE_TRANSITION');
});

test('8. Order Deletion Requires Administrator Authorization and Rejects Unauthorized / Customer Requests', async () => {
  // Create an order
  const createReq = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Kavita Nair',
      customerPhone: '9849012399',
      deliveryAddress: 'Velmala Village, Hyderabad',
      distanceKm: 2.1,
      items: [{ productId: 'prod-01', variantId: 'var-01', quantity: 1, name: 'Product', price: 1200 }],
      paymentMethod: 'COD',
    },
  });
  const createRes = await postOrdersRoute(createReq);
  const createData = await createRes.json();
  const orderNum = createData.data.order.orderNumber;

  // Unauthenticated DELETE attempt
  const unauthDeleteReq = makeReq(`https://example.com/api/orders?orderNumber=${orderNum}`, 'DELETE');
  const unauthRes = await deleteOrdersRoute(unauthDeleteReq);
  assert.equal(unauthRes.status, 401, 'Unauthenticated deletion must return 401');

  // Customer DELETE attempt
  const custToken = createCustomerSessionToken('9849012399');
  const custDeleteReq = makeReq(`https://example.com/api/orders?orderNumber=${orderNum}`, 'DELETE', {
    cookie: `${CUSTOMER_COOKIE_NAME}=${custToken}`,
  });
  const custRes = await deleteOrdersRoute(custDeleteReq);
  assert.equal(custRes.status, 401, 'Customer deletion attempt must return 401');

  // Verify order is still in store
  const storedOrder = ServerStore.getOrderById(orderNum);
  assert.ok(storedOrder, 'Order must remain in store after rejected unauthorized delete');
  assert.equal(storedOrder?.isDeleted, undefined);
});

test('9. Admin Order Deletion Soft-Deletes in Store, Clears Notifications, and Preserves Audit Records', async () => {
  // Create an order
  const createReq = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Ramesh Verma',
      customerPhone: '9849012388',
      deliveryAddress: 'Velmala Village, Hyderabad',
      distanceKm: 3.0,
      items: [{ productId: 'prod-01', variantId: 'var-01', quantity: 2, name: 'Product', price: 1200 }],
      paymentMethod: 'COD',
    },
  });
  const createRes = await postOrdersRoute(createReq);
  const createData = await createRes.json();
  const orderNum = createData.data.order.orderNumber;

  // Verify notification was added
  const initialNotifs = ServerStore.getNotifications();
  const hasNotif = initialNotifs.some((n) => n.orderNumber === orderNum);
  assert.ok(hasNotif, 'Notification should exist for newly placed order');

  // Admin deletes the order
  const adminDeleteReq = makeReq(`https://example.com/api/orders?orderNumber=${orderNum}`, 'DELETE', {
    cookie: adminCookie,
    body: { reason: 'Test admin cleanup' },
  });
  const deleteRes = await deleteOrdersRoute(adminDeleteReq);
  assert.equal(deleteRes.status, 200, 'Admin delete must succeed with 200');
  const deleteData = await deleteRes.json();
  assert.equal(deleteData.success, true);
  assert.equal(deleteData.data.orderNumber, orderNum);

  // Verify order is no longer returned by default getOrders
  const visibleOrders = ServerStore.getOrders();
  assert.ok(!visibleOrders.some((o) => o.orderNumber === orderNum), 'Deleted order must not appear in active getOrders()');

  // Verify notification was cleared
  const updatedNotifs = ServerStore.getNotifications();
  assert.ok(!updatedNotifs.some((n) => n.orderNumber === orderNum), 'Notification for deleted order must be removed');

  // Verify audit history and record are preserved in storage with isDeleted flag
  const archivedOrder = ServerStore.getOrderById(orderNum, true);
  assert.ok(archivedOrder, 'Order must still be preserved in storage for audit history');
  assert.equal(archivedOrder?.isDeleted, true);
  assert.equal(archivedOrder?.deletedBy, 'ADMIN (admin-tester)');
  assert.ok(archivedOrder?.deletedAt);

  // Attempting to delete again should safely return 404
  const secondDeleteRes = await deleteOrdersRoute(adminDeleteReq);
  assert.equal(secondDeleteRes.status, 404, 'Double deletion should return 404 Order not found or already deleted');
});

test('10. Order Status Workflow: PENDING_REVIEW -> ACCEPTED -> PREPARING -> READY_FOR_DISPATCH -> OUT_FOR_DELIVERY -> DELIVERED', async () => {
  // Create order
  const createReq = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Anand Kumar',
      customerPhone: '9849012377',
      deliveryAddress: 'Velmala Village, Hyderabad',
      distanceKm: 1.2,
      items: [{ productId: 'prod-01', variantId: 'var-01', quantity: 1, name: 'Product', price: 1200 }],
      paymentMethod: 'COD',
    },
  });
  const createRes = await postOrdersRoute(createReq);
  const createData = await createRes.json();
  const orderNum = createData.data.order.orderNumber;

  let current = ServerStore.getOrderById(orderNum);
  assert.equal(current?.status, 'PENDING_REVIEW');
  assert.equal(current?.paymentStatus, 'PENDING_COD');

  // 1. Accept Order (PENDING_REVIEW -> ACCEPTED)
  const acceptRes = await patchOrdersRoute(
    makeReq('https://example.com/api/orders', 'PATCH', {
      cookie: adminCookie,
      body: { orderNumber: orderNum, action: 'ACCEPT_ORDER' },
    })
  );
  assert.equal(acceptRes.status, 200);
  current = ServerStore.getOrderById(orderNum);
  assert.equal(current?.status, 'ACCEPTED');
  assert.equal(current?.paymentStatus, 'PENDING_COD', 'Payment status must remain independent');

  // 2. Transition to PREPARING
  const prepRes = await patchOrdersRoute(
    makeReq('https://example.com/api/orders', 'PATCH', {
      cookie: adminCookie,
      body: { orderNumber: orderNum, status: 'PREPARING' },
    })
  );
  assert.equal(prepRes.status, 200);
  current = ServerStore.getOrderById(orderNum);
  assert.equal(current?.status, 'PREPARING');
  assert.equal(current?.paymentStatus, 'PENDING_COD');

  // 3. Transition to READY_FOR_DISPATCH (alias for READY_FOR_DELIVERY)
  const dispatchRes = await patchOrdersRoute(
    makeReq('https://example.com/api/orders', 'PATCH', {
      cookie: adminCookie,
      body: { orderNumber: orderNum, status: 'READY_FOR_DISPATCH' },
    })
  );
  assert.equal(dispatchRes.status, 200);
  current = ServerStore.getOrderById(orderNum);
  assert.equal(current?.status, 'READY_FOR_DELIVERY');
  assert.equal(current?.paymentStatus, 'PENDING_COD');

  // 4. Transition to OUT_FOR_DELIVERY
  const outRes = await patchOrdersRoute(
    makeReq('https://example.com/api/orders', 'PATCH', {
      cookie: adminCookie,
      body: { orderNumber: orderNum, status: 'OUT_FOR_DELIVERY' },
    })
  );
  assert.equal(outRes.status, 200);
  current = ServerStore.getOrderById(orderNum);
  assert.equal(current?.status, 'OUT_FOR_DELIVERY');
  assert.equal(current?.paymentStatus, 'PENDING_COD');

  // 5. Transition to DELIVERED
  const delivRes = await patchOrdersRoute(
    makeReq('https://example.com/api/orders', 'PATCH', {
      cookie: adminCookie,
      body: { orderNumber: orderNum, status: 'DELIVERED' },
    })
  );
  assert.equal(delivRes.status, 200);
  current = ServerStore.getOrderById(orderNum);
  assert.equal(current?.status, 'DELIVERED');
  assert.equal(current?.paymentStatus, 'PENDING_COD', 'Payment status is still separate and not prematurely PAID');

  // Verify status history recorded actors and timestamps
  assert.ok(current?.statusHistory && current.statusHistory.length >= 5);
  const lastHistory = current.statusHistory[current.statusHistory.length - 1];
  assert.equal(lastHistory.status, 'DELIVERED');
  assert.equal(lastHistory.changedBy, 'ADMIN (admin-tester)');
  assert.ok(lastHistory.timestamp);
});

test('11. Illegal Status Transitions Are Blocked on Server', async () => {
  // Create order
  const createReq = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Vijay Shankar',
      customerPhone: '9849012366',
      deliveryAddress: 'Velmala Village, Hyderabad',
      distanceKm: 1.0,
      items: [{ productId: 'prod-01', variantId: 'var-01', quantity: 1, name: 'Product', price: 1200 }],
      paymentMethod: 'COD',
    },
  });
  const createRes = await postOrdersRoute(createReq);
  const createData = await createRes.json();
  const orderNum = createData.data.order.orderNumber;

  // Attempt illegal skip transition: PENDING_REVIEW -> DELIVERED
  const illegalSkip = await patchOrdersRoute(
    makeReq('https://example.com/api/orders', 'PATCH', {
      cookie: adminCookie,
      body: { orderNumber: orderNum, status: 'DELIVERED' },
    })
  );
  assert.equal(illegalSkip.status, 400);
  const illegalSkipData = await illegalSkip.json();
  assert.equal(illegalSkipData.error.code, 'INVALID_STATE_TRANSITION');

  // Verify order is still PENDING_REVIEW
  const order = ServerStore.getOrderById(orderNum);
  assert.equal(order?.status, 'PENDING_REVIEW');
});

test('12. Admin Delete All Orders with Filter (COMPLETED_OR_CANCELLED) Only Removes Terminal Orders', async () => {
  // 1. Create a pending order
  const pendingReq = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Active Customer',
      customerPhone: '9849055501',
      deliveryAddress: 'Velmala Village',
      distanceKm: 1.0,
      items: [{ productId: 'prod-01', variantId: 'var-01', quantity: 1, name: 'Product', price: 1200 }],
      paymentMethod: 'COD',
    },
  });
  const pendingRes = await postOrdersRoute(pendingReq);
  const pendingData = await pendingRes.json();
  const pendingOrderNum = pendingData.data.order.orderNumber;

  // 2. Create and reject an order
  const rejectReq = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Rejected Customer',
      customerPhone: '9849055502',
      deliveryAddress: 'Velmala Village',
      distanceKm: 1.0,
      items: [{ productId: 'prod-01', variantId: 'var-01', quantity: 1, name: 'Product', price: 1200 }],
      paymentMethod: 'COD',
    },
  });
  const rejectRes = await postOrdersRoute(rejectReq);
  const rejectData = await rejectRes.json();
  const rejectOrderNum = rejectData.data.order.orderNumber;

  await patchOrdersRoute(
    makeReq('https://example.com/api/orders', 'PATCH', {
      cookie: adminCookie,
      body: {
        orderNumber: rejectOrderNum,
        action: 'REJECT_ORDER',
        rejectionReason: 'CUSTOMER_CANCELLED',
      },
    })
  );

  // 3. Trigger bulk delete with filter=COMPLETED_OR_CANCELLED
  const bulkDeleteReq = makeReq('https://example.com/api/orders?all=true&filter=COMPLETED_OR_CANCELLED', 'DELETE', {
    cookie: adminCookie,
  });
  const bulkDeleteRes = await deleteOrdersRoute(bulkDeleteReq);
  assert.equal(bulkDeleteRes.status, 200);
  const bulkDeleteData = await bulkDeleteRes.json();
  assert.equal(bulkDeleteData.success, true);
  assert.ok(bulkDeleteData.data.deletedCount >= 1);

  // Verify terminal order is deleted
  const checkRejected = ServerStore.getOrderById(rejectOrderNum);
  assert.equal(checkRejected, undefined, 'Rejected order should be removed');

  // Verify active pending order is still present and safe
  const checkPending = ServerStore.getOrderById(pendingOrderNum);
  assert.ok(checkPending, 'Pending order must remain intact and safe');
  assert.equal(checkPending?.status, 'PENDING_REVIEW');
});

test('13. Admin Delete All Orders (ALL) Purges All Orders and Notifications', async () => {
  // Trigger full purge
  const purgeReq = makeReq('https://example.com/api/orders?all=true', 'DELETE', {
    cookie: adminCookie,
  });
  const purgeRes = await deleteOrdersRoute(purgeReq);
  assert.equal(purgeRes.status, 200);
  const purgeData = await purgeRes.json();
  assert.equal(purgeData.success, true);
  assert.ok(purgeData.data.deletedCount >= 1);

  // Verify all orders are cleared
  const allOrders = ServerStore.getOrders();
  assert.equal(allOrders.length, 0, 'All orders should be emptied');

  // Verify notifications are also cleared
  const notifications = ServerStore.getNotifications();
  assert.equal(notifications.length, 0, 'All notifications should be cleared');
});


