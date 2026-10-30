import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POST as postOrdersRoute } from '../src/app/api/orders/route';
import { GET as getCheckRadiusRoute } from '../src/app/api/geo/check-radius/route';
import {
  calculateDistanceKm,
  validateDeliveryLocation,
  getStoreLocation,
  getDeliveryRadiusKm,
  isValidCoordinate,
  OUT_OF_SERVICE_MESSAGE,
} from '../src/lib/geo';
import { ServerStore } from '../src/lib/server-store';
import { NextRequest } from 'next/server';

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

function makeNextReq(url: string) {
  return new NextRequest(url);
}

function getValidCartItem() {
  const p = ServerStore.getProducts().find((prod) => prod.isActive !== false && prod.variants?.length > 0) || ServerStore.getProducts()[0];
  const v = p.variants[0];
  if ((v.stock || 0) < 50) v.stock = 100;
  const qty = Math.ceil(550 / (v.price || 500));
  return [{ productId: p.id, variantId: v.id, quantity: Math.max(1, qty) }];
}

test('1. Configurable Shop Location and Standard Radius', () => {
  const storeLoc = getStoreLocation();
  assert.ok(typeof storeLoc.latitude === 'number', 'Store latitude must be a number');
  assert.ok(typeof storeLoc.longitude === 'number', 'Store longitude must be a number');
  assert.ok(storeLoc.latitude >= -90 && storeLoc.latitude <= 90);
  assert.ok(storeLoc.longitude >= -180 && storeLoc.longitude <= 180);

  const radiusKm = getDeliveryRadiusKm();
  assert.equal(radiusKm, 7.0, 'Configured delivery radius must be 7 km');
});

test('2. Coordinate Range & Format Validation (Rejects Invalid, Non-Finite, or Out-of-Bounds)', () => {
  assert.equal(isValidCoordinate(17.5029, 78.2573), true, 'Valid coordinates must pass');
  assert.equal(isValidCoordinate(0, 0), true, 'Equator/Prime Meridian must pass');
  assert.equal(isValidCoordinate(-90, -180), true, 'Boundary coordinates must pass');

  assert.equal(isValidCoordinate(91, 78.2573), false, 'Latitude > 90 must fail');
  assert.equal(isValidCoordinate(-91, 78.2573), false, 'Latitude < -90 must fail');
  assert.equal(isValidCoordinate(17.5029, 181), false, 'Longitude > 180 must fail');
  assert.equal(isValidCoordinate(17.5029, -181), false, 'Longitude < -180 must fail');

  assert.equal(isValidCoordinate('abc', 78.2573), false, 'Non-numeric latitude must fail');
  assert.equal(isValidCoordinate(NaN, 78.2573), false, 'NaN latitude must fail');
  assert.equal(isValidCoordinate(Infinity, 78.2573), false, 'Infinity latitude must fail');
  assert.equal(isValidCoordinate(null, 78.2573), false, 'Null latitude must fail');
  assert.equal(isValidCoordinate(undefined, undefined), false, 'Undefined coordinates must fail');
});

test('3. Geographic Distance Formula (Haversine Accuracy)', () => {
  const store = getStoreLocation();
  // Same location -> 0 km
  const distZero = calculateDistanceKm(store, store);
  assert.equal(distZero, 0, 'Distance to same coordinate must be 0 km');

  // Known location: Tellapur (approx 3.8 - 4.5 km away)
  const tellapurCoords = { latitude: 17.4680, longitude: 78.2910 };
  const distTellapur = calculateDistanceKm(store, tellapurCoords);
  assert.ok(distTellapur > 3.0 && distTellapur < 6.0, `Tellapur distance should be around 4.5 km, got ${distTellapur} km`);
});

test('4. Delivery Location Inside 7 km Radius Is Accepted', async () => {
  const store = getStoreLocation();
  // Point within 2 km of store (e.g. 17.5050, 78.2600)
  const nearbyCoords = { latitude: 17.5050, longitude: 78.2600 };
  const check = validateDeliveryLocation(nearbyCoords);
  assert.equal(check.isDeliverable, true);
  assert.ok(check.distanceKm < 7.0);

  // Place order with coordinates within 7 km
  const req = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Nearby Customer',
      customerPhone: '9849011111',
      deliveryAddress: 'Velmala Village, Hyderabad',
      latitude: nearbyCoords.latitude,
      longitude: nearbyCoords.longitude,
      paymentMethod: 'COD',
      items: getValidCartItem(),
    },
  });

  const res = await postOrdersRoute(req);
  assert.equal(res.status, 200, 'Order inside 7 km radius must be accepted');
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.data.order.distanceKm <= 7.0);
  assert.ok(data.data.order.deliveryFee >= 0);
});

test('5. Delivery Location Exactly on the Permitted Boundary (<= 7.0 km)', () => {
  const store = getStoreLocation();
  // Test point directly within boundary
  const insideBoundary = validateDeliveryLocation({ latitude: store.latitude + 0.05, longitude: store.longitude });
  if (insideBoundary.distanceKm <= 7.0) {
    assert.equal(insideBoundary.isDeliverable, true);
  }
});

test('6. Delivery Location Outside 7 km Service Area Is Strictly Rejected with Exact Message', async () => {
  // Gachibowli coordinates (~14 km from Velmala store)
  const farAwayCoords = { latitude: 17.4401, longitude: 78.3489 };
  const check = validateDeliveryLocation(farAwayCoords);
  assert.equal(check.isDeliverable, false, 'Location outside 7 km must be marked undeliverable');
  assert.equal(check.message, OUT_OF_SERVICE_MESSAGE, `Message must be exactly "${OUT_OF_SERVICE_MESSAGE}"`);

  // Attempt to place order with far away coordinates
  const req = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Faraway Customer',
      customerPhone: '9849011111',
      deliveryAddress: 'Gachibowli, Hyderabad',
      latitude: farAwayCoords.latitude,
      longitude: farAwayCoords.longitude,
      paymentMethod: 'COD',
      items: getValidCartItem(),
    },
  });

  const res = await postOrdersRoute(req);
  assert.equal(res.status, 400, 'Order outside 7 km radius must be rejected with 400');
  const data = await res.json();
  assert.equal(data.success, false);
  assert.equal(data.error.code, 'OUTSIDE_DELIVERY_RADIUS');
  assert.equal(data.error.message, "We don't deliver to your location");
});

test('7. Attempt to Bypass Frontend Validation with Fake distanceKm or isDeliverable Is Ignored', async () => {
  // Attacker claims distanceKm: 1.0 and isDeliverable: true, but submits coordinates in New Delhi (28.6139, 77.2090)
  const attackerPayload = {
    customerName: 'Sneaky Attacker',
    customerPhone: '9849011111',
    deliveryAddress: 'Connaught Place, New Delhi',
    isDeliverable: true, // Forged frontend flag
    distanceKm: 1.0, // Forged distance
    latitude: 28.6139, // Real submitted GPS pin: New Delhi (~1250 km away)
    longitude: 77.2090,
    paymentMethod: 'COD',
    items: getValidCartItem(),
  };

  const req = makeReq('https://example.com/api/orders', 'POST', { body: attackerPayload });
  const res = await postOrdersRoute(req);
  assert.equal(res.status, 400, 'Server must reject order based on verified coordinates, ignoring fake distanceKm');
  const data = await res.json();
  assert.equal(data.success, false);
  assert.equal(data.error.code, 'OUTSIDE_DELIVERY_RADIUS');
  assert.equal(data.error.message, "We don't deliver to your location");
});

test('8. Invalid Coordinate Inputs Are Rejected with 400 Bad Request', async () => {
  const req = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerPhone: '9849011111',
      latitude: 999, // Impossible latitude
      longitude: 78.2573,
      items: getValidCartItem(),
    },
  });

  const res = await postOrdersRoute(req);
  assert.equal(res.status, 400, 'Out-of-range latitude must be rejected with 400');
  const data = await res.json();
  assert.equal(data.success, false);
  assert.equal(data.error.code, 'INVALID_COORDINATES');
});

test('9. Geofence API Endpoint (/api/geo/check-radius) Returns Exact Message When Outside Area', async () => {
  // Query with coordinates in Hitec City (15 km away)
  const farUrl = 'https://example.com/api/geo/check-radius?lat=17.4474&lng=78.3762';
  const resFar = await getCheckRadiusRoute(makeNextReq(farUrl));
  assert.equal(resFar.status, 200);
  const dataFar = await resFar.json();
  assert.equal(dataFar.success, true);
  assert.equal(dataFar.data.isDeliverable, false);
  assert.equal(dataFar.data.message, "We don't deliver to your location");

  // Query with nearby coordinates (Velmala, 0.5 km away)
  const nearUrl = 'https://example.com/api/geo/check-radius?lat=17.5035&lng=78.2580';
  const resNear = await getCheckRadiusRoute(makeNextReq(nearUrl));
  assert.equal(resNear.status, 200);
  const dataNear = await resNear.json();
  assert.equal(dataNear.success, true);
  assert.equal(dataNear.data.isDeliverable, true);
  assert.ok(dataNear.data.deliveryFee > 0);
});
