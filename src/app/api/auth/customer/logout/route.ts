import { NextResponse } from 'next/server';
import { createSuccessResponse } from '@/lib/security';

export async function POST() {
  const response = NextResponse.json(createSuccessResponse({ loggedOut: true }));
  response.cookies.delete('customer_session');
  return response;
}
