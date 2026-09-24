# N CRACKERS — DATABASE ARCHITECTURE & SCHEMA SPECIFICATION

## 1. Database Engine & Principles
* **Engine**: PostgreSQL (v14+)
* **Data Access Layer**: Prisma ORM (Client v5.22.0)
* **Design Principles**:
  * Strict Foreign Key Referential Integrity with explicit `onDelete` cascades/restricts.
  * Decimal types (`@db.Decimal(10, 2)`) for all currency and financial figures to eliminate floating-point rounding errors.
  * B-tree indexes on lookup columns, foreign keys, status flags, and geolocation pairs.
  * Explicit audit logs and status transition histories.

---

## 2. Core Entity Relationship Overview

| Model | Description | Key Indexes & Relations |
| :--- | :--- | :--- |
| `User` | Master authentication identity for all roles | Indexed on `phone`, `email`, `role` |
| `CustomerProfile` | Customer metadata, guest status | Foreign key to `User`, relation to `Address[]` |
| `DeliveryAgentProfile`| Vehicle info, live location, duty state | Indexed on `dutyStatus`, relations to `DeliveryAssignment[]` |
| `Address` | Customer delivery addresses with coordinates | Indexed on `customerId`, `(latitude, longitude)` |
| `Category` | Firework groupings (e.g. Sparklers, Sky Shots) | Unique `slug`, indexed on `isActive` |
| `Product` | Master cracker catalog | Foreign key to `Category`, unique `slug` |
| `ProductVariant` | Sizing/box variations (e.g. Box of 10) | Unique `sku`, indexed on `productId` |
| `ProductImage` | Product asset URLs and sort order | Foreign key to `Product` |
| `InventoryReservation` | Temporary 15-minute checkout holds | Indexed on `variantId`, `(expiresAt, status)` |
| `Order` | Customer order record with distance & OTP | Unique `orderNumber`, `idempotencyKey`, indexed on `customerId`, `status` |
| `OrderItem` | Snapshot of purchased variant & unit price | Foreign keys to `Order` and `ProductVariant` |
| `OrderStatusHistory` | Audit trail of lifecycle modifications | Foreign key to `Order` |
| `Payment` | Payment records, gateway IDs, webhooks | Unique `idempotencyKey`, indexed on `gatewayOrderId` |
| `DeliveryAssignment` | Assignment of order to delivery agent | Unique `orderId`, indexed on `agentId` |
| `TrackingSession` | Active GPS tracking session | Unique `assignmentId`, indexed on `isActive` |
| `GpsPing` | Realtime coordinate stream | Indexed on `(sessionId, timestamp)` |
| `DeliveryPricingSlab` | Distance-based fee calculation table | Indexed on `(minKm, maxKm)` |
| `Coupon` & `Usage` | Promotional codes & redemption records | Unique `code`, indexed on `(couponId, userId)` |
| `ComboOffer` & `Items` | Multi-product bundled offers | Foreign keys to `Product` |
| `Review` | Customer product & delivery ratings (1-5) | Unique `orderId`, indexed on `productId`, `userId` |
| `StoreSettings` | Runtime store parameters & center coordinates | Singleton record (`id: "default"`) |
| `AuditLog` | Security & administrative actions log | Indexed on `action`, `createdAt` |

---

## 3. Migration Strategy
1. **Development Migrations**:
   ```bash
   npx prisma migrate dev --name init_master_schema
   ```
2. **Production Deployments**:
   ```bash
   npx prisma migrate deploy
   ```
3. **Seeding Strategy (Phase 1)**:
   A dedicated seed script will initialize:
   * Super Admin account with secure password hash
   * Store Settings with default Velmala coordinates (`17.502900, 78.257300`) and 7 km radius
   * Default Delivery Pricing Slabs (₹40, ₹70, ₹120)
   * Base firework categories (Sparklers, Flower Pots, Ground Chakkars, Rockets, Sky Shots, Garlands)

---

## 4. Concurrency & Transaction Boundaries
* **Checkout Order Placement**: Executed in a single atomic transaction:
  1. Verify variant active status and available stock (`stockQuantity - activeReservations >= requested`).
  2. Create `InventoryReservation` with `expiresAt = now() + 15 minutes`.
  3. Create `Order` record in `PLACED` status.
  4. Generate and store `idempotencyKey`.
* **Payment Confirmation Webhook**:
  1. Verify HMAC signature.
  2. Update `Payment` record to `CAPTURED`.
  3. Transition `Order` status to `CONFIRMED`.
  4. Decrement `stockQuantity` on `ProductVariant`.
  5. Mark `InventoryReservation` as `COMMITTED`.
