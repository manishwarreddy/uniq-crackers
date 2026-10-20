# N Crackers — Production E-Commerce & Local Delivery Web Application

> **Phase 0: Master Architecture, Requirements, Project Foundation & Acceptance Criteria**

N Crackers is a medium-sized crackers/fireworks retail business web application architected for high-concurrency festival operations, supporting **1,500+ registered customers**, **100–250 products** with variants, **7 km location-based delivery from Velmala, Hyderabad**, live GPS delivery tracking, and role-based management.

---

## 🌟 Key Architectural Foundations (Phase 0)

1. **Strict 7 KM Geofencing**: Configured center at **Velmala, Hyderabad (`17.502900, 78.257300`)** using the Great-Circle Haversine formula. Coordinates exceeding 7 km are rejected at checkout.
2. **PostgreSQL Relational Schema**: 20+ models generated with **Prisma ORM**, with referential integrity, compound indexes, and Decimal types for all financial figures.
3. **Inventory Locking Strategy**: 15-minute TTL temporary reservation hold on checkout prevents overselling during flash festival rushes.
4. **Order State Machine**: Strict 10-status transition lifecycle with immutable audit history and 4-digit Delivery OTP handoff.
5. **Realtime GPS Lifecycle**: Tracking sessions exist **only** during active delivery runs for maximum agent privacy and battery efficiency.
6. **Isolated WhatsApp Operations**: WhatsApp Cloud API alerts are strictly reserved for **Super Admin & Delivery Agents**; customers receive in-app & SMS notifications.
7. **Production Security**: Zero secrets in client bundles, security HTTP headers, token-bucket rate limiting, and webhook HMAC verification.

---

## 🚀 Quick Start & Development Setup

### 1. Prerequisites

* Node.js v18+ (tested on Node v26)
* npm v9+

### 2. Installation

```bash
# Clone or navigate to the directory
npm install
```

### 3. Environment Configuration

```bash
cp .env.example .env.local
```

### 4. Generate Database Types

```bash
npm run prisma:generate
```

### 5. Run Local Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the Phase 0 master verification dashboard.

---

## 🧪 Testing & Verification Commands

| Command | Action |
| :--- | :--- |
| `npm run typecheck` | Validates TypeScript type safety across the entire codebase |
| `npm run build` | Builds optimized production Next.js output |
| `npm run lint` | Runs ESLint rules for code quality |
| `npm run dev` | Starts local Next.js development server on port 3000 |

---

## 📁 Project Structure

```text
├── docs/                        # Master Architecture Documentation Suite
│   ├── ARCHITECTURE.md          # End-to-end system design & domain models
│   ├── DATABASE_SCHEMA.md       # PostgreSQL models, relations & indexes
│   ├── API_SPECIFICATION.md     # REST & Realtime API contracts
│   ├── SECURITY.md              # Threat model, RBAC & header policies
│   ├── REALTIME_GPS.md          # GPS tracking session lifecycle & privacy
│   ├── ENVIRONMENT_CONFIG.md    # Environment variable directory
│   └── PHASE_ROADMAP.md         # 18-phase implementation roadmap
├── prisma/
│   └── schema.prisma            # Master PostgreSQL schema (20+ entities)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/route.ts  # System health check endpoint
│   │   │   └── geo/check-radius/route.ts # 7km geofence validation endpoint
│   │   ├── globals.css          # Tailwind base & festive glow utilities
│   │   ├── layout.tsx           # Master layout with festive header/footer
│   │   └── page.tsx             # Interactive 7km geofence calculator & verification dashboard
│   ├── components/
│   │   ├── layout/              # Header, Footer components
│   │   └── ui/                  # Design system tokens (Button, Badge, Card, Input, Modal, Alert, etc.)
│   ├── lib/
│   │   ├── constants.ts         # Velmala coordinates, status mappings, pricing slabs
│   │   ├── db.ts                # Prisma singleton client with connection pooling
│   │   ├── env.ts               # Zod-validated environment configuration
│   │   ├── geo.ts               # Haversine distance & geofence validation engine
│   │   ├── security.ts          # Rate limiting & sanitization utilities
│   │   └── utils.ts             # Currency formatter & styling utilities
│   ├── services/                # Business service layer abstractions
│   │   ├── auth-service.ts      # Server-side RBAC guards
│   │   ├── delivery-service.ts  # Dispatch & geofence services
│   │   └── order-service.ts     # Order state machine & OTP generator
│   └── types/                   # Master TypeScript contracts
├── .env.example                 # Safe environment configuration template
├── next.config.mjs              # Security headers & image optimization
├── tailwind.config.ts           # Festive color palettes, glow effects & fonts
└── tsconfig.json                # TypeScript compiler configuration
```

---

## 📍 Configured Store Location

* **Center Point**: `F6GQ+7PW, Velmala, Hyderabad, Telangana 502300`
* **Latitude**: `17.502900`
* **Longitude**: `78.257300`
* **Delivery Radius**: `7.0 Kilometers`
