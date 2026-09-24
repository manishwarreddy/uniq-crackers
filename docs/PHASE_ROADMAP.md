# N CRACKERS — MASTER DEVELOPMENT ROADMAP

| Phase | Phase Title | Status | Scope Summary |
| :--- | :--- | :---: | :--- |
| **Phase 0** | **Architecture & Foundation** | **DONE** | Workspace setup, Next.js 14 App Router, Tailwind tokens, PostgreSQL Prisma schema, 7km geofencing Haversine engine, security foundation, architecture docs. |
| **Phase 1** | Database & Backend Foundation | NEXT | DB migrations on live Postgres, seed scripts (Admin, Velmala store settings, pricing slabs, categories, 150+ cracker catalog), Prisma service clients. |
| **Phase 2** | Authentication & Roles | Pending | Customer mobile OTP sign-in, Super Admin/Staff credentials + 2FA, JWT session cookies, RBAC server guards. |
| **Phase 3** | Public Website | Pending | Festive homepage, category grids, brand story, green crackers certification badges, mobile-first responsive navigation. |
| **Phase 4** | Products & Inventory | Pending | Product catalog, variant selector, sound level & green indicators, inventory tracking & low stock badges. |
| **Phase 5** | Cart & Checkout | Pending | LocalStorage cart, temporary 15-minute inventory reservation locks, coupon discount engine. |
| **Phase 6** | Location, Maps & 7 KM Geofencing | Pending | Google Maps / Leaflet address search, map pin drop, live GPS autofill, 7 km Velmala geofence enforcement. |
| **Phase 7** | Orders & Payments | Pending | Order submission, Razorpay gateway integration, Direct UPI intent, COD selection, status history. |
| **Phase 8** | Admin Dashboard | Pending | Realtime sales counters, order fulfillment board (Kanban), inventory editor, manual dispatch overrides. |
| **Phase 9** | Delivery Agent PWA | Pending | Agent mobile app, duty toggle (Online/Offline/Break), order acceptance, turn-by-turn customer routing, delivery OTP verification. |
| **Phase 10** | Live GPS & Realtime Tracking | Pending | WebSocket GPS streaming during active run, customer live delivery tracker map with ETA. |
| **Phase 11** | Notifications & WhatsApp | Pending | WhatsApp Cloud API integration for Admin & Delivery Agent alerts, customer in-app notifications & SMS. |
| **Phase 12** | Coupons, Combos & Reviews | Pending | Promotional codes, festival bundle combos, verified customer review and star ratings. |
| **Phase 13** | Reports & Analytics | Pending | Festival sales velocity, top grossing crackers, agent delivery performance, area heatmaps. |
| **Phase 14** | Festival / Rush Controls | Pending | Emergency store rush mode toggle, maximum order throttle, dynamic delivery fee surge. |
| **Phase 15** | Security & Performance Hardening | Pending | Full penetration testing, Redis rate limiting, SQL injection defense, image CDN optimization. |
| **Phase 16** | Complete Testing Suite | Pending | Jest unit tests, integration tests for inventory locking, Playwright E2E checkout & geofence tests. |
| **Phase 17** | Production Deployment | Pending | Production build, Docker containerization / Vercel deployment, PostgreSQL managed cluster, SSL setup. |
