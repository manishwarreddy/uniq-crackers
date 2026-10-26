import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server-auth';
import { testSupabaseConnection } from '@/lib/supabase-sync';
import { isSupabaseConfigured } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { errorResponse } = requireAdmin(req);
    if (errorResponse) {
      return errorResponse;
    }

    const configured = isSupabaseConfigured();
    if (!configured) {
      return NextResponse.json({
        success: true,
        configured: false,
        connected: false,
        message: 'Supabase credentials not yet configured in .env.local.',
      });
    }

    const result = await testSupabaseConnection();
    return NextResponse.json({
      success: true,
      configured: true,
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Error checking Supabase status' },
      { status: 500 }
    );
  }
}
