import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/security';
import {
  CustomerSessionPayload,
  verifyCustomerSessionToken,
} from '@/lib/otp-store';

export const ADMIN_COOKIE_NAME = 'admin_session';
const DEFAULT_SESSION_DURATION = 8 * 60 * 60; // 8 hours in seconds

export interface AdminSession {
  userId: string;
  name: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  exp: number;
  iat: number;
}

function getSecretKey(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ADMIN_SESSION_SECRET or JWT_SECRET must be set in production');
    }
    return 'development-admin-session-secret-uniq-crackers-2026';
  }
  return secret;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString('utf8');
}

/**
 * Constant-time password comparison to prevent timing attacks
 */
export function verifyAdminPassword(inputPassword: string): boolean {
  if (!inputPassword || typeof inputPassword !== 'string') return false;

  const adminPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_SESSION_SECRET;
  if (!adminPassword) return false;

  const inputHash = crypto.createHash('sha256').update(inputPassword.trim()).digest();
  const expectedHash = crypto.createHash('sha256').update(adminPassword.trim()).digest();

  return crypto.timingSafeEqual(inputHash, expectedHash);
}

/**
 * Creates a cryptographically signed HMAC-SHA256 session token
 */
export function createAdminSessionToken(
  sessionData: Partial<AdminSession> = {},
  expiresInSeconds: number = DEFAULT_SESSION_DURATION
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: AdminSession = {
    userId: sessionData.userId || 'admin-super-01',
    name: sessionData.name || 'Store Administrator',
    role: sessionData.role || 'ADMIN',
    iat: now,
    exp: sessionData.exp || now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', getSecretKey())
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${dataToSign}.${signature}`;
}

/**
 * Validates token signature, structure, and expiration
 */
export function verifyAdminSessionToken(token: string): AdminSession | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac('sha256', getSecretKey())
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload: AdminSession = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    // Validate expiration
    if (!payload.exp || payload.exp <= now) {
      return null;
    }

    // Must have admin role
    if (payload.role !== 'ADMIN' && payload.role !== 'SUPER_ADMIN') {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies admin session from HTTP Request (Cookie or Authorization header)
 */
export function getAdminSession(request: Request): AdminSession | null {
  // 1. Try Cookie header
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = cookieHeader.split(';').map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith(`${ADMIN_COOKIE_NAME}=`));

  if (sessionCookie) {
    const token = sessionCookie.substring(`${ADMIN_COOKIE_NAME}=`.length);
    const verified = verifyAdminSessionToken(token);
    if (verified) return verified;
  }

  // 2. Try Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring('Bearer '.length).trim();
    const verified = verifyAdminSessionToken(token);
    if (verified) return verified;
  }

  return null;
}

/**
 * Gatekeeper helper: Denies by default when admin verification fails
 */
export function requireAdmin(request: Request): {
  session: AdminSession | null;
  errorResponse: NextResponse | null;
} {
  const session = getAdminSession(request);

  if (!session) {
    return {
      session: null,
      errorResponse: NextResponse.json(
        createErrorResponse(
          'UNAUTHORIZED',
          'Access denied. Valid administrator credentials or active session required.'
        ),
        { status: 401 }
      ),
    };
  }

  if (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN') {
    return {
      session: null,
      errorResponse: NextResponse.json(
        createErrorResponse('FORBIDDEN', 'Access denied. Insufficient administrative privileges.'),
        { status: 403 }
      ),
    };
  }

  return { session, errorResponse: null };
}

/**
 * Cookie options adhering to security best practices (HttpOnly, SameSite=Lax, Secure in prod)
 */
export function getAdminCookieOptions(expiresInSeconds: number = DEFAULT_SESSION_DURATION) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    name: ADMIN_COOKIE_NAME,
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: expiresInSeconds,
  };
}

// ============================================================================
// DELIVERY AGENT AUTHENTICATION
// ============================================================================
export const DELIVERY_AGENT_COOKIE_NAME = 'delivery_session';

export interface DeliveryAgentSession {
  agentId: string;
  name: string;
  phone?: string;
  role: 'DELIVERY_AGENT';
  exp: number;
  iat: number;
}

export function createDeliveryAgentSessionToken(
  agent: { agentId: string; name: string; phone?: string },
  expiresInSeconds: number = 24 * 3600
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: DeliveryAgentSession = {
    agentId: agent.agentId,
    name: agent.name,
    phone: agent.phone,
    role: 'DELIVERY_AGENT',
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', getSecretKey())
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${dataToSign}.${signature}`;
}

export function verifyDeliveryAgentSessionToken(token: string): DeliveryAgentSession | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac('sha256', getSecretKey())
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload: DeliveryAgentSession = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp <= now || payload.role !== 'DELIVERY_AGENT') {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function getDeliveryAgentSession(request: Request): DeliveryAgentSession | null {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = cookieHeader.split(';').map((c) => c.trim());
  const agentCookie = cookies.find((c) => c.startsWith(`${DELIVERY_AGENT_COOKIE_NAME}=`));

  if (agentCookie) {
    const token = agentCookie.substring(`${DELIVERY_AGENT_COOKIE_NAME}=`.length);
    const verified = verifyDeliveryAgentSessionToken(token);
    if (verified) return verified;
  }

  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring('Bearer '.length).trim();
    const verified = verifyDeliveryAgentSessionToken(token);
    if (verified) return verified;
  }

  return null;
}

// ============================================================================
// CRYPTOGRAPHIC ORDER ACCESS TOKENS (Scoped Proof of Order Placement)
// ============================================================================
export interface OrderAccessPayload {
  orderNumber: string;
  orderId: string;
  phone: string;
  iat: number;
  exp: number;
}

export function createOrderAccessToken(
  orderNumber: string,
  orderId: string,
  phone: string,
  expiresInSeconds: number = 30 * 24 * 3600
): string {
  const cleanPhone = phone.replace(/[^\d]/g, '').slice(-10);
  const cleanOrderNum = orderNumber.trim().toUpperCase();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: OrderAccessPayload = {
    orderNumber: cleanOrderNum,
    orderId,
    phone: cleanPhone,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', getSecretKey())
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${dataToSign}.${signature}`;
}

export function verifyOrderAccessToken(
  token: string,
  expectedOrderNumber: string
): { orderNumber: string; phone: string } | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac('sha256', getSecretKey())
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload: OrderAccessPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp <= now) return null;

    if (payload.orderNumber.toUpperCase() !== expectedOrderNumber.trim().toUpperCase()) {
      return null;
    }

    return { orderNumber: payload.orderNumber, phone: payload.phone };
  } catch {
    return null;
  }
}

export function getOrderAccessTokenFromRequest(
  request: Request,
  expectedOrderNumber: string
): { orderNumber: string; phone: string } | null {
  // Check header x-order-token
  const headerToken = request.headers.get('x-order-token');
  if (headerToken) {
    const verified = verifyOrderAccessToken(headerToken, expectedOrderNumber);
    if (verified) return verified;
  }

  // Check cookie order_token_<cleanOrderNumber>
  const cleanNum = expectedOrderNumber.replace(/[^\w]/g, '_');
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = cookieHeader.split(';').map((c) => c.trim());
  const matchCookie = cookies.find((c) => c.startsWith(`order_token_${cleanNum}=`));
  if (matchCookie) {
    const token = matchCookie.substring(`order_token_${cleanNum}=`.length);
    const verified = verifyOrderAccessToken(token, expectedOrderNumber);
    if (verified) return verified;
  }

  return null;
}

// ============================================================================
// DATA MASKING & ROLE-BASED ORDER SANITIZATION
// ============================================================================
export function maskPhoneNumber(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.length < 10) return phone;
  const last4 = digits.slice(-4);
  const first2 = digits.slice(-10, -8);
  return `+91 ${first2}****${last4}`;
}

export function maskAddress(address?: string): string {
  if (!address) return '';
  return address.replace(/^(Flat|House|Villa|Plot|H\.?No|#)\s*[\w\d\-\/]+,?\s*/i, '***, ');
}

export function sanitizeOrderForViewer(
  order: any,
  viewerRole: 'ADMIN' | 'CUSTOMER' | 'DELIVERY_AGENT' | 'ORDER_HOLDER' | 'PUBLIC',
  isDetailView: boolean = false
): any {
  if (!order) return null;
  const sanitized = { ...order };

  if (viewerRole === 'PUBLIC') {
    sanitized.deliveryOtp = undefined;
    sanitized.customerPhone = maskPhoneNumber(sanitized.customerPhone);
    sanitized.deliveryAddress = maskAddress(sanitized.deliveryAddress);
    sanitized.upiUtr = undefined;
    sanitized.rejectionReason = undefined;
    sanitized.rejectionNote = undefined;
    sanitized.reviewedBy = undefined;
    sanitized.statusHistory = undefined;
    return sanitized;
  }

  if (viewerRole === 'DELIVERY_AGENT') {
    // Delivery agents must NEVER see the delivery OTP (customer must provide it at doorstep)
    sanitized.deliveryOtp = undefined;
    sanitized.upiUtr = undefined;
    sanitized.rejectionNote = undefined;
    sanitized.reviewedBy = undefined;
    sanitized.statusHistory = undefined;
    return sanitized;
  }

  if (viewerRole === 'CUSTOMER' || viewerRole === 'ORDER_HOLDER') {
    // In order list views, deliveryOtp is stripped
    if (!isDetailView) {
      sanitized.deliveryOtp = undefined;
    }
    sanitized.upiUtr = undefined;
    // Customer sees rejection reason and note (if provided)
    // Never expose internal admin credentials / identity to customer
    sanitized.reviewedBy = undefined;

    // Sanitize audit history to mask internal admin identities
    if (Array.isArray(sanitized.statusHistory)) {
      sanitized.statusHistory = sanitized.statusHistory.map((h: any) => ({
        status: h.status,
        timestamp: h.timestamp,
        note: h.note,
        changedBy:
          h.changedBy && (h.changedBy.startsWith('ADMIN') || h.changedBy === 'ADMIN')
            ? 'Store Administrator'
            : h.changedBy,
      }));
    }

    return sanitized;
  }

  if (viewerRole === 'ADMIN') {
    // In admin list view, do not expose delivery OTP unnecessarily
    if (!isDetailView) {
      sanitized.deliveryOtp = undefined;
    }
    return sanitized;
  }

  sanitized.deliveryOtp = undefined;
  sanitized.reviewedBy = undefined;
  sanitized.statusHistory = undefined;
  return sanitized;
}

// ============================================================================
// CUSTOMER SESSION HELPERS & UNIFIED ORDER AUTHORIZATION CONTEXT
// ============================================================================
export const CUSTOMER_COOKIE_NAME = 'customer_session';

export function getCustomerSession(request: Request): CustomerSessionPayload | null {
  // 1. Check cookie customer_session
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = cookieHeader.split(';').map((c) => c.trim());
  const customerCookie = cookies.find((c) => c.startsWith(`${CUSTOMER_COOKIE_NAME}=`));
  if (customerCookie) {
    const token = customerCookie.substring(`${CUSTOMER_COOKIE_NAME}=`.length);
    const verified = verifyCustomerSessionToken(token);
    if (verified) return verified;
  }

  // 2. Check Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring('Bearer '.length).trim();
    const verified = verifyCustomerSessionToken(token);
    if (verified) return verified;
  }

  // 3. Check x-customer-session header
  const xCustomer = request.headers.get('x-customer-session');
  if (xCustomer) {
    const verified = verifyCustomerSessionToken(xCustomer);
    if (verified) return verified;
  }

  return null;
}

export function getCustomerCookieOptions(expiresInSeconds: number = 30 * 24 * 3600) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    name: CUSTOMER_COOKIE_NAME,
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: expiresInSeconds,
  };
}

export interface OrderAuthContext {
  isAdmin: boolean;
  adminSession: AdminSession | null;
  deliveryAgent: DeliveryAgentSession | null;
  isAssignedAgent: boolean;
  customerSession: CustomerSessionPayload | null;
  isCustomerOwner: boolean;
  isOrderTokenHolder: boolean;
  canView: boolean;
  canModifyStatus: boolean;
  canCancel: boolean;
  viewerRole: 'ADMIN' | 'DELIVERY_AGENT' | 'CUSTOMER' | 'ORDER_HOLDER' | 'PUBLIC';
}

export function getOrderAuthContext(
  request: Request,
  targetOrder?: { orderNumber: string; customerPhone: string; assignedAgentId?: string; status: string } | null
): OrderAuthContext {
  const adminSession = getAdminSession(request);
  if (adminSession) {
    return {
      isAdmin: true,
      adminSession,
      deliveryAgent: null,
      isAssignedAgent: false,
      customerSession: null,
      isCustomerOwner: false,
      isOrderTokenHolder: false,
      canView: true,
      canModifyStatus: true,
      canCancel: true,
      viewerRole: 'ADMIN',
    };
  }

  const deliveryAgent = getDeliveryAgentSession(request);
  const isAssignedAgent = Boolean(
    targetOrder &&
      deliveryAgent &&
      targetOrder.assignedAgentId &&
      targetOrder.assignedAgentId === deliveryAgent.agentId
  );

  const customerSession = getCustomerSession(request);
  const cleanCustomerPhone = customerSession ? customerSession.phone.replace(/[^\d]/g, '').slice(-10) : '';
  const isCustomerOwner = Boolean(
    targetOrder &&
      cleanCustomerPhone &&
      targetOrder.customerPhone.replace(/[^\d]/g, '').endsWith(cleanCustomerPhone)
  );

  const orderToken = targetOrder ? getOrderAccessTokenFromRequest(request, targetOrder.orderNumber) : null;
  const isOrderTokenHolder = Boolean(orderToken);

  let viewerRole: 'ADMIN' | 'DELIVERY_AGENT' | 'CUSTOMER' | 'ORDER_HOLDER' | 'PUBLIC' = 'PUBLIC';
  let canView = false;
  let canCancel = false;

  if (isAssignedAgent) {
    viewerRole = 'DELIVERY_AGENT';
    canView = true;
    canCancel = false;
  } else if (isCustomerOwner) {
    viewerRole = 'CUSTOMER';
    canView = true;
    canCancel = targetOrder?.status === 'PENDING_REVIEW' || targetOrder?.status === 'PLACED';
  } else if (isOrderTokenHolder) {
    viewerRole = 'ORDER_HOLDER';
    canView = true;
    canCancel = targetOrder?.status === 'PENDING_REVIEW' || targetOrder?.status === 'PLACED';
  }

  return {
    isAdmin: false,
    adminSession: null,
    deliveryAgent,
    isAssignedAgent,
    customerSession,
    isCustomerOwner,
    isOrderTokenHolder,
    canView,
    canModifyStatus: isAssignedAgent,
    canCancel,
    viewerRole,
  };
}
