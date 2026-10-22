import { NextResponse } from 'next/server';
import { createSuccessResponse } from '@/lib/security';
import { isRazorpayConfigured } from '@/lib/payment-security';

export async function GET() {
  const razorpay = isRazorpayConfigured();
  return NextResponse.json(
    createSuccessResponse({
      codAvailable: true,
      upiQrAvailable: true,
      razorpayAvailable: razorpay.configured,
      razorpayKeyId: razorpay.keyId || null,
    })
  );
}
