import { NextResponse } from 'next/server';
import { ServerStore } from '@/lib/server-store';
import { createSuccessResponse, createErrorResponse } from '@/lib/security';
import {
  requireAdmin,
  getOrderAuthContext,
  getOrderAccessTokenFromRequest,
  getCustomerSession,
} from '@/lib/server-auth';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { syncOrderToSupabase, ensurePaymentScreenshotsBucket } from '@/lib/supabase-sync';
import fs from 'node:fs';
import path from 'node:path';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function isValidImageMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;

  // JPEG magic bytes: FF D8 FF
  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  // WEBP magic bytes: RIFF....WEBP
  if (mimeType === 'image/webp') {
    const isRiff =
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
    const isWebp =
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    return isRiff && isWebp;
  }

  return false;
}

/**
 * POST /api/orders/payment-proof
 * Allows customers or admins to upload a payment screenshot and link it to an order.
 * Validates file type and size.
 * Stores screenshots in the PRIVATE 'payment-screenshots' Supabase Storage bucket.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const orderNumber = formData.get('orderNumber')?.toString()?.trim();
    const upiUtr = formData.get('upiUtr')?.toString()?.trim();
    const file = formData.get('file') as File | null;

    if (!orderNumber) {
      return NextResponse.json(
        createErrorResponse('MISSING_FIELDS', 'orderNumber is required.'),
        { status: 400 }
      );
    }

    const cleanNum = orderNumber.toUpperCase();
    const order = ServerStore.getOrderById(cleanNum);
    if (!order) {
      return NextResponse.json(
        createErrorResponse('NOT_FOUND', `Order #${cleanNum} not found.`),
        { status: 404 }
      );
    }

    // Verify Authorization: must be Admin, order owner (by phone session), or order access token holder
    const authContext = getOrderAuthContext(request, order);
    if (!authContext.isAdmin && !authContext.isCustomerOwner && !authContext.isOrderTokenHolder) {
      return NextResponse.json(
        createErrorResponse(
          'UNAUTHORIZED',
          'You are not authorized to upload payment proof for this order.'
        ),
        { status: 401 }
      );
    }

    if (!file) {
      return NextResponse.json(
        createErrorResponse('MISSING_FILE', 'Payment screenshot file is required.'),
        { status: 400 }
      );
    }

    // Validate size (max 5MB)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        createErrorResponse(
          'FILE_TOO_LARGE',
          `Payment screenshot file size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 5 MB limit.`
        ),
        { status: 400 }
      );
    }

    // Validate MIME type
    const mimeType = file.type?.toLowerCase() || '';
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        createErrorResponse(
          'INVALID_FILE_TYPE',
          'Only JPG, PNG, and WebP payment screenshots are accepted.'
        ),
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Deep inspection of magic bytes
    if (!isValidImageMagicBytes(buffer, mimeType)) {
      return NextResponse.json(
        createErrorResponse(
          'INVALID_IMAGE_BYTES',
          'Uploaded file content does not match genuine image format.'
        ),
        { status: 400 }
      );
    }

    // Determine extension
    let ext = 'jpg';
    if (mimeType === 'image/png') ext = 'png';
    else if (mimeType === 'image/webp') ext = 'webp';

    const fileName = `proofs/${cleanNum}_${Date.now()}.${ext}`;
    let savedStoragePath = fileName;

    // Upload to private Supabase Storage bucket 'payment-screenshots'
    if (isSupabaseConfigured()) {
      await ensurePaymentScreenshotsBucket();
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { error: uploadErr } = await supabase.storage
          .from('payment-screenshots')
          .upload(fileName, buffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (uploadErr) {
          console.warn('[STORAGE] Error uploading screenshot to Supabase:', uploadErr.message);
          // If Supabase upload fails, fallback to local secure storage
          savedStoragePath = saveLocalFallback(fileName, buffer);
        }
      }
    } else {
      // Local development/test fallback
      savedStoragePath = saveLocalFallback(fileName, buffer);
    }

    const cleanUtrNumber = upiUtr ? upiUtr.replace(/[^\d]/g, '').slice(0, 12) : undefined;

    // Update order record in ServerStore
    const updatedOrder = ServerStore.updateOrderPaymentProof(
      cleanNum,
      savedStoragePath,
      cleanUtrNumber
    );

    if (updatedOrder) {
      // Sync to Supabase
      syncOrderToSupabase(updatedOrder).catch((e) =>
        console.warn('[SUPABASE SYNC] Failed to sync updated order proof:', e)
      );
    }

    return NextResponse.json(
      createSuccessResponse({
        orderNumber: cleanNum,
        storagePath: savedStoragePath,
        upiUtr: cleanUtrNumber || order.upiUtr,
        message: 'Payment screenshot uploaded successfully. Awaiting administrator verification.',
      })
    );
  } catch (err: any) {
    return NextResponse.json(
      createErrorResponse('UPLOAD_ERROR', err?.message || 'Failed to process screenshot upload.'),
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders/payment-proof?orderNumber=UC-2026-XXXX
 * Admin-only endpoint to securely view payment screenshots.
 * Generates a signed URL from the private Supabase bucket or streams image.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderNumber')?.trim();
    const wantsJson =
      searchParams.get('json') === 'true' ||
      request.headers.get('accept')?.includes('application/json');

    if (!orderNumber) {
      return NextResponse.json(
        createErrorResponse('MISSING_FIELDS', 'orderNumber query parameter is required.'),
        { status: 400 }
      );
    }

    // STRICT: Only authorized administrators can view payment screenshots
    const { errorResponse } = requireAdmin(request);
    if (errorResponse) {
      return errorResponse;
    }

    const cleanNum = orderNumber.toUpperCase();
    const order = ServerStore.getOrderById(cleanNum);
    if (!order) {
      return NextResponse.json(
        createErrorResponse('NOT_FOUND', `Order #${cleanNum} not found.`),
        { status: 404 }
      );
    }

    if (!order.paymentScreenshot) {
      return NextResponse.json(
        createErrorResponse('NO_PROOF', `No payment screenshot on file for order #${cleanNum}.`),
        { status: 404 }
      );
    }

    const storagePath = order.paymentScreenshot;

    // 1. If stored in Supabase private bucket
    if (isSupabaseConfigured() && !storagePath.startsWith('local://')) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        // Create a temporary signed URL valid for 60 minutes
        const { data: signedData, error: signErr } = await supabase.storage
          .from('payment-screenshots')
          .createSignedUrl(storagePath, 3600);

        if (!signErr && signedData?.signedUrl) {
          if (wantsJson) {
            return NextResponse.json(
              createSuccessResponse({
                orderNumber: cleanNum,
                signedUrl: signedData.signedUrl,
                upiUtr: order.upiUtr || null,
                uploadedAt: order.paymentScreenshotUploadedAt || null,
              })
            );
          }
          // Redirect browser to signed URL
          return NextResponse.redirect(signedData.signedUrl, 307);
        }
      }
    }

    // 2. Local fallback storage handling
    const localRelative = storagePath.replace(/^local:\/\//, '');
    const localFullPath = path.join(process.cwd(), '.data', 'payment-screenshots', localRelative);

    if (fs.existsSync(localFullPath)) {
      const fileBuffer = fs.readFileSync(localFullPath);
      const ext = path.extname(localFullPath).toLowerCase();
      let contentType = 'image/jpeg';
      if (ext === '.png') contentType = 'image/png';
      if (ext === '.webp') contentType = 'image/webp';

      if (wantsJson) {
        const base64 = `data:${contentType};base64,${fileBuffer.toString('base64')}`;
        return NextResponse.json(
          createSuccessResponse({
            orderNumber: cleanNum,
            dataUrl: base64,
            upiUtr: order.upiUtr || null,
            uploadedAt: order.paymentScreenshotUploadedAt || null,
          })
        );
      }

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      });
    }

    return NextResponse.json(
      createErrorResponse('FILE_NOT_FOUND', 'Stored payment screenshot file was not found.'),
      { status: 404 }
    );
  } catch (err: any) {
    return NextResponse.json(
      createErrorResponse('SERVER_ERROR', err?.message || 'Error retrieving payment screenshot.'),
      { status: 500 }
    );
  }
}

function saveLocalFallback(fileName: string, buffer: Buffer): string {
  const localDir = path.join(process.cwd(), '.data', 'payment-screenshots', path.dirname(fileName));
  fs.mkdirSync(localDir, { recursive: true });
  const fullPath = path.join(process.cwd(), '.data', 'payment-screenshots', fileName);
  fs.writeFileSync(fullPath, buffer);
  return `local://${fileName}`;
}

