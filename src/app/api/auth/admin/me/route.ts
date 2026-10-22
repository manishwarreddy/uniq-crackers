import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server-auth';
import { createSuccessResponse } from '@/lib/security';

export async function GET(request: Request) {
  const { session, errorResponse } = requireAdmin(request);
  if (errorResponse) {
    return errorResponse;
  }

  return NextResponse.json(
    createSuccessResponse({
      authenticated: true,
      user: {
        userId: session!.userId,
        name: session!.name,
        role: session!.role,
      },
    })
  );
}
