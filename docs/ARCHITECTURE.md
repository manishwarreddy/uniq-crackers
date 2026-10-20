# N CRACKERS — MASTER ARCHITECTURE DOCUMENTATION

## 1. Executive Summary

**N Crackers** is a production-ready, high-performance e-commerce and local delivery web platform designed for retail fireworks operations during festival rush seasons. The platform supports **1,500+ registered customers**, **hundreds of concurrent orders**, **100–250 products** with variants, inventory locking, local **7 km geofenced delivery from Velmala, Hyderabad**, live GPS delivery tracking, role-based operations, and multi-channel notifications.

---

## 2. High-Level System Architecture

```text
[ Customer (Web / Mobile) ]     [ Delivery Agent (PWA / Mobile) ]     [ Super Admin / Staff (Dashboard) ]
               │                                │                                    │
               └────────────────────────────────┼────────────────────────────────────┘
                                                │
                                    [ HTTPS / WSS API Gateway ]
                                                │
               ┌────────────────────────────────┴────────────────────────────────┐
               │                        Next.js App Router                       │
               │  ┌───────────────────────────────────────────────────────────┐  │
               │  │  Presentation Layer: React 18, Tailwind CSS, Tokens UI    │  │
               │  ├───────────────────────────────────────────────────────────┤  │
               │  │  Validation & Security: Zod Schemas, Rate Limiting, HMAC  │  │
               │  ├───────────────────────────────────────────────────────────┤  │
               │  │  Service Layer: Order, Delivery, Auth, Inventory, Geo     │  │
               │  ├───────────────────────────────────────────────────────────┤  │
               │  │  Data Access Layer: Prisma ORM (Connection Pooled)        │  │
               │  └───────────────────────────────────────────────────────────┘  │
               └────────────────────────────────┬────────────────────────────────┘
                                                │
                     ┌──────────────────────────┼──────────────────────────┐
                     ▼                          ▼                          ▼
          [ PostgreSQL Database ]     [ Realtime WS / SSE ]       [ External Gateways ]
          - ACID Transactions         - Live GPS Pings            - Razorpay / UPI
          - Row-Level Locking         - Order Status Push         - WhatsApp Ops API
          - Inventory Reservations                                - SMS OTP Gateway
```

---

## 3. Technology Stack Decisions

| Layer | Chosen Technology | Architectural Justification |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | High-performance server-side rendering (SSR), server components, unified API routes, optimal SEO, and rapid image optimization. |
| **Language** | TypeScript (Strict) | End-to-end type safety, compile-time contract validation, fewer runtime errors during peak festival traffic. |
| **Styling** | Tailwind CSS + Custom Tokens | Lightweight zero-runtime CSS, consistent festive design tokens (amber, gold, crimson, glow shadows), mobile-first responsiveness. |
| **Database** | PostgreSQL | Robust relational integrity, ACID transaction guarantees, row-level locking for inventory, native geometric/indexing support. |
| **ORM / Data Access** | Prisma ORM | Schema-first declarative modeling, strict TypeScript types, automated migration tooling, safe connection pooling. |
| **Validation** | Zod | Runtime input parsing and sanitization across API request payloads, query params, and environment variables. |
| **Component Icons** | Lucide React | Clean, tree-shakeable SVG icon set with high performance. |

---

## 4. Domain Subsystems

### 4.1. Geolocation & 7 KM Geofencing Engine

* **Hub Center Point**: `F6GQ+7PW, Velmala, Hyderabad, Telangana 502300` (Lat: `17.502900`, Lng: `78.257300`).
* **Algorithm**: Haversine Great-Circle formula calculating spherical distance in kilometers.
* **Geofence Policy**: Orders with destination coordinates `> 7.0 KM` from Velmala are rejected with explicit feedback: `"We don't deliver to your location"`.
* **Dynamic Distance Slabs**:
  * `0.0 - 2.0 km`: ₹40
  * `2.0 - 4.0 km`: ₹70
  * `4.0 - 7.0 km`: ₹120

### 4.2. Inventory Concurrency & Reservation Strategy

* **Lifecycle**:
  `ORDER CREATED` → `INVENTORY RESERVED (15-min TTL)` → `ORDER CONFIRMED (PAID/COD)` → `INVENTORY COMMITTED/DEDUCTED`
* **Expiration / Cancellation**: If checkout is abandoned or payment fails, reservations are automatically marked `RELEASED` / `EXPIRED`, restoring available quantities.
* **Concurrency Guard**: Atomic decrements within PostgreSQL database transactions (`SELECT ... FOR UPDATE` or Prisma `$transaction`) prevent overselling when hundreds of users buy the same limited firework item simultaneously.

### 4.3. Order State Machine

Strict state transitions prevent invalid lifecycle modifications:

1. `PLACED` → `CONFIRMED` | `CANCELLED` | `PAYMENT_FAILED`
2. `CONFIRMED` → `PREPARING` | `CANCELLED`
3. `PREPARING` → `READY_FOR_DELIVERY` | `CANCELLED`
4. `READY_FOR_DELIVERY` → `DELIVERY_AGENT_ASSIGNED` | `CANCELLED`
5. `DELIVERY_AGENT_ASSIGNED` → `OUT_FOR_DELIVERY` | `READY_FOR_DELIVERY` | `CANCELLED`
6. `OUT_FOR_DELIVERY` → `DELIVERED` | `DELIVERY_FAILED` | `CANCELLED`
7. `DELIVERED` (Terminal)
8. `CANCELLED` (Terminal)

### 4.4. Delivery Agent & Live GPS Dispatch

* **Agent Duty States**: `OFFLINE`, `ONLINE`, `ON_BREAK`, `ON_DELIVERY`.
* **Privacy Enforcement**: Agent GPS coordinates are recorded **only** during an active `TrackingSession` associated with an active delivery assignment.
* **Handoff Verification**: Customers are issued a 4-digit Delivery OTP that the delivery agent must enter upon arrival to mark the order as `DELIVERED`.

### 4.5. Payment Architecture

* **Supported Channels**: Razorpay (Cards, Netbanking, UPI QR, Wallets), Direct UPI Intent/VPA, and Cash on Delivery (COD).
* **Security & Idempotency**:
  * Server-side HMAC signature verification on all incoming webhook payloads.
  * Unique idempotency keys on payment transactions to prevent duplicate debits.
  * Zero reliance on frontend client callbacks for order confirmation.

### 4.6. Notification Strategy

* **Website Notifications**: Real-time push/in-app updates for customers, agents, and admin.
* **WhatsApp Gateway**:
  * **Strictly restricted to Admin and Delivery Agents** for operational dispatch alerts (e.g. new order received, agent assigned, order ready for pickup).
  * **Customer notifications** are delivered via in-app alerts and SMS OTP to eliminate WhatsApp spam.
