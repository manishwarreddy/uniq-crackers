import { NextResponse } from 'next/server';
import { getAdminCookieOptions } from '@/lib/server-auth';
import { createSuccessResponse } from '@/lib/security';

export async function POST() {
  const response = NextResponse.json(
    createSuccessResponse({ message: 'Administrator session terminated.' })
  );

  const cookieOptions = getAdminCookieOptions(0);
  response.cookies.set(cookieOptions.name, '', {
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    path: cookieOptions.path,
    maxAge: 0,
  });

  return response;
}
