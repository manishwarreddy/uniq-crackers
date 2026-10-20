# N CRACKERS — ENVIRONMENT CONFIGURATION GUIDE

## 1. Overview

All environment variables are validated at startup and build-time through `src/lib/env.ts` using Zod schemas.

---

## 2. Environment Variables Directory

| Variable Name | Required | Default / Example Value | Description |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Yes | `development` / `production` | Node runtime environment |
| `NEXT_PUBLIC_APP_NAME` | Yes | `N Crackers` | Display name of the application |
| `NEXT_PUBLIC_APP_URL` | Yes | `http://localhost:3000` | Canonical frontend domain URL |
| `PORT` | No | `3000` | Local server port |
| `DATABASE_URL` | Yes (in Prod) | `postgresql://...` | PostgreSQL connection pool URL with schema |
| `DIRECT_URL` | No | `postgresql://...` | Direct connection URL for migrations |
| `JWT_SECRET` | Yes | 64-char random string | Symmetric key for signing auth tokens |
| `JWT_EXPIRES_IN` | Yes | `7d` | Token validity period |
| `ADMIN_SESSION_SECRET` | Yes | 64-char random string | Session encryption secret for Admin |
| `NEXT_PUBLIC_STORE_LAT` | Yes | `17.502900` | Velmala hub latitude |
| `NEXT_PUBLIC_STORE_LNG` | Yes | `78.257300` | Velmala hub longitude |
| `NEXT_PUBLIC_DEFAULT_DELIVERY_RADIUS_KM` | Yes | `7.0` | Maximum delivery radius in km |
| `NEXT_PUBLIC_STORE_ADDRESS` | Yes | `F6GQ+7PW, Velmala, Hyderabad...` | Physical store dispatch address |
| `NEXT_PUBLIC_STORE_PHONE` | Yes | `+919000000000` | Official support phone number |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Future | `rzp_test_...` | Public Razorpay Key ID |
| `RAZORPAY_KEY_SECRET` | Future | Private secret | Server-side Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | Future | Private secret | HMAC secret for verifying webhooks |
| `WHATSAPP_API_URL` | Future | `https://graph.facebook.com/...` | WhatsApp Cloud API endpoint |
| `WHATSAPP_PHONE_NUMBER_ID` | Future | ID string | WhatsApp Cloud API Phone Number ID |
| `WHATSAPP_ACCESS_TOKEN` | Future | Token string | WhatsApp Cloud API Bearer Token |
| `ADMIN_ALERT_WHATSAPP_NUMBERS` | Future | `+919876543210` | Comma-separated admin alert numbers |
| `SMS_GATEWAY_API_KEY` | Future | API Key | SMS OTP Provider API Key |

---

## 3. Local Setup Instructions

1. Copy template:

   ```bash
   cp .env.example .env.local
   ```

2. Set your local PostgreSQL database connection string in `DATABASE_URL`.
3. Generate secure random tokens for `JWT_SECRET` and `ADMIN_SESSION_SECRET`.
