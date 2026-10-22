import crypto from 'crypto';

/**
 * ============================================================================
 * PAYMENT SECURITY & VERIFICATION MODULE
 * ============================================================================
 * Enforces cryptographic signature verification, idempotency protection,
 * raw-body inspection, and currency/amount reconciliation for Uniq Crackers.
 * ============================================================================
 */

/**
 * Checks whether genuine Razorpay credentials are configured in the environment
 */
export function isRazorpayConfigured(): { configured: boolean; keyId?: string } {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

  // Validate non-empty and not dummy placeholder
  const isDummy =
    !keyId ||
    !keySecret ||
    keyId.includes('placeholder') ||
    keySecret.includes('replace-with') ||
    keySecret.includes('placeholder');

  return {
    configured: !isDummy,
    keyId: isDummy ? undefined : keyId,
  };
}

/**
 * Constant-time string / buffer equality comparison
 */
function constantTimeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf-8');
    const bufB = Buffer.from(b, 'utf-8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Verifies Razorpay Webhook signature using raw request payload
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
  secret?: string
): boolean {
  const webhookSecret = secret || process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!rawBody || !signature || !webhookSecret) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    return constantTimeCompare(signature.trim(), expectedSignature.trim());
  } catch {
    return false;
  }
}

/**
 * Verifies Razorpay Client Payment Signature (order_id|payment_id)
 */
export function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret?: string
): boolean {
  const secret = keySecret || process.env.RAZORPAY_KEY_SECRET;
  if (!orderId || !paymentId || !signature || !secret) {
    return false;
  }

  try {
    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return constantTimeCompare(signature.trim(), expectedSignature.trim());
  } catch {
    return false;
  }
}

/**
 * Verifies Direct UPI Webhook authentication
 * Accepts:
 * 1. HMAC-SHA256 signature in x-webhook-signature
 * 2. Static secret Bearer token or x-api-key matching UPI_WEBHOOK_SECRET
 */
export function verifyUpiWebhookAuth(
  rawBody: string,
  headers: Headers,
  secret?: string
): boolean {
  const webhookSecret = secret || process.env.UPI_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!webhookSecret) return false;

  // 1. Try HMAC-SHA256 header (x-webhook-signature)
  const hmacSig = headers.get('x-webhook-signature') || headers.get('x-signature');
  if (hmacSig && rawBody) {
    try {
      const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');
      if (constantTimeCompare(hmacSig.trim(), expected.trim())) {
        return true;
      }
    } catch {}
  }

  // 2. Try API key header (x-api-key)
  const apiKey = headers.get('x-api-key');
  if (apiKey && constantTimeCompare(apiKey.trim(), webhookSecret.trim())) {
    return true;
  }

  // 3. Try Authorization: Bearer <token>
  const authHeader = headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring('Bearer '.length).trim();
    if (constantTimeCompare(token, webhookSecret.trim())) {
      return true;
    }
  }

  return false;
}

/**
 * Reconciles payment amount and currency against expected order total
 */
export function validatePaymentDetails(
  expectedAmount: number,
  receivedAmount: number,
  currency: string = 'INR'
): { isValid: boolean; error?: string } {
  if (currency.toUpperCase() !== 'INR') {
    return {
      isValid: false,
      error: `Invalid payment currency: Expected INR, but received ${currency}.`,
    };
  }

  const diff = Math.abs(expectedAmount - receivedAmount);
  if (diff >= 0.01) {
    return {
      isValid: false,
      error: `Amount mismatch: Expected ₹${expectedAmount}, but received ₹${receivedAmount}.`,
    };
  }

  return { isValid: true };
}
