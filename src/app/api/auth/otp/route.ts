import { NextResponse } from 'next/server';
import {
  createOtpChallenge,
  verifyOtpChallenge,
  createCustomerSessionToken,
} from '@/lib/otp-store';
import {
  createSuccessResponse,
  createErrorResponse,
  checkRateLimit,
  getClientIp,
  resetRateLimit,
} from '@/lib/security';
import { sendSmsOtp } from '@/lib/sms';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, phone, otp, name } = body;

    const digits = (phone || '').replace(/[^\d]/g, '');
    const cleanPhone = digits.length > 10 ? digits.slice(-10) : digits;

    const isValidIndianMobile = /^[6-9]\d{9}$/.test(cleanPhone);
    if (!isValidIndianMobile) {
      return NextResponse.json(
        createErrorResponse(
          'INVALID_PHONE',
          'Please provide a valid 10-digit Indian mobile number (e.g. 9876543210).'
        ),
        { status: 400 }
      );
    }

    const clientIp = getClientIp(request);

    if (action === 'SEND_OTP') {
      // 1. IP-level rate limiting: max 15 requests per 5 minutes per IP
      const ipRate = checkRateLimit(`send-otp-ip:${clientIp}`, 15, 300);
      if (!ipRate.isAllowed) {
        return NextResponse.json(
          createErrorResponse(
            'RATE_LIMITED',
            `Too many requests from this network. Please try again in ${ipRate.resetSeconds} seconds.`
          ),
          { status: 429 }
        );
      }

      // 2. Phone-level rate limiting: max 5 requests per 10 minutes per phone
      const phoneRate = checkRateLimit(`send-otp-phone:${cleanPhone}`, 5, 600);
      if (!phoneRate.isAllowed) {
        return NextResponse.json(
          createErrorResponse(
            'RATE_LIMITED',
            `Too many OTP requests for this number. Please wait ${phoneRate.resetSeconds} seconds before trying again.`
          ),
          { status: 429 }
        );
      }

      // 3. Create secure hashed OTP challenge with resend cooldown
      const challengeResult = createOtpChallenge(cleanPhone, name);
      if (!challengeResult.success) {
        if (challengeResult.error === 'RESEND_COOLDOWN') {
          return NextResponse.json(
            createErrorResponse('RESEND_COOLDOWN', challengeResult.message, {
              cooldownSeconds: challengeResult.cooldownSeconds,
            }),
            { status: 429 }
          );
        }
        return NextResponse.json(
          createErrorResponse(challengeResult.error, challengeResult.message),
          { status: 400 }
        );
      }

      // 4. Dispatch OTP via SMS gateway (Fast2SMS / Twilio / Dev Simulator)
      const smsResult = await sendSmsOtp(cleanPhone, challengeResult.plainOtp);

      return NextResponse.json(
        createSuccessResponse({
          phone: cleanPhone,
          provider: smsResult.provider,
          resendInSeconds: challengeResult.resendInSeconds,
          expiresInSeconds: challengeResult.expiresInSeconds,
          message: smsResult.success
            ? (smsResult.message || `SMS with 6-digit OTP dispatched to +91 ${cleanPhone}. Valid for 5 minutes.`)
            : (smsResult.message || 'SMS dispatch initiated.'),
        })
      );
    }

    if (action === 'VERIFY_OTP') {
      // Brute-force rate limiting: max 10 verify attempts per 5 minutes per IP
      const verifyIpRate = checkRateLimit(`verify-otp-ip:${clientIp}`, 10, 300);
      if (!verifyIpRate.isAllowed) {
        return NextResponse.json(
          createErrorResponse(
            'RATE_LIMITED',
            `Too many verification attempts from this network. Please wait ${verifyIpRate.resetSeconds} seconds.`
          ),
          { status: 429 }
        );
      }

      const verifyResult = verifyOtpChallenge(cleanPhone, otp);

      if (!verifyResult.success) {
        const statusCode = verifyResult.error === 'LOCKED' ? 423 : 400;
        return NextResponse.json(
          createErrorResponse(
            verifyResult.error || 'VERIFICATION_FAILED',
            verifyResult.message,
            { remainingAttempts: verifyResult.remainingAttempts }
          ),
          { status: statusCode }
        );
      }

      // Reset verification IP rate limit on success
      resetRateLimit(`verify-otp-ip:${clientIp}`);

      // Create cryptographically signed customer verification session
      const customerName = name?.trim() || verifyResult.name || 'Valued Customer';
      const token = createCustomerSessionToken(cleanPhone, customerName);

      const response = NextResponse.json(
        createSuccessResponse({
          verified: true,
          phone: cleanPhone,
          formattedPhone: `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`,
          name: customerName,
          role: 'CUSTOMER',
          token,
          message: 'Mobile number verified successfully!',
        })
      );

      // Set customer_session HttpOnly cookie
      const isProd = process.env.NODE_ENV === 'production';
      response.cookies.set('customer_session', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });

      return response;
    }

    return NextResponse.json(
      createErrorResponse('INVALID_ACTION', 'Action must be SEND_OTP or VERIFY_OTP.'),
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      createErrorResponse('OTP_SERVER_ERROR', 'Error processing verification request.'),
      { status: 500 }
    );
  }
}
