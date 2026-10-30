import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POST as postOrdersRoute } from '../src/app/api/orders/route';
import { GET as getCheckRadiusRoute } from '../src/app/api/geo/check-radius/route';
import {
  calculateDistanceKm,
  validateDeliveryLocation,
  getStoreLocation,
  getDeliveryRadiusKm,
  getDeliveryPricingForDistance,
  OUT_OF_SERVICE_MESSAGE,
} from '../src/lib/geo';
import {
  searchDeliveryLocations,
  calculateLocationDetails,
  KNOWN_LOCALITIES,
} from '../src/lib/location-service';
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

function getValidCartItem() {
  const products = ServerStore.getProducts();
  const prod = products.find((p) => p.isActive !== false && p.variants?.length > 0) || products[0];
  const variant = prod.variants[0];
  const qty = Math.ceil(550 / (variant.price || 500));
  return [{ productId: prod.id, variantId: variant.id, quantity: Math.max(1, qty) }];
}

test('1. Shop Hub Location Baseline and 7 km Radius', () => {
  const store = getStoreLocation();
  assert.equal(typeof store.latitude, 'number');
  assert.equal(typeof store.longitude, 'number');
  assert.ok(Math.abs(store.latitude - 17.5029) < 0.001, 'Default latitude should be ~17.5029 (Velmala Hub)');
  assert.ok(Math.abs(store.longitude - 78.2573) < 0.001, 'Default longitude should be ~78.2573 (Velmala Hub)');

  const radius = getDeliveryRadiusKm();
  assert.equal(radius, 7.0, 'Configured delivery radius limit must be 7.0 km');
});

test('2. Manual Search Locality Suggestions within 7 km', async () => {
  // Search for Tellapur
  const resultsTellapur = await searchDeliveryLocations('Tellapur');
  assert.ok(resultsTellapur.length > 0, 'Should find Tellapur in search');
  const tellapur = resultsTellapur[0];
  assert.ok(tellapur.name.toLowerCase().includes('tellapur'));
  assert.ok(tellapur.distanceKm <= 7.0, 'Tellapur is within 7 km');
  assert.equal(tellapur.isDeliverable, true);

  // Search for Kollur
  const resultsKollur = await searchDeliveryLocations('Kollur');
  assert.ok(resultsKollur.length > 0, 'Should find Kollur in search');
  const kollur = resultsKollur[0];
  assert.equal(kollur.isDeliverable, true);
  assert.ok(kollur.distanceKm <= 7.0);

  // Search for Mokila
  const resultsMokila = await searchDeliveryLocations('Mokila');
  assert.ok(resultsMokila.length > 0);
  assert.equal(resultsMokila[0].isDeliverable, true);
});

test('3. Draggable Map Pin Coordinate Calculation & Pricing Updates', async () => {
  const store = getStoreLocation();

  // Pin placed 1.5 km away from hub
  // 0.01 degree latitude is approx 1.11 km
  const pinNearLat = store.latitude + 0.012;
  const pinNearLng = store.longitude + 0.005;
  const detailsNear = await calculateLocationDetails(pinNearLat, pinNearLng, 'Test Custom Address Near Hub', '502300');

  assert.ok(detailsNear.distanceKm < 3.0, 'Distance should be under 3 km');
  assert.equal(detailsNear.isDeliverable, true);
  assert.ok(detailsNear.deliveryFee > 0);
  assert.equal(detailsNear.confirmed, true);
  assert.equal(detailsNear.address, 'Test Custom Address Near Hub');

  // Pin placed 15 km away from hub (outside service area)
  const pinFarLat = store.latitude + 0.15;
  const pinFarLng = store.longitude + 0.15;
  const detailsFar = await calculateLocationDetails(pinFarLat, pinFarLng, 'Faraway Location Out of Zone', '500001');

  assert.ok(detailsFar.distanceKm > 7.0, 'Distance should be greater than 7 km');
  assert.equal(detailsFar.isDeliverable, false);
  assert.equal(detailsFar.zoneLabel, OUT_OF_SERVICE_MESSAGE);
});

test('4. Tiered Delivery Pricing Rules Enforced under 7 km', () => {
  // Configured Slabs:
  // 0 - 2 km: ₹40
  // 2 - 4 km: ₹70
  // 4 - 7 km: ₹120
  // > 7 km: Undeliverable
  const p1 = getDeliveryPricingForDistance(1.0);
  assert.equal(p1.isDeliverable, true);
  assert.equal(p1.fee, 40);

  const p2 = getDeliveryPricingForDistance(3.2);
  assert.equal(p2.isDeliverable, true);
  assert.equal(p2.fee, 70);

  const p3 = getDeliveryPricingForDistance(5.5);
  assert.equal(p3.isDeliverable, true);
  assert.equal(p3.fee, 120);

  const pFar = getDeliveryPricingForDistance(7.1);
  assert.equal(pFar.isDeliverable, false);
  assert.equal(pFar.label, OUT_OF_SERVICE_MESSAGE);
});

test('5. Out of Service Area Displays Exact Message: "We don\'t deliver to your location"', async () => {
  // Coordinates in Secunderabad (approx 25 km away)
  const outOfServiceCoords = { latitude: 17.4399, longitude: 78.4983 };
  const check = validateDeliveryLocation(outOfServiceCoords);

  assert.equal(check.isDeliverable, false);
  assert.equal(check.message, "We don't deliver to your location");

  // Endpoint verification
  const url = `https://example.com/api/geo/check-radius?lat=${outOfServiceCoords.latitude}&lng=${outOfServiceCoords.longitude}`;
  const res = await getCheckRadiusRoute(new NextRequest(url));
  const json = await res.json();
  assert.equal(json.data.isDeliverable, false);
  assert.equal(json.data.message, "We don't deliver to your location");
});

test('6. Order Submission with Valid Confirmed Coordinates Inside 7 km Succeeds', async () => {
  const store = getStoreLocation();
  const validLoc = {
    latitude: store.latitude + 0.01,
    longitude: store.longitude + 0.01,
  };

  const req = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Confirmed Customer',
      customerPhone: '9849022222',
      deliveryAddress: 'Near Ramalayam, Velmala, Hyderabad 502300',
      latitude: validLoc.latitude,
      longitude: validLoc.longitude,
      paymentMethod: 'COD',
      items: getValidCartItem(),
    },
  });

  const res = await postOrdersRoute(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.data.order.distanceKm <= 7.0);
  assert.ok(data.data.order.orderNumber.startsWith('UC-2026-'));
});

test('7. Order Submission with Coordinates Outside 7 km Strictly Fails with 400', async () => {
  // Coordinates 12 km away
  const farLat = 17.4300;
  const farLng = 78.3600;

  const req = makeReq('https://example.com/api/orders', 'POST', {
    body: {
      customerName: 'Outside Radius Customer',
      customerPhone: '9849022222',
      deliveryAddress: 'Madhapur, Hyderabad 500081',
      latitude: farLat,
      longitude: farLng,
      paymentMethod: 'COD',
      items: getValidCartItem(),
    },
  });

  const res = await postOrdersRoute(req);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.equal(data.error.code, 'OUTSIDE_DELIVERY_RADIUS');
  assert.equal(data.error.message, "We don't deliver to your location");
});
