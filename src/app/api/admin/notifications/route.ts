import { NextResponse } from 'next/server';
import { ServerStore } from '@/lib/server-store';
import { createSuccessResponse, createErrorResponse } from '@/lib/security';
import { requireAdmin } from '@/lib/server-auth';

export async function GET(request: Request) {
  try {
    const { errorResponse } = requireAdmin(request);
    if (errorResponse) {
      return errorResponse;
    }

    const notifications = await ServerStore.getNotificationsAsync();
    const unreadCount = ServerStore.getUnreadNotificationsCount();
    return NextResponse.json(
      createSuccessResponse({
        notifications,
        unreadCount,
      })
    );
  } catch (err: any) {
    return NextResponse.json(createErrorResponse('NOTIFICATIONS_ERROR', err.message), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { errorResponse } = requireAdmin(request);
    if (errorResponse) {
      return errorResponse;
    }

    const body = await request.json();
    const { action, id } = body;

    if (action === 'MARK_READ' && id) {
      await ServerStore.markNotificationAsReadAsync(id);
      return NextResponse.json(createSuccessResponse({ success: true, id }));
    }

    if (action === 'DISMISS' && id) {
      await ServerStore.dismissNotificationAsync(id);
      return NextResponse.json(createSuccessResponse({ success: true, id, dismissed: true }));
    }

    if (action === 'MARK_ALL_READ') {
      await ServerStore.markAllNotificationsAsReadAsync();
      return NextResponse.json(createSuccessResponse({ success: true }));
    }

    if (action === 'DELETE' && id) {
      await ServerStore.deleteNotificationAsync(id);
      return NextResponse.json(createSuccessResponse({ success: true, id }));
    }

    if (action === 'DELETE_ALL') {
      await ServerStore.deleteAllNotificationsAsync();
      return NextResponse.json(createSuccessResponse({ success: true, deletedAll: true }));
    }

    return NextResponse.json(createErrorResponse('INVALID_ACTION', 'Action not recognized.'), {
      status: 400,
    });
  } catch (err: any) {
    return NextResponse.json(createErrorResponse('NOTIFICATIONS_ERROR', err.message), { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { errorResponse } = requireAdmin(request);
    if (errorResponse) {
      return errorResponse;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const isAll = searchParams.get('all') === 'true' || !id;

    if (isAll) {
      await ServerStore.deleteAllNotificationsAsync();
      return NextResponse.json(createSuccessResponse({ success: true, message: 'All notifications deleted.' }));
    }

    await ServerStore.deleteNotificationAsync(id);
    return NextResponse.json(createSuccessResponse({ success: true, id }));
  } catch (err: any) {
    return NextResponse.json(createErrorResponse('NOTIFICATIONS_ERROR', err.message), { status: 500 });
  }
}

