import { NextResponse } from 'next/server';
import { createCustomerSessionToken } from '@/lib/otp-store';
import { createSuccessResponse, createErrorResponse, checkRateLimit, getClientIp } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { phone, name } = body;

    const digits = (phone || '').replace(/[^\d]/g, '');
    const cleanPhone = digits.length > 10 ? digits.slice(-10) : digits;

    const isValidIndianMobile = /^[6-9]\d{9}$/.test(cleanPhone);
    if (!isValidIndianMobile) {
      return NextResponse.json(
        createErrorResponse(
          'INVALID_PHONE',
          'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).'
        ),
        { status: 400 }
      );
    }

    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      return NextResponse.json(
        createErrorResponse('INVALID_NAME', 'Please enter your name.'),
        { status: 400 }
      );
    }

    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`customer-login:${clientIp}`, 30, 300);
    if (!rateCheck.isAllowed) {
      return NextResponse.json(
        createErrorResponse(
          'RATE_LIMITED',
          `Too many login attempts. Please try again in ${rateCheck.resetSeconds} seconds.`
        ),
        { status: 429 }
      );
    }

    const token = createCustomerSessionToken(cleanPhone, trimmedName);

    const response = NextResponse.json(
      createSuccessResponse({
        verified: true,
        phone: cleanPhone,
        formattedPhone: `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`,
        name: trimmedName,
        role: 'CUSTOMER',
        token,
        message: 'Logged in successfully!',
      })
    );

    const isProd = process.env.NODE_ENV === 'production';
    response.cookies.set('customer_session', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      createErrorResponse('SERVER_ERROR', err?.message || 'Error processing customer login.'),
      { status: 500 }
    );
  }
}
