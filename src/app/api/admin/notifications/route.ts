import { NextResponse } from 'next/server';
import { ServerStore } from '@/lib/server-store';
import { createSuccessResponse, createErrorResponse } from '@/lib/security';

export async function GET() {
  try {
    const notifications = ServerStore.getNotifications();
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
    const body = await request.json();
    const { action, id } = body;

    if (action === 'MARK_READ' && id) {
      ServerStore.markNotificationAsRead(id);
      return NextResponse.json(createSuccessResponse({ success: true, id }));
    }

    if (action === 'MARK_ALL_READ') {
      ServerStore.markAllNotificationsAsRead();
      return NextResponse.json(createSuccessResponse({ success: true }));
    }

    return NextResponse.json(createErrorResponse('INVALID_ACTION', 'Action not recognized.'), {
      status: 400,
    });
  } catch (err: any) {
    return NextResponse.json(createErrorResponse('NOTIFICATIONS_ERROR', err.message), { status: 500 });
  }
}
