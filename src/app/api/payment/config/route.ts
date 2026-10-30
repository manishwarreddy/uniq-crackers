import { NextResponse } from 'next/server';
import { createSuccessResponse } from '@/lib/security';
import { isRazorpayConfigured } from '@/lib/payment-security';

export async function GET() {
  const razorpay = isRazorpayConfigured();

  // Read existing merchant UPI configuration or environment variable; do not invent arbitrary IDs
  let merchantUpiId: string | null = null;
  if (process.env.MERCHANT_UPI_ID !== undefined) {
    const trimmed = process.env.MERCHANT_UPI_ID.trim();
    merchantUpiId = trimmed.length > 0 ? trimmed : null;
  } else if (process.env.NEXT_PUBLIC_MERCHANT_UPI_ID !== undefined) {
    const trimmed = process.env.NEXT_PUBLIC_MERCHANT_UPI_ID.trim();
    merchantUpiId = trimmed.length > 0 ? trimmed : null;
  } else {
    // Existing codebase baseline for Uniq Crackers
    merchantUpiId = 'tejareddysheri72-3@okaxis';
  }

  const merchantName =
    process.env.MERCHANT_UPI_NAME ||
    process.env.NEXT_PUBLIC_MERCHANT_UPI_NAME ||
    'Teja Reddy Sheri';

  const shopName =
    process.env.NEXT_PUBLIC_STORE_NAME ||
    'Uniq Crackers';

  const upiConfigured = Boolean(merchantUpiId && merchantUpiId.trim().length > 0);

  return NextResponse.json(
    createSuccessResponse({
      codAvailable: true,
      upiQrAvailable: true,
      upiConfigured,
      merchantUpiId: upiConfigured ? merchantUpiId : null,
      merchantName: upiConfigured ? merchantName : null,
      shopName,
      razorpayAvailable: razorpay.configured,
      razorpayKeyId: razorpay.keyId || null,
    })
  );
}
