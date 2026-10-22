import crypto from 'crypto';

export interface OtpChallenge {
  phone: string;
  hashedOtp: string;
  salt: string;
  name?: string;
  challengeId: string;
  createdAt: number;
  expiresAt: number;
  resendAvailableAt: number;
  attempts: number;
  maxAttempts: number;
  consumed: boolean;
}

export interface CustomerSessionPayload {
  phone: string;
  name?: string;
  isPhoneVerified: boolean;
  role: 'CUSTOMER';
  iat: number;
  exp: number;
}

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_VERIFY_ATTEMPTS = 5;

// In-memory store for active OTP verification challenges
const otpChallenges = new Map<string, OtpChallenge>();

function getSecretKey(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.JWT_SECRET || 'fallback-customer-secret-key-diwali-2026';
}

function hashOtpWithSalt(otp: string, salt: string): string {
  return crypto
    .createHmac('sha256', getSecretKey())
    .update(`${otp}:${salt}`)
    .digest('hex');
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
 * Creates a new cryptographically secure OTP challenge with rate/resend enforcement
 */
export function createOtpChallenge(
  rawPhone: string,
  name?: string
): {
  success: true;
  plainOtp: string;
  challengeId: string;
  resendInSeconds: number;
  expiresInSeconds: number;
  cleanPhone: string;
} | {
  success: false;
  error: 'INVALID_PHONE' | 'RESEND_COOLDOWN';
  message: string;
  cooldownSeconds?: number;
} {
  const digits = (rawPhone || '').replace(/[^\d]/g, '');
  const cleanPhone = digits.length > 10 ? digits.slice(-10) : digits;

  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    return {
      success: false,
      error: 'INVALID_PHONE',
      message: 'Please provide a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).',
    };
  }

  const now = Date.now();
  const existing = otpChallenges.get(cleanPhone);

  // Enforce resend cooldown
  if (existing && !existing.consumed && now < existing.resendAvailableAt) {
    const remainingCooldown = Math.ceil((existing.resendAvailableAt - now) / 1000);
    return {
      success: false,
      error: 'RESEND_COOLDOWN',
      message: `Please wait ${remainingCooldown} second(s) before requesting another OTP.`,
      cooldownSeconds: remainingCooldown,
    };
  }

  // Generate cryptographically secure 6-digit numeric OTP (100000 - 999999)
  const plainOtp = crypto.randomInt(100000, 1000000).toString();
  const salt = crypto.randomBytes(16).toString('hex');
  const hashedOtp = hashOtpWithSalt(plainOtp, salt);
  const challengeId = crypto.randomUUID();

  const challenge: OtpChallenge = {
    phone: cleanPhone,
    hashedOtp,
    salt,
    name: name?.trim(),
    challengeId,
    createdAt: now,
    expiresAt: now + OTP_TTL_MS,
    resendAvailableAt: now + RESEND_COOLDOWN_MS,
    attempts: 0,
    maxAttempts: MAX_VERIFY_ATTEMPTS,
    consumed: false,
  };

  // Supersedes any existing challenge for this phone
  otpChallenges.set(cleanPhone, challenge);

  return {
    success: true,
    plainOtp,
    challengeId,
    resendInSeconds: Math.ceil(RESEND_COOLDOWN_MS / 1000),
    expiresInSeconds: Math.ceil(OTP_TTL_MS / 1000),
    cleanPhone,
  };
}

/**
 * Verifies an OTP challenge against hashed secret with attempt limits and one-time consumption
 */
export function verifyOtpChallenge(
  rawPhone: string,
  inputOtp: string
): {
  success: boolean;
  error?: 'INVALID_PHONE' | 'INVALID_FORMAT' | 'NOT_FOUND' | 'EXPIRED' | 'LOCKED' | 'MISMATCH';
  message: string;
  name?: string;
  verifiedPhone?: string;
  remainingAttempts?: number;
} {
  const digits = (rawPhone || '').replace(/[^\d]/g, '');
  const cleanPhone = digits.length > 10 ? digits.slice(-10) : digits;

  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    return {
      success: false,
      error: 'INVALID_PHONE',
      message: 'Invalid mobile number format.',
    };
  }

  const cleanInputOtp = (inputOtp || '').trim();
  if (!/^\d{6}$/.test(cleanInputOtp)) {
    return {
      success: false,
      error: 'INVALID_FORMAT',
      message: 'Please enter a valid 6-digit numeric OTP code.',
    };
  }

  const challenge = otpChallenges.get(cleanPhone);
  const now = Date.now();

  if (!challenge || challenge.consumed) {
    return {
      success: false,
      error: 'NOT_FOUND',
      message: 'No active OTP verification found. Please request a new OTP.',
    };
  }

  // Check expiration
  if (now > challenge.expiresAt) {
    otpChallenges.delete(cleanPhone);
    return {
      success: false,
      error: 'EXPIRED',
      message: 'Verification code has expired. Please request a new OTP.',
    };
  }

  // Check if max attempts already reached
  if (challenge.attempts >= challenge.maxAttempts) {
    otpChallenges.delete(cleanPhone);
    return {
      success: false,
      error: 'LOCKED',
      message: 'Too many incorrect attempts. This OTP has been invalidated. Please request a new code.',
    };
  }

  // Increment failed attempts count
  challenge.attempts += 1;

  // Constant-time hash verification
  const inputHashed = hashOtpWithSalt(cleanInputOtp, challenge.salt);
  const inputBuffer = Buffer.from(inputHashed, 'utf-8');
  const expectedBuffer = Buffer.from(challenge.hashedOtp, 'utf-8');

  const isMatch =
    inputBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(inputBuffer, expectedBuffer);

  if (!isMatch) {
    const remaining = challenge.maxAttempts - challenge.attempts;
    if (remaining <= 0) {
      otpChallenges.delete(cleanPhone);
      return {
        success: false,
        error: 'LOCKED',
        message: 'Too many incorrect attempts. This verification code has been locked. Please request a new OTP.',
        remainingAttempts: 0,
      };
    }
    return {
      success: false,
      error: 'MISMATCH',
      message: `Incorrect code entered. ${remaining} attempt(s) remaining.`,
      remainingAttempts: remaining,
    };
  }

  // Success: mark consumed and remove from challenge pool immediately to prevent reuse
  challenge.consumed = true;
  otpChallenges.delete(cleanPhone);

  return {
    success: true,
    message: 'Mobile number verified successfully!',
    name: challenge.name,
    verifiedPhone: cleanPhone,
  };
}

/**
 * Creates a cryptographically signed Customer Verification Session Token
 */
export function createCustomerSessionToken(phone: string, name?: string): string {
  const cleanPhone = phone.replace(/[^\d]/g, '').slice(-10);
  const now = Math.floor(Date.now() / 1000);
  const payload: CustomerSessionPayload = {
    phone: cleanPhone,
    name: name?.trim() || 'Valued Customer',
    isPhoneVerified: true,
    role: 'CUSTOMER',
    iat: now,
    exp: now + 30 * 24 * 60 * 60, // 30 days valid
  };

  const header = { alg: 'HS256', typ: 'JWT' };
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
 * Verifies a customer verification session token
 */
export function verifyCustomerSessionToken(token: string): CustomerSessionPayload | null {
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
    const payload: CustomerSessionPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (!payload.exp || payload.exp <= now) {
      return null;
    }

    if (!payload.phone || !payload.isPhoneVerified) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Clears an active challenge from the in-memory map (used for test teardown)
 */
export function clearOtpChallengeForTesting(phone: string): void {
  const cleanPhone = phone.replace(/[^\d]/g, '').slice(-10);
  otpChallenges.delete(cleanPhone);
}
