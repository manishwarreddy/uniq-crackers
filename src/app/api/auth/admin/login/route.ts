import { NextResponse } from 'next/server';
import {
  verifyAdminPassword,
  createAdminSessionToken,
  getAdminCookieOptions,
} from '@/lib/server-auth';
import {
  createSuccessResponse,
  createErrorResponse,
  checkRateLimit,
  getClientIp,
  resetRateLimit,
} from '@/lib/security';

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitKey = `admin-login:${clientIp}`;

    // Rate limiting: maximum 5 login attempts per 15 minutes (900 seconds)
    const rateCheck = checkRateLimit(rateLimitKey, 5, 900);
    if (!rateCheck.isAllowed) {
      return NextResponse.json(
        createErrorResponse(
          'RATE_LIMITED',
          `Too many failed login attempts. Please try again in ${rateCheck.resetSeconds} seconds.`
        ),
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { password } = body;

    if (!password || typeof password !== 'string' || password.trim().length === 0) {
      return NextResponse.json(
        createErrorResponse('INVALID_CREDENTIALS', 'Invalid credentials. Access denied.'),
        { status: 401 }
      );
    }

    const isValid = verifyAdminPassword(password);
    if (!isValid) {
      return NextResponse.json(
        createErrorResponse('INVALID_CREDENTIALS', 'Invalid credentials. Access denied.'),
        { status: 401 }
      );
    }

    // Reset rate limit on successful authentication
    resetRateLimit(rateLimitKey);

    // Create cryptographically signed admin session
    const token = createAdminSessionToken({
      userId: 'admin-super-01',
      name: 'Store Administrator',
      role: 'ADMIN',
    });

    const response = NextResponse.json(
      createSuccessResponse({
        authenticated: true,
        user: {
          userId: 'admin-super-01',
          name: 'Store Administrator',
          role: 'ADMIN',
        },
      })
    );

    // Set HttpOnly, Secure, SameSite=Lax session cookie
    const cookieOptions = getAdminCookieOptions();
    response.cookies.set(cookieOptions.name, token, {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
      maxAge: cookieOptions.maxAge,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      createErrorResponse('INTERNAL_ERROR', 'Authentication service error.'),
      { status: 500 }
    );
  }
}
