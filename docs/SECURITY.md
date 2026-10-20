# N CRACKERS — SECURITY ARCHITECTURE & THREAT MODEL

## 1. Zero Trust & Secrets Management

* **Secrets Isolation**: No database passwords, JWT signing keys, Razorpay secret keys, or WhatsApp tokens are ever exposed to client bundles or prefixed with `NEXT_PUBLIC_`.
* **Environment Validation**: Zod-enforced parsing in `src/lib/env.ts` fails the build early if essential secrets are missing or malformed.
* **Git Protection**: Strict `.gitignore` rules prevent accidental commit of `.env`, `.env.local`, `.pem` certificates, or credentials.

---

## 2. Authentication & Authorization (RBAC)

* **Server-Side Enforcement**: All sensitive mutations and queries evaluate permissions on the server using `AuthService` guards. Frontend UI role checks are treated purely as display aids.
* **Role Hierarchy**:
  1. `SUPER_ADMIN`: Full system access, staff management, store location & radius overrides, audit logs.
  2. `ADMIN`: Catalog management, order overrides, agent dispatch, financials.
  3. `STAFF`: Packing, order status updates (Preparing, Ready for Delivery).
  4. `DELIVERY_AGENT`: Assigned delivery viewing, GPS streaming during active run, OTP delivery completion.
  5. `CUSTOMER`: Own profile, own orders, verified reviews, address book.
  6. `GUEST`: Session-based cart, guest checkout within 7 km zone.

---

## 3. Rate Limiting & Anti-Abuse

* **OTP Rate Limiting**: OTP generation is throttled to 3 attempts per phone number per 15 minutes to prevent SMS gateway exhaustion and SMS bombing.
* **API Rate Limiting**: General API routes enforce token-bucket rate limits (60 requests/minute/IP) to defend against brute force and scraping.
* **Idempotency Keys**: Financial and checkout operations require an idempotency key to prevent replay attacks and duplicate charge issues.

---

## 4. HTTP Headers & Transport Security

Configured in `next.config.mjs`:

* `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`
* `X-Frame-Options`: `DENY` (Prevents Clickjacking)
* `X-Content-Type-Options`: `nosniff` (Prevents MIME sniffing)
* `X-XSS-Protection`: `1; mode=block`
* `Referrer-Policy`: `strict-origin-when-cross-origin`

---

## 5. Webhook Security

* **Razorpay Webhooks**: Incoming signatures in the `X-Razorpay-Signature` header are verified using `crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)`.
* **Idempotent Webhook Processing**: Webhook event IDs are stored in the database to guarantee that duplicate delivery events from the payment gateway are safely ignored.
