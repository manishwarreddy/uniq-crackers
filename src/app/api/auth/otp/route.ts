import { NextResponse } from 'next/server';
import { ServerStore } from '@/lib/server-store';
import { createSuccessResponse, createErrorResponse } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, phone, otp, name } = body;

    // Validate phone number format (must be 10 digits starting with 6, 7, 8, or 9)
    const rawDigits = (phone || '').replace(/[^\d]/g, '');
    const cleanPhone = rawDigits.length > 10 ? rawDigits.slice(-10) : rawDigits;

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

    if (action === 'SEND_OTP') {
      // Generate 6-digit secure numeric OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      ServerStore.setOtp(cleanPhone, generatedOtp, name?.trim() || 'Valued Customer');

      console.log(`[SMS GATEWAY SIMULATION] OTP for +91 ${cleanPhone}: ${generatedOtp}`);

      return NextResponse.json(
        createSuccessResponse({
          phone: cleanPhone,
          otp: generatedOtp, // Included for seamless testing & simulation
          message: `OTP sent successfully to +91 ${cleanPhone}. Valid for 5 minutes.`,
        })
      );
    }

    if (action === 'VERIFY_OTP') {
      if (!otp || typeof otp !== 'string' || otp.trim().length !== 6) {
        return NextResponse.json(
          createErrorResponse('INVALID_OTP_FORMAT', 'Please enter a valid 6-digit OTP code.'),
          { status: 400 }
        );
      }

      const result = ServerStore.verifyOtp(cleanPhone, otp.trim());

      if (!result.success) {
        return NextResponse.json(
          createErrorResponse('VERIFICATION_FAILED', result.message),
          { status: 400 }
        );
      }

      const customerName = name?.trim() || result.name || 'Valued Customer';

      return NextResponse.json(
        createSuccessResponse({
          verified: true,
          phone: cleanPhone,
          formattedPhone: `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`,
          name: customerName,
          role: 'CUSTOMER',
          message: 'Mobile number verified successfully!',
        })
      );
    }

    return NextResponse.json(
      createErrorResponse('INVALID_ACTION', 'Action must be SEND_OTP or VERIFY_OTP.'),
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      createErrorResponse('OTP_SERVER_ERROR', err.message || 'Error processing OTP request.'),
      { status: 500 }
    );
  }
}
