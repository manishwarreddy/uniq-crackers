import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as postOrdersRoute, PATCH as patchOrdersRoute } from '../src/app/api/orders/route';
import { GET as getPaymentConfig } from '../src/app/api/payment/config/route';
import { POST as postPaymentProof, GET as getPaymentProof } from '../src/app/api/orders/payment-proof/route';
import { ServerStore } from '../src/lib/server-store';
import { createAdminSessionToken } from '../src/lib/server-auth';

// Helper to create admin request headers
function getAdminHeaders(): Record<string, string> {
  const token = createAdminSessionToken({ userId: 'admin-test-id' });
  return {
    cookie: `admin_session=${token}`,
  };
}

// Helper to generate genuine 1x1 test image buffers
function createValidJpegBuffer(): Buffer {
  // Minimal valid JPEG with FF D8 FF magic bytes
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0xff, 0xd9
  ]);
}

function createValidPngBuffer(): Buffer {
  // Minimal PNG with 89 50 4E 47 0D 0A 1A 0A magic bytes
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
  ]);
}

function getValidTestItem() {
  const p = ServerStore.getProducts().find((prod) => prod.isActive !== false && prod.variants?.some((v) => v.stock > 0)) || ServerStore.getProducts()[0];
  const v = p.variants[0];
  const qty = Math.ceil(550 / (v.price || 500));
  return {
    productId: p.id,
    variantId: v.id,
    name: p.name,
    price: v.price,
    quantity: Math.max(1, qty),
  };
}

test('1. Pay with UPI Config and Standard UPI Deep Link', async () => {
  const req = new Request('https://example.com/api/payment/config');
  const res = await getPaymentConfig();
  const data = await res.json();

  assert.equal(data.success, true);
  assert.equal(data.data.upiConfigured, true, 'UPI must be marked configured');
  assert.equal(typeof data.data.merchantUpiId, 'string', 'Merchant UPI ID must be a valid string');
  assert.ok(data.data.merchantUpiId.includes('@'), 'Merchant UPI ID must contain an @ handle');
  assert.equal(typeof data.data.merchantName, 'string', 'Merchant name must be configured');

  // Verify standard deep link structure
  const orderNumber = 'UC-2026-9999';
  const grandTotal = 1500;
  const deepLink = `upi://pay?pa=${encodeURIComponent(data.data.merchantUpiId)}&pn=${encodeURIComponent(data.data.merchantName)}&am=${grandTotal}&cu=INR&tn=${encodeURIComponent(`${data.data.shopName} Order ${orderNumber}`)}`;

  assert.ok(deepLink.startsWith('upi://pay?'), 'Must start with upi://pay? standard protocol');
  assert.ok(deepLink.includes(`pa=${encodeURIComponent(data.data.merchantUpiId)}`), 'Must contain merchant UPI ID');
  assert.ok(deepLink.includes(`am=${grandTotal}`), 'Must contain exact grand total');
  assert.ok(deepLink.includes('cu=INR'), 'Must specify currency INR');
  assert.ok(deepLink.includes('UC-2026-9999'), 'Must include order number reference');
});

test('2. Order Creation Leaves UPI Payment Pending Verification (Never Auto-Approved)', async () => {
  const item = getValidTestItem();

  const createReq = new Request('https://example.com/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Suresh Kumar',
      customerPhone: '9876543210',
      deliveryAddress: 'Velmala Village, Hyderabad',
      distanceKm: 2.0,
      paymentMethod: 'UPI_QR',
      upiUtr: '428190283741',
      items: [item],
    }),
  });

  const res = await postOrdersRoute(createReq);
  const data = await res.json();
  if (res.status !== 200) {
    console.log('Error detail:', JSON.stringify(data));
  }
  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  const order = data.data.order;

  assert.equal(order.paymentStatus, 'AWAITING_VERIFICATION', 'UPI payment status MUST be AWAITING_VERIFICATION');
  assert.equal(order.status, 'PENDING_REVIEW', 'Order status MUST be PENDING_REVIEW');
  assert.equal(order.upiUtr, undefined, 'Public viewer / customer response must not leak raw UTR');

  // Verify internal store state
  const stored = ServerStore.getOrderById(order.orderNumber);
  assert.ok(stored);
  assert.equal(stored.paymentStatus, 'AWAITING_VERIFICATION');
  assert.equal(stored.upiUtr, '428190283741');
});

test('3. Payment Proof Upload Rejects Fake Images, Oversized Files, and Invalid Magic Bytes', async () => {
  // First create an order to attach proof to
  const orderNumber = `UC-PROOF-${Date.now()}`;
  ServerStore.createOrder({
    id: `ord-test-${Date.now()}`,
    orderNumber,
    customerName: 'Proof Test Customer',
    customerPhone: '+91 9876543211',
    deliveryAddress: 'Velmala Hub',
    distanceKm: 1.5,
    subtotal: 999,
    deliveryFee: 0,
    discountAmount: 0,
    totalAmount: 999,
    paymentMethod: 'UPI_QR',
    paymentStatus: 'AWAITING_VERIFICATION',
    status: 'PENDING_REVIEW',
    deliveryOtp: '1234',
    items: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const adminHeaders = getAdminHeaders();

  // Test 3a: Missing orderNumber
  const missingOrderForm = new FormData();
  missingOrderForm.append('file', new Blob([new Uint8Array(createValidJpegBuffer())], { type: 'image/jpeg' }), 'proof.jpg');
  const reqMissing = new Request('https://example.com/api/orders/payment-proof', {
    method: 'POST',
    headers: adminHeaders,
    body: missingOrderForm,
  });
  const resMissing = await postPaymentProof(reqMissing);
  assert.equal(resMissing.status, 400);

  // Test 3b: Fake image (plain text disguised with image/png MIME type)
  const fakeForm = new FormData();
  fakeForm.append('orderNumber', orderNumber);
  fakeForm.append(
    'file',
    new Blob(['<html><body>malicious payload</body></html>'], { type: 'image/png' }),
    'fake_screenshot.png'
  );
  const reqFake = new Request('https://example.com/api/orders/payment-proof', {
    method: 'POST',
    headers: adminHeaders,
    body: fakeForm,
  });
  const resFake = await postPaymentProof(reqFake);
  const dataFake = await resFake.json();
  assert.equal(resFake.status, 400);
  assert.equal(dataFake.error.code, 'INVALID_IMAGE_BYTES', 'Must reject file with invalid magic bytes');

  // Test 3c: Oversized file (> 5MB)
  const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024); // 6 MB
  const oversizedForm = new FormData();
  oversizedForm.append('orderNumber', orderNumber);
  oversizedForm.append(
    'file',
    new Blob([new Uint8Array(oversizedBuffer)], { type: 'image/jpeg' }),
    'oversized.jpg'
  );
  const reqOversized = new Request('https://example.com/api/orders/payment-proof', {
    method: 'POST',
    headers: adminHeaders,
    body: oversizedForm,
  });
  const resOversized = await postPaymentProof(reqOversized);
  const dataOversized = await resOversized.json();
  assert.equal(resOversized.status, 400);
  assert.equal(dataOversized.error.code, 'FILE_TOO_LARGE', 'Must reject screenshot files exceeding 5MB');

  // Test 3d: Valid genuine PNG screenshot upload
  const validForm = new FormData();
  validForm.append('orderNumber', orderNumber);
  validForm.append('upiUtr', '987654321098');
  validForm.append(
    'file',
    new Blob([new Uint8Array(createValidPngBuffer())], { type: 'image/png' }),
    'payment_screenshot.png'
  );
  const reqValid = new Request('https://example.com/api/orders/payment-proof', {
    method: 'POST',
    headers: adminHeaders,
    body: validForm,
  });
  const resValid = await postPaymentProof(reqValid);
  const dataValid = await resValid.json();
  assert.equal(resValid.status, 200);
  assert.equal(dataValid.success, true);
  assert.ok(dataValid.data.storagePath, 'Must return saved storage path');

  // Verify internal store was updated with proof and UTR
  const updatedStored = ServerStore.getOrderById(orderNumber);
  assert.ok(updatedStored);
  assert.ok(updatedStored.paymentScreenshot, 'Must record payment screenshot in order');
  assert.equal(updatedStored.upiUtr, '987654321098');
  assert.equal(updatedStored.paymentStatus, 'AWAITING_VERIFICATION', 'Uploading proof must NOT auto-approve payment');
});

test('4. Admin Authorization Required to View Screenshots and Approve/Reject Payments', async () => {
  const orderNumber = `UC-AUTH-${Date.now()}`;
  ServerStore.createOrder({
    id: `ord-auth-${Date.now()}`,
    orderNumber,
    customerName: 'Auth Test Customer',
    customerPhone: '+91 9876543212',
    deliveryAddress: 'Velmala Hub',
    distanceKm: 1.0,
    subtotal: 1200,
    deliveryFee: 0,
    discountAmount: 0,
    totalAmount: 1200,
    paymentMethod: 'UPI_QR',
    paymentStatus: 'AWAITING_VERIFICATION',
    status: 'PENDING_REVIEW',
    deliveryOtp: '5678',
    paymentScreenshot: `proofs/${orderNumber}_test.png`,
    upiUtr: '112233445566',
    items: [{ productId: 'p1', variantId: 'v1', name: 'Chakkars', variantName: 'Box', boxQuantity: '10 pcs', price: 600, quantity: 2, image: '' }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Test 4a: Unauthenticated viewer trying to access payment proof -> 401
  const unauthProofReq = new Request(`https://example.com/api/orders/payment-proof?orderNumber=${orderNumber}`);
  const unauthProofRes = await getPaymentProof(unauthProofReq);
  assert.equal(unauthProofRes.status, 401, 'Public/unauthenticated cannot view private payment screenshots');

  // Test 4b: Unauthorized viewer trying to approve payment -> 401
  const unauthApproveReq = new Request('https://example.com/api/orders', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderNumber,
      action: 'APPROVE_PAYMENT',
    }),
  });
  const unauthApproveRes = await patchOrdersRoute(unauthApproveReq);
  assert.equal(unauthApproveRes.status, 401, 'Unauthorized caller cannot approve payment');

  // Test 4c: Authorized Admin Approves Payment -> PAID & ACCEPTED
  const adminHeaders = getAdminHeaders();
  const adminApproveReq = new Request('https://example.com/api/orders', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...adminHeaders,
    },
    body: JSON.stringify({
      orderNumber,
      action: 'APPROVE_PAYMENT',
      upiUtr: '112233445566',
    }),
  });
  const adminApproveRes = await patchOrdersRoute(adminApproveReq);
  const approveData = await adminApproveRes.json();
  assert.equal(adminApproveRes.status, 200);
  assert.equal(approveData.success, true);
  assert.equal(approveData.data.paymentStatus, 'PAID');
  assert.equal(approveData.data.status, 'ACCEPTED');

  // Test 4d: Create another order to test Admin Reject Payment -> PAYMENT_FAILED & REJECTED & stock restored
  const rejectOrderNum = `UC-REJECT-${Date.now()}`;
  ServerStore.createOrder({
    id: `ord-reject-${Date.now()}`,
    orderNumber: rejectOrderNum,
    customerName: 'Reject Test Customer',
    customerPhone: '+91 9876543213',
    deliveryAddress: 'Velmala Hub',
    distanceKm: 1.0,
    subtotal: 800,
    deliveryFee: 0,
    discountAmount: 0,
    totalAmount: 800,
    paymentMethod: 'UPI_QR',
    paymentStatus: 'AWAITING_VERIFICATION',
    status: 'PENDING_REVIEW',
    deliveryOtp: '9012',
    items: [{ productId: 'p1', variantId: 'v1', name: 'Rocket', variantName: 'Pack', boxQuantity: '5 pcs', price: 800, quantity: 1, image: '' }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const adminRejectReq = new Request('https://example.com/api/orders', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...adminHeaders,
    },
    body: JSON.stringify({
      orderNumber: rejectOrderNum,
      action: 'REJECT_PAYMENT',
      rejectionReason: 'Bank credit verification failed: UTR 000000000000 not reflected in Axis Bank statement.',
    }),
  });
  const adminRejectRes = await patchOrdersRoute(adminRejectReq);
  const rejectData = await adminRejectRes.json();
  assert.equal(adminRejectRes.status, 200);
  assert.equal(rejectData.success, true);
  assert.equal(rejectData.data.paymentStatus, 'PAYMENT_FAILED');
  assert.equal(rejectData.data.status, 'REJECTED');

  const rejectedStored = ServerStore.getOrderById(rejectOrderNum);
  assert.ok(rejectedStored);
  assert.equal(rejectedStored.stockRestored, true, 'Reserved stock must be restored on payment rejection');
});

test('5. Cash on Delivery (COD) Remains Fully Preserved and Functional', async () => {
  const item = getValidTestItem();

  const codReq = new Request('https://example.com/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'COD Customer',
      customerPhone: '9123456789',
      deliveryAddress: 'Velmala Hub, Near Water Tank',
      distanceKm: 1.2,
      paymentMethod: 'COD',
      items: [item],
    }),
  });

  const res = await postOrdersRoute(codReq);
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.order.paymentMethod, 'COD');
  assert.equal(data.data.order.paymentStatus, 'PENDING_COD', 'COD orders must maintain PENDING_COD payment status');
});

test('6. Missing or Empty Merchant UPI Configuration Fails Safely', async () => {
  const origEnv = process.env.MERCHANT_UPI_ID;
  const origPublicEnv = process.env.NEXT_PUBLIC_MERCHANT_UPI_ID;

  try {
    // Explicitly set unconfigured / empty merchant UPI ID
    process.env.MERCHANT_UPI_ID = '';
    process.env.NEXT_PUBLIC_MERCHANT_UPI_ID = '';

    // 6a: Config route reports upiConfigured: false
    const configRes = await getPaymentConfig();
    const configData = await configRes.json();
    assert.equal(configData.data.upiConfigured, false, 'Must report upiConfigured: false when unconfigured');
    assert.equal(configData.data.merchantUpiId, null, 'Must return null merchantUpiId when unconfigured');

    // 6b: Order creation with UPI_QR is blocked safely with 400 UPI_NOT_CONFIGURED
    const item = getValidTestItem();
    const createReq = new Request('https://example.com/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Unconfigured Test',
        customerPhone: '9876543219',
        deliveryAddress: 'Velmala Hub',
        distanceKm: 1.0,
        paymentMethod: 'UPI_QR',
        upiUtr: '123456789012',
        items: [item],
      }),
    });

    const res = await postOrdersRoute(createReq);
    const data = await res.json();
    assert.equal(res.status, 400);
    assert.equal(data.error.code, 'UPI_NOT_CONFIGURED', 'Must fail safely with UPI_NOT_CONFIGURED error');
  } finally {
    // Restore environment
    if (origEnv !== undefined) process.env.MERCHANT_UPI_ID = origEnv;
    else delete process.env.MERCHANT_UPI_ID;
    if (origPublicEnv !== undefined) process.env.NEXT_PUBLIC_MERCHANT_UPI_ID = origPublicEnv;
    else delete process.env.NEXT_PUBLIC_MERCHANT_UPI_ID;
  }
});

test('7. Customer Cannot Tamper Payment Status to PAID or Call APPROVE_PAYMENT', async () => {
  const item = getValidTestItem();

  // 7a: Customer sends paymentStatus: 'PAID' in POST body
  const tamperReq = new Request('https://example.com/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Tamper Attacker',
      customerPhone: '9876543218',
      deliveryAddress: 'Velmala Hub',
      distanceKm: 1.0,
      paymentMethod: 'UPI_QR',
      paymentStatus: 'PAID', // Forged payment status attempt
      upiUtr: '123456789012',
      items: [item],
    }),
  });

  const res = await postOrdersRoute(tamperReq);
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(
    data.data.order.paymentStatus,
    'AWAITING_VERIFICATION',
    'Server MUST override forged paymentStatus and set AWAITING_VERIFICATION'
  );

  const orderNum = data.data.order.orderNumber;

  // 7b: Customer session or unauthenticated caller attempts action: 'APPROVE_PAYMENT' via PATCH
  const unauthPatch = new Request('https://example.com/api/orders', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderNumber: orderNum,
      action: 'APPROVE_PAYMENT',
    }),
  });

  const patchRes = await patchOrdersRoute(unauthPatch);
  assert.equal(patchRes.status, 401, 'Customer/unauthenticated caller must receive 401 Unauthorized on APPROVE_PAYMENT');
  const patchData = await patchRes.json();
  assert.equal(patchData.error.code, 'UNAUTHORIZED');

  // Verify order in store remains unapproved
  const stored = ServerStore.getOrderById(orderNum);
  assert.ok(stored);
  assert.equal(stored.paymentStatus, 'AWAITING_VERIFICATION');
  assert.equal(stored.status, 'PENDING_REVIEW');
});
