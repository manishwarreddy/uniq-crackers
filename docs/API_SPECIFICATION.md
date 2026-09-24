# N CRACKERS — API ARCHITECTURE & ENDPOINT SPECIFICATIONS

## 1. Overview & Standards
* **Protocol**: HTTPS / JSON REST APIs with standard HTTP status codes.
* **Error Envelope**: All error responses adhere to `{ success: false, error: { code, message, details }, meta }`.
* **Success Envelope**: All successful responses adhere to `{ success: true, data, meta: { timestamp, requestId } }`.
* **Idempotency**: Sensitive mutating endpoints (e.g. `/api/orders`, `/api/payments/verify`) require an `Idempotency-Key` header.

---

## 2. Phase 0 Foundation Endpoints

### 2.1. System Health
* **Route**: `GET /api/health`
* **Access**: Public
* **Response Sample**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "phase": "Phase 0 — Master Architecture & Foundation",
    "environment": "development",
    "store": {
      "name": "N Crackers",
      "centerLocation": {
        "address": "F6GQ+7PW, Velmala, Hyderabad, Telangana 502300",
        "latitude": 17.5029,
        "longitude": 78.2573
      },
      "configuredRadiusKm": 7
    },
    "database": {
      "provider": "PostgreSQL",
      "orm": "Prisma Client v5.22.0"
    }
  }
}
```

### 2.2. Geofence & Delivery Radius Check
* **Route**: `GET /api/geo/check-radius?lat={latitude}&lng={longitude}&radius={optionalKm}`
* **Access**: Public
* **Response (Within 7 KM)**:
```json
{
  "success": true,
  "data": {
    "isDeliverable": true,
    "distanceKm": 3.3,
    "maxRadiusKm": 7,
    "deliveryFee": 70,
    "storeLocation": { "latitude": 17.5029, "longitude": 78.2573 },
    "message": "Location is within our 7 km delivery zone (3.3 km from Velmala store)."
  }
}
```
* **Response (Outside 7 KM)**:
```json
{
  "success": true,
  "data": {
    "isDeliverable": false,
    "distanceKm": 11.5,
    "maxRadiusKm": 7,
    "deliveryFee": 0,
    "storeLocation": { "latitude": 17.5029, "longitude": 78.2573 },
    "message": "We don't deliver to your location (11.5 km away). Our delivery service is limited to 7 km from Velmala."
  }
}
```

---

## 3. Future Phase API Endpoints Blueprint

| Domain | Method & Path | Roles Allowed | Purpose |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST /api/auth/otp/send` | Public | Send mobile OTP to customer |
| **Auth** | `POST /api/auth/otp/verify` | Public | Verify OTP and issue JWT session |
| **Auth** | `POST /api/auth/admin/login` | Public | Super Admin / Staff credentials + 2FA |
| **Products** | `GET /api/products` | Public | Paginated product catalog with category filter |
| **Products** | `POST /api/products` | Admin, Staff | Create / update product variant |
| **Cart** | `POST /api/cart/reserve` | Customer, Guest | Place temporary 15-min inventory hold |
| **Orders** | `POST /api/orders` | Customer, Guest | Submit order (requires deliverable 7km address) |
| **Orders** | `GET /api/orders/{id}` | Owner, Staff | Fetch order status, items, delivery details |
| **Payments** | `POST /api/payments/razorpay/create`| Customer | Create Razorpay order |
| **Payments** | `POST /api/payments/webhook` | Webhook (HMAC)| Asynchronous payment confirmation |
| **Delivery** | `POST /api/delivery/gps-ping` | Delivery Agent | Stream GPS coordinates during active run |
| **Delivery** | `POST /api/delivery/verify-otp` | Delivery Agent | Submit 4-digit OTP to complete delivery |
| **Admin** | `GET /api/admin/metrics` | Super Admin, Admin | Festival rush sales, inventory, and agent status |
