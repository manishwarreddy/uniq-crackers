import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { POST as postOrdersRoute, PATCH as patchOrdersRoute } from '../src/app/api/orders/route';
import { POST as postRazorpayWebhook } from '../src/app/api/webhooks/razorpay/route';
import { POST as postUpiWebhook } from '../src/app/api/webhooks/upi/route';
import { POST as postRazorpayVerify } from '../src/app/api/payment/razorpay/verify/route';
import { GET as getPaymentConfig } from '../src/app/api/payment/config/route';
import { ServerStore } from '../src/lib/server-store';
import {
  verifyRazorpayWebhookSignature,
  verifyRazorpayPaymentSignature,
  validatePaymentDetails,
} from '../src/lib/payment-security';
import { createCustomerSessionToken } from '../src/lib/otp-store';
import { CUSTOMER_COOKIE_NAME, createOrderAccessToken } from '../src/lib/server-auth';

const TEST_SECRET = 'test_razorpay_webhook_secret_key_12345';
const TEST_KEY_SECRET = 'test_razorpay_key_secret_67890';
process.env.RAZORPAY_WEBHOOK_SECRET = TEST_SECRET;
process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;
process.env.UPI_WEBHOOK_SECRET = 'test_upi_webhook_secret_99999';

function makeReq(url: string, method: string = 'GET', headers: Record<string, string> = {}, body?: string | any) {
  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };
  const bodyString = typeof body === 'object' ? JSON.stringify(body) : body;
  return new Request(url, {
    method,
    headers: finalHeaders,
    body: bodyString,
  });
}

function generateHmacSha256(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

test('1. Online Orders Start in Pending Payment State and Never Default to Captured', async () => {
  // Test UPI_QR
  const upiReq = makeReq('https://example.com/api/orders', 'POST', {}, {
    customerName: 'Payment Test User',
    customerPhone: '9849090001',
    deliveryAddress: 'Velmala Hub, Hyderabad',
    totalAmount: 1250,
    paymentMethod: 'UPI_QR',
    upiUtr: '428190283741',
    items: [{ productId: 'p1', name: 'Sparklers', price: 1250, quantity: 1 }],
  });
  const upiRes = await postOrdersRoute(upiReq);
  const upiData = await upiRes.json();
  assert.equal(upiData.data.order.paymentStatus, 'AWAITING_VERIFICATION', 'UPI orders must be AWAITING_VERIFICATION');

  // Test COD
  const codReq = makeReq('https://example.com/api/orders', 'POST', {}, {
    customerName: 'Payment Test User',
    customerPhone: '9849090002',
    deliveryAddress: 'Velmala Hub, Hyderabad',
    totalAmount: 950,
    paymentMethod: 'COD',
    items: [{ productId: 'p1', name: 'Sparklers', price: 950, quantity: 1 }],
  });
  const codRes = await postOrdersRoute(codReq);
  const codData = await codRes.json();
  assert.equal(codData.data.order.paymentStatus, 'PENDING_COD', 'COD orders must be PENDING_COD');

  // Test RAZORPAY / Online Cards
  const rzpReq = makeReq('https://example.com/api/orders', 'POST', {}, {
    customerName: 'Payment Test User',
    customerPhone: '9849090003',
    deliveryAddress: 'Velmala Hub, Hyderabad',
    totalAmount: 1800,
    paymentMethod: 'RAZORPAY',
    items: [{ productId: 'p1', name: 'Sparklers', price: 1800, quantity: 1 }],
  });
  const rzpRes = await postOrdersRoute(rzpReq);
  const rzpData = await rzpRes.json();
  assert.equal(rzpData.data.order.paymentStatus, 'PENDING_ONLINE', 'Online card orders must be PENDING_ONLINE');
  assert.notEqual(rzpData.data.order.paymentStatus, 'CAPTURED', 'Orders must never default to CAPTURED');
});

test('2. Forged Payment Success Signature Is Rejected (400 Invalid Signature)', async () => {
  // Create an order
  const orderRes = await postOrdersRoute(makeReq('https://example.com/api/orders', 'POST', {}, {
    customerName: 'Security Tester',
    customerPhone: '9849090004',
    totalAmount: 1400,
    paymentMethod: 'RAZORPAY',
    items: [{ productId: 'p1', name: 'Rockets', price: 1400, quantity: 1 }],
  }));
  const orderData = await orderRes.json();
  const orderNumber = orderData.data.order.orderNumber;
  const orderAccessToken = orderData.data.orderAccessToken;

  // Attacker attempts client payment verification with forged signature
  const forgedPayload = {
    orderNumber,
    razorpay_order_id: 'order_test_fake_12345',
    razorpay_payment_id: 'pay_test_fake_99999',
    razorpay_signature: 'fake_forged_signature_hex_1234567890abcdef',
  };

  const verifyReq = makeReq('https://example.com/api/payment/razorpay/verify', 'POST', {
    'x-order-token': orderAccessToken,
  }, forgedPayload);

  const verifyRes = await postRazorpayVerify(verifyReq);
  assert.equal(verifyRes.status, 400, 'Forged signature must be rejected with 400 Bad Request');
  const verifyData = await verifyRes.json();
  assert.equal(verifyData.error.code, 'INVALID_SIGNATURE');

  // Verify order payment status is NOT marked as PAID
  const order = ServerStore.getOrderById(orderNumber);
  assert.notEqual(order?.paymentStatus, 'PAID', 'Order must NOT be marked as PAID');
  assert.equal(order?.paymentStatus, 'FAILED', 'Payment failure must be recorded');
});

test('3. Invalid Webhook Signatures Are Rejected', async () => {
  // 1. Razorpay Webhook with invalid signature
  const rzpPayload = JSON.stringify({
    event: 'payment.captured',
    payload: { payment: { entity: { id: 'pay_001', amount: 150000, currency: 'INR' } } },
  });

  const invalidRzpReq = makeReq('https://example.com/api/webhooks/razorpay', 'POST', {
    'x-razorpay-signature': 'invalid_signature_hash',
  }, rzpPayload);

  const rzpRes = await postRazorpayWebhook(invalidRzpReq);
  assert.equal(rzpRes.status, 400, 'Invalid Razorpay signature must return 400 Bad Request');
  const rzpData = await rzpRes.json();
  assert.equal(rzpData.error.code, 'INVALID_SIGNATURE');

  // 2. UPI Webhook without signature or authorization key
  const upiPayload = JSON.stringify({
    utr: '428190283741',
    amount: 1500,
    orderNumber: 'UC-2026-1001',
  });

  const unauthUpiReq = makeReq('https://example.com/api/webhooks/upi', 'POST', {}, upiPayload);
  const upiRes = await postUpiWebhook(unauthUpiReq);
  assert.equal(upiRes.status, 401, 'UPI webhook without authorization must return 401 Unauthorized');
});

test('4. Incorrect Amount Rejection (Amount Mismatch Protection)', async () => {
  // Create an order for ₹2,500
  const orderRes = await postOrdersRoute(makeReq('https://example.com/api/orders', 'POST', {}, {
    customerName: 'High Value Order',
    customerPhone: '9849090005',
    totalAmount: 2500,
    paymentMethod: 'RAZORPAY',
    items: [{ productId: 'p1', name: 'Grand Spectacular', price: 2500, quantity: 1 }],
  }));
  const orderData = await orderRes.json();
  const orderNumber = orderData.data.order.orderNumber;

  // Attacker paid only ₹25 (2500 paise instead of 250000 paise)
  const webhookBody = JSON.stringify({
    event: 'payment.captured',
    event_id: `evt_mismatch_${Date.now()}`,
    payload: {
      payment: {
        entity: {
          id: `pay_underpaid_${Date.now()}`,
          order_id: 'order_rzp_2500',
          amount: 2500, // ₹25.00 in paise
          currency: 'INR',
          status: 'captured',
          notes: { orderNumber },
        },
      },
    },
  });

  const validSig = generateHmacSha256(webhookBody, TEST_SECRET);
  const mismatchReq = makeReq('https://example.com/api/webhooks/razorpay', 'POST', {
    'x-razorpay-signature': validSig,
  }, webhookBody);

  const mismatchRes = await postRazorpayWebhook(mismatchReq);
  assert.equal(mismatchRes.status, 400, 'Underpaid amount must return 400 Bad Request');
  const mismatchData = await mismatchRes.json();
  assert.equal(mismatchData.error.code, 'AMOUNT_MISMATCH');

  // Verify order is NOT confirmed or marked as PAID
  const order = ServerStore.getOrderById(orderNumber);
  assert.notEqual(order?.paymentStatus, 'PAID', 'Order must NOT be marked as PAID');
  assert.equal(order?.paymentStatus, 'AMOUNT_MISMATCH', 'Order must be flagged as AMOUNT_MISMATCH');
});

test('5. Valid Payment Confirmation via Signed Razorpay Webhook', async () => {
  // Create an order for ₹1,650
  const orderRes = await postOrdersRoute(makeReq('https://example.com/api/orders', 'POST', {}, {
    customerName: 'Verified Payer',
    customerPhone: '9849090006',
    totalAmount: 1650,
    paymentMethod: 'RAZORPAY',
    items: [{ productId: 'p1', name: 'Sparkler Pack', price: 1650, quantity: 1 }],
  }));
  const orderData = await orderRes.json();
  const orderNumber = orderData.data.order.orderNumber;

  const paymentId = `pay_genuine_${Date.now()}`;
  const webhookBody = JSON.stringify({
    event: 'payment.captured',
    event_id: `evt_genuine_${Date.now()}`,
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: 'order_rzp_1650',
          amount: Math.round(orderData.data.order.totalAmount * 100),
          currency: 'INR',
          status: 'captured',
          method: 'upi',
          notes: { orderNumber },
        },
      },
    },
  });

  const validSig = generateHmacSha256(webhookBody, TEST_SECRET);
  const webhookReq = makeReq('https://example.com/api/webhooks/razorpay', 'POST', {
    'x-razorpay-signature': validSig,
  }, webhookBody);

  const webhookRes = await postRazorpayWebhook(webhookReq);
  assert.equal(webhookRes.status, 200, 'Legitimate signed webhook must succeed');
  const webhookData = await webhookRes.json();
  assert.equal(webhookData.success, true);
  assert.equal(webhookData.data.paymentStatus, 'PAID');

  // Order status should be transitioned to ACCEPTED and paymentStatus to PAID
  const order = ServerStore.getOrderById(orderNumber);
  assert.equal(order?.paymentStatus, 'PAID');
  assert.equal(order?.status, 'ACCEPTED');
  assert.equal(order?.paymentTransactionId, paymentId);
});

test('6. Duplicate Webhook Delivery Is Idempotent', async () => {
  // Create order
  const orderRes = await postOrdersRoute(makeReq('https://example.com/api/orders', 'POST', {}, {
    customerName: 'Idempotency User',
    customerPhone: '9849090007',
    totalAmount: 800,
    paymentMethod: 'RAZORPAY',
    items: [{ productId: 'p1', name: 'Sparkler', price: 800, quantity: 1 }],
  }));
  const orderData = await orderRes.json();
  const orderNumber = orderData.data.order.orderNumber;

  const eventId = `evt_idempotent_${Date.now()}`;
  const webhookBody = JSON.stringify({
    event: 'payment.captured',
    event_id: eventId,
    payload: {
      payment: {
        entity: {
          id: `pay_idemp_${Date.now()}`,
          order_id: 'order_rzp_800',
          amount: Math.round(orderData.data.order.totalAmount * 100),
          currency: 'INR',
          status: 'captured',
          notes: { orderNumber },
        },
      },
    },
  });

  const validSig = generateHmacSha256(webhookBody, TEST_SECRET);

  // Delivery 1: Original webhook
  const req1 = makeReq('https://example.com/api/webhooks/razorpay', 'POST', {
    'x-razorpay-signature': validSig,
  }, webhookBody);
  const res1 = await postRazorpayWebhook(req1);
  assert.equal(res1.status, 200);

  // Delivery 2: Exact duplicate notification from gateway retry
  const req2 = makeReq('https://example.com/api/webhooks/razorpay', 'POST', {
    'x-razorpay-signature': validSig,
  }, webhookBody);
  const res2 = await postRazorpayWebhook(req2);
  assert.equal(res2.status, 200, 'Duplicate delivery must succeed with 200 OK');
  const data2 = await res2.json();
  assert.equal(data2.data.status, 'ALREADY_PROCESSED', 'Must identify event as already processed');
});

test('7. Customer Cannot Mark Order as Paid Through a Browser Request', async () => {
  // Customer creates order
  const orderRes = await postOrdersRoute(makeReq('https://example.com/api/orders', 'POST', {}, {
    customerName: 'Hacker Customer',
    customerPhone: '9849090008',
    totalAmount: 3000,
    paymentMethod: 'COD',
    items: [{ productId: 'p1', name: 'Hamper', price: 3000, quantity: 1 }],
  }));
  const orderData = await orderRes.json();
  const orderNumber = orderData.data.order.orderNumber;

  const customerToken = createCustomerSessionToken('9849090008', 'Hacker Customer');
  const customerCookie = `${CUSTOMER_COOKIE_NAME}=${customerToken}`;

  // Customer tries to call VERIFY_PAYMENT or VERIFY_UPI directly
  const patchReq = makeReq('https://example.com/api/orders', 'PATCH', {
    Cookie: customerCookie,
  }, {
    orderNumber,
    action: 'VERIFY_PAYMENT',
    status: 'PAID',
  });

  const patchRes = await patchOrdersRoute(patchReq);
  assert.equal(patchRes.status, 401, 'Customer attempting to mark order paid must return 401 Unauthorized');

  // Verify order is still PENDING_COD
  const order = ServerStore.getOrderById(orderNumber);
  assert.equal(order?.paymentStatus, 'PENDING_COD', 'Payment status must NOT be modified by client request');
});

test('8. Valid Authenticated UPI Webhook Confirms Payment', async () => {
  const utr = '998877665544';
  const orderRes = await postOrdersRoute(makeReq('https://example.com/api/orders', 'POST', {}, {
    customerName: 'UPI Customer',
    customerPhone: '9849090009',
    totalAmount: 1150,
    paymentMethod: 'UPI_QR',
    upiUtr: utr,
    items: [{ productId: 'p1', name: 'Anar Pack', price: 1150, quantity: 1 }],
  }));
  const orderData = await orderRes.json();
  const orderNumber = orderData.data.order.orderNumber;

  const upiSecret = 'test_upi_webhook_secret_99999';
  const upiPayload = JSON.stringify({
    utr,
    amount: orderData.data.order.totalAmount,
    orderNumber,
    currency: 'INR',
  });
  const upiSig = generateHmacSha256(upiPayload, upiSecret);

  const webhookReq = makeReq('https://example.com/api/webhooks/upi', 'POST', {
    'x-webhook-signature': upiSig,
  }, upiPayload);

  const webhookRes = await postUpiWebhook(webhookReq);
  assert.equal(webhookRes.status, 200, 'Authenticated UPI webhook must succeed');
  const webhookData = await webhookRes.json();
  assert.equal(webhookData.data.paymentStatus, 'PAID');

  const order = ServerStore.getOrderById(orderNumber);
  assert.equal(order?.paymentStatus, 'PAID');
  assert.equal(order?.paymentTransactionId, utr);
});
