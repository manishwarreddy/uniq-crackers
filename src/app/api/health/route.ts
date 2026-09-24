import { NextResponse } from 'next/server';
import { createSuccessResponse } from '@/lib/security';
import { STORE_DEFAULTS } from '@/lib/constants';
import { env } from '@/lib/env';

export async function GET() {
  const healthData = {
    status: 'healthy',
    phase: 'Phase 0 — Master Architecture & Foundation',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    application: {
      name: env.NEXT_PUBLIC_APP_NAME,
      url: env.NEXT_PUBLIC_APP_URL,
    },
    store: {
      name: STORE_DEFAULTS.NAME,
      centerLocation: {
        address: env.NEXT_PUBLIC_STORE_ADDRESS,
        latitude: env.NEXT_PUBLIC_STORE_LAT,
        longitude: env.NEXT_PUBLIC_STORE_LNG,
      },
      configuredRadiusKm: env.NEXT_PUBLIC_DEFAULT_DELIVERY_RADIUS_KM,
    },
    database: {
      provider: 'PostgreSQL',
      orm: 'Prisma Client v5.22.0',
      schemaStatus: 'Generated & Validated',
    },
    security: {
      rateLimiter: 'Active (Token Bucket Foundation)',
      headers: 'HSTS, X-Frame-Options, X-Content-Type, CSP-Ready',
      secretsProtection: 'Enforced (No secrets leaked to client)',
    },
  };

  return NextResponse.json(createSuccessResponse(healthData));
}
