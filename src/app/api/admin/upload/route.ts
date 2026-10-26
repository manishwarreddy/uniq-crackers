import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server-auth';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate admin
    const { errorResponse } = requireAdmin(req);
    if (errorResponse) {
      return errorResponse;
    }

    // 2. Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, message: 'No file uploaded.' }, { status: 400 });
    }

    // Check size (< 6MB)
    if (file.size > 6 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: 'File exceeds 6MB limit.' }, { status: 400 });
    }

    // Check mime type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ success: false, message: 'Invalid file type. Allowed: JPG, PNG, WEBP, GIF.' }, { status: 400 });
    }

    // If Supabase is configured, upload to Supabase Storage
    if (isSupabaseConfigured()) {
      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin) {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const buffer = Buffer.from(await file.arrayBuffer());

        const { data, error } = await supabaseAdmin.storage
          .from('product-images')
          .upload(filePath, buffer, {
            contentType: file.type,
            upsert: true,
          });

        if (!error && data) {
          const { data: publicUrlData } = supabaseAdmin.storage
            .from('product-images')
            .getPublicUrl(filePath);

          return NextResponse.json({
            success: true,
            url: publicUrlData.publicUrl,
            storage: 'supabase',
          });
        }
      }
    }

    // Fallback: Convert to data URL if Supabase is not yet configured
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
      storage: 'inline',
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json({ success: false, message: 'Failed to upload photo.' }, { status: 500 });
  }
}
