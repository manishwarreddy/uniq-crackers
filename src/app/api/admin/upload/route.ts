import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server-auth';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { deleteImageFromSupabaseStorage, ensureProductImagesBucket } from '@/lib/supabase-sync';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate admin
    const { errorResponse } = requireAdmin(req);
    if (errorResponse) {
      return errorResponse;
    }

    const contentType = req.headers.get('content-type') || '';

    // Handle signed upload URL request for direct client-to-Supabase upload
    if (contentType.includes('application/json')) {
      const body = await req.json();
      if (body.action === 'GET_SIGNED_URL') {
        if (!isSupabaseConfigured()) {
          return NextResponse.json({
            success: false,
            message: 'Supabase is not configured for cloud storage.',
            storage: 'local',
          });
        }

        const supabaseAdmin = getSupabaseAdmin();
        if (!supabaseAdmin) {
          return NextResponse.json(
            { success: false, message: 'Supabase storage admin client unavailable.' },
            { status: 500 }
          );
        }

        await ensureProductImagesBucket();

        const fileExt = (body.fileName || 'photo.jpg').split('.').pop() || 'jpg';
        const sanitizedExt = fileExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const fileName = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${sanitizedExt}`;
        const filePath = `products/${fileName}`;

        const { data: signData, error: signError } = await supabaseAdmin.storage
          .from('product-images')
          .createSignedUploadUrl(filePath);

        if (signError || !signData) {
          return NextResponse.json(
            { success: false, message: signError?.message || 'Failed to create signed upload URL.' },
            { status: 500 }
          );
        }

        const { data: publicUrlData } = supabaseAdmin.storage
          .from('product-images')
          .getPublicUrl(filePath);

        return NextResponse.json({
          success: true,
          signedUrl: signData.signedUrl,
          path: signData.path,
          token: signData.token,
          publicUrl: publicUrlData.publicUrl,
          storage: 'supabase',
        });
      }
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
      await ensureProductImagesBucket();
      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin) {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const sanitizedExt = fileExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const fileName = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${sanitizedExt}`;
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
        } else if (error) {
          console.error('[SUPABASE STORAGE] Upload error:', error.message);
          return NextResponse.json({
            success: false,
            message: `Supabase Storage upload failed: ${error.message}`,
          }, { status: 500 });
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
  } catch (error: any) {
    console.error('Image upload error:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Failed to upload photo.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { errorResponse } = requireAdmin(req);
    if (errorResponse) {
      return errorResponse;
    }

    const { searchParams } = new URL(req.url);
    let url = searchParams.get('url');

    if (!url) {
      try {
        const body = await req.json();
        url = body.url;
      } catch {
        // ignore JSON parse error
      }
    }

    if (!url) {
      return NextResponse.json({ success: false, message: 'Image URL is required.' }, { status: 400 });
    }

    const deleted = await deleteImageFromSupabaseStorage(url);

    return NextResponse.json({
      success: true,
      storageDeleted: deleted,
      message: deleted ? 'Image deleted from Supabase Storage.' : 'Local or non-storage reference cleared.',
    });
  } catch (error: any) {
    console.error('Image delete error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to delete photo.' }, { status: 500 });
  }
}
