import test from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyAdminPassword,
  createAdminSessionToken,
  verifyAdminSessionToken,
  getAdminSession,
  requireAdmin,
  ADMIN_COOKIE_NAME,
} from '../src/lib/server-auth';
import { checkRateLimit, resetRateLimit } from '../src/lib/security';
import { GET as getAdminSettings, POST as postAdminSettings } from '../src/app/api/admin/settings/route';
import { GET as getAdminNotifications, POST as postAdminNotifications } from '../src/app/api/admin/notifications/route';
import { POST as postAdminCatalog } from '../src/app/api/admin/catalog/route';
import { GET as getOrders, PATCH as patchOrders } from '../src/app/api/orders/route';
import { POST as postAdminLogin } from '../src/app/api/auth/admin/login/route';
import { GET as getAdminMe } from '../src/app/api/auth/admin/me/route';

// Set test environment configuration
process.env.ADMIN_PASSWORD = 'TestAdminSecret@2026';
process.env.ADMIN_SESSION_SECRET = 'test-secret-key-diwali-2026-very-secure';

test('1. Password Verification & Constant-Time Security', () => {
  assert.equal(verifyAdminPassword('TestAdminSecret@2026'), true, 'Correct password must be verified');
  assert.equal(verifyAdminPassword('WrongPassword'), false, 'Incorrect password must be rejected');
  assert.equal(verifyAdminPassword(''), false, 'Empty password must be rejected');
  assert.equal(verifyAdminPassword('admin123'), false, 'Default insecure passwords must not work');
});

test('2. Admin Session Token Generation & Verification', () => {
  const token = createAdminSessionToken({
    userId: 'admin-01',
    name: 'Super Admin',
    role: 'ADMIN',
  });

  assert.ok(token, 'Token should be generated');
  assert.equal(token.split('.').length, 3, 'Token must follow 3-part header.payload.signature format');

  const verified = verifyAdminSessionToken(token);
  assert.ok(verified, 'Valid token must be verified');
  assert.equal(verified?.userId, 'admin-01');
  assert.equal(verified?.role, 'ADMIN');
  assert.equal(verified?.name, 'Super Admin');
});

test('3. Rejection of Tampered, Invalid, or Forged Tokens', () => {
  const validToken = createAdminSessionToken();
  const [header, payload, sig] = validToken.split('.');

  // 1. Tampered payload
  const tamperedPayload = Buffer.from(JSON.stringify({ userId: 'hacker', role: 'ADMIN', exp: 9999999999 })).toString('base64url');
  const forgedToken = `${header}.${tamperedPayload}.${sig}`;
  assert.equal(verifyAdminSessionToken(forgedToken), null, 'Forged payload must be rejected');

  // 2. Tampered signature
  const brokenSigToken = `${header}.${payload}.invalidsignature123`;
  assert.equal(verifyAdminSessionToken(brokenSigToken), null, 'Invalid signature must be rejected');

  // 3. Random string
  assert.equal(verifyAdminSessionToken('not.a.validtoken'), null, 'Malformed token must be rejected');
});

test('4. Rejection of Expired Sessions', () => {
  // Token that expired 10 seconds ago
  const expiredToken = createAdminSessionToken({}, -10);
  const result = verifyAdminSessionToken(expiredToken);
  assert.equal(result, null, 'Expired session token must be rejected');
});

test('5. Rejection of Non-Admin Roles (Customer Token Cannot Act as Admin)', () => {
  // A customer token that does not have role: 'ADMIN'
  const customerToken = createAdminSessionToken({
    role: 'CUSTOMER' as any,
  });
  const result = verifyAdminSessionToken(customerToken);
  assert.equal(result, null, 'Customer role must not be verified as admin session');
});

test('6. Unauthenticated Visitors Cannot Access Protected Admin Endpoints', async () => {
  // Dummy unauthenticated request
  const req = new Request('http://localhost:3000/api/admin/settings', {
    method: 'GET',
  });

  // Verify requireAdmin directly
  const { session, errorResponse } = requireAdmin(req);
  assert.equal(session, null, 'Session must be null for unauthenticated request');
  assert.ok(errorResponse, 'Error response must be returned');
  assert.equal(errorResponse.status, 401, 'Status code must be 401 Unauthorized');

  // Test /api/admin/settings GET
  const settingsRes = await getAdminSettings(req);
  assert.equal(settingsRes.status, 401, 'GET /api/admin/settings must return 401 for unauthenticated visitor');

  // Test /api/admin/settings POST
  const settingsPostRes = await postAdminSettings(new Request('http://localhost:3000/api/admin/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ maxRadiusKm: 50 }),
  }));
  assert.equal(settingsPostRes.status, 401, 'POST /api/admin/settings must return 401 for unauthenticated visitor');

  // Test /api/admin/notifications GET
  const notifRes = await getAdminNotifications(req);
  assert.equal(notifRes.status, 401, 'GET /api/admin/notifications must return 401 for unauthenticated visitor');

  // Test /api/admin/catalog POST (product mutation)
  const catalogPostRes = await postAdminCatalog(new Request('http://localhost:3000/api/admin/catalog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'DELETE_PRODUCT', payload: { productId: 'prod-01' } }),
  }));
  assert.equal(catalogPostRes.status, 401, 'POST /api/admin/catalog must return 401 for unauthenticated visitor');

  // Test /api/orders GET without filters (all-orders dump)
  const ordersDumpRes = await getOrders(new Request('http://localhost:3000/api/orders', { method: 'GET' }));
  assert.equal(ordersDumpRes.status, 401, 'GET /api/orders without filters must return 401 for unauthenticated visitor');

  // Test /api/orders PATCH (order status update)
  const ordersPatchRes = await patchOrders(new Request('http://localhost:3000/api/orders', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderNumber: 'UC-2026-9999', action: 'VERIFY_UPI' }),
  }));
  assert.equal(ordersPatchRes.status, 401, 'PATCH /api/orders must return 401 for unauthenticated visitor');

  // Test /api/auth/admin/me
  const meRes = await getAdminMe(req);
  assert.equal(meRes.status, 401, 'GET /api/auth/admin/me must return 401 for unauthenticated visitor');
});

test('7. Authenticated Administrator With Valid Session Can Access Protected APIs', async () => {
  const adminToken = createAdminSessionToken({
    userId: 'admin-super-01',
    name: 'Store Administrator',
    role: 'ADMIN',
  });

  const authenticatedReq = new Request('http://localhost:3000/api/admin/settings', {
    method: 'GET',
    headers: {
      cookie: `${ADMIN_COOKIE_NAME}=${adminToken}`,
    },
  });

  const session = getAdminSession(authenticatedReq);
  assert.ok(session, 'Admin session must be extracted from cookie');
  assert.equal(session?.role, 'ADMIN');

  // GET /api/admin/settings
  const settingsRes = await getAdminSettings(authenticatedReq);
  assert.equal(settingsRes.status, 200, 'Authenticated admin must receive 200 from settings');

  // GET /api/admin/notifications
  const notifReq = new Request('http://localhost:3000/api/admin/notifications', {
    method: 'GET',
    headers: {
      cookie: `${ADMIN_COOKIE_NAME}=${adminToken}`,
    },
  });
  const notifRes = await getAdminNotifications(notifReq);
  assert.equal(notifRes.status, 200, 'Authenticated admin must receive 200 from notifications');

  // GET /api/auth/admin/me
  const meRes = await getAdminMe(authenticatedReq);
  assert.equal(meRes.status, 200, 'GET /api/auth/admin/me must return 200 for authenticated admin');
  const meData = await meRes.json();
  assert.equal(meData.data.authenticated, true);
  assert.equal(meData.data.user.role, 'ADMIN');
});

test('8. Admin Login Rate Limiting Blocks Excessive Brute-Force Attempts', async () => {
  const testIp = '192.168.1.100';
  const rateKey = `admin-login:${testIp}`;
  resetRateLimit(rateKey);

  // Send 5 incorrect password attempts
  for (let i = 0; i < 5; i++) {
    const res = await postAdminLogin(new Request('http://localhost:3000/api/auth/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': testIp,
      },
      body: JSON.stringify({ password: 'bad-password' }),
    }));
    assert.equal(res.status, 401, `Attempt ${i + 1} must return 401`);
  }

  // 6th attempt should trigger 429 Rate Limited
  const rateLimitedRes = await postAdminLogin(new Request('http://localhost:3000/api/auth/admin/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': testIp,
    },
    body: JSON.stringify({ password: 'TestAdminSecret@2026' }),
  }));
  assert.equal(rateLimitedRes.status, 429, '6th attempt must return 429 Too Many Requests');

  resetRateLimit(rateKey);
});

test('9. Admin Login With Valid Password Issues HttpOnly Cookie', async () => {
  const testIp = '192.168.1.200';
  resetRateLimit(`admin-login:${testIp}`);

  const loginRes = await postAdminLogin(new Request('http://localhost:3000/api/auth/admin/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': testIp,
    },
    body: JSON.stringify({ password: 'TestAdminSecret@2026' }),
  }));

  assert.equal(loginRes.status, 200, 'Valid login must return 200 OK');
  const data = await loginRes.json();
  assert.equal(data.success, true);
  assert.equal(data.data.authenticated, true);
  assert.equal(data.data.user.role, 'ADMIN');

  // Verify Set-Cookie header contains admin_session and HttpOnly
  const setCookie = loginRes.headers.get('set-cookie');
  assert.ok(setCookie, 'set-cookie header must be present');
  assert.ok(setCookie?.includes(ADMIN_COOKIE_NAME), 'Must set admin_session cookie');
  assert.ok(setCookie?.includes('HttpOnly'), 'Must have HttpOnly flag');
});
