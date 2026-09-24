/**
 * N Crackers Security Foundation
 * Enforces server-side validation, sanitization, rate limiting interface, and safe responses.
 */

export interface RateLimitResult {
  isAllowed: boolean;
  remaining: number;
  resetSeconds: number;
}

// In-memory token bucket for development / fallback rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  key: string,
  limit: number = 60,
  windowSeconds: number = 60
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowSeconds * 1000,
    });
    return {
      isAllowed: true,
      remaining: limit - 1,
      resetSeconds: windowSeconds,
    };
  }

  if (entry.count < limit) {
    entry.count += 1;
    return {
      isAllowed: true,
      remaining: limit - entry.count,
      resetSeconds: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  return {
    isAllowed: false,
    remaining: 0,
    resetSeconds: Math.ceil((entry.resetTime - now) / 1000),
  };
}

/**
 * Strips dangerous HTML tags and script injections
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .trim();
}

/**
 * Standardized API response format
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export function createSuccessResponse<T>(data: T, meta?: Record<string, unknown>): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown
): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}
