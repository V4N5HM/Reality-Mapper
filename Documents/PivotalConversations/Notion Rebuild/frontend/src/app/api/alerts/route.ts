import { NextRequest, NextResponse } from 'next/server';
import { getAlerts, createAlert, deleteAlerts, markAlertsAsRead, getAlertStats } from '@/lib/notion/alerts';
import { AlertType, AlertPriority } from '@/types';

// GET alerts with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId') || undefined;
    const type = searchParams.get('type') as AlertType | undefined;
    const priority = searchParams.get('priority') as AlertPriority | undefined;
    const read = searchParams.get('read');
    const dismissed = searchParams.get('dismissed');
    const limit = searchParams.get('limit');
    const stats = searchParams.get('stats');

    // Return stats if requested
    if (stats === 'true') {
      const alertStats = await getAlertStats();
      return NextResponse.json(alertStats);
    }

    const alerts = await getAlerts({
      clientId,
      type,
      priority,
      read: read !== null ? read === 'true' : undefined,
      dismissed: dismissed !== null ? dismissed === 'true' : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

// POST create new alert
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, message, type, priority, clientId, relatedEntityId, relatedEntityType, sentToSlack } = body;

    if (!title || !message || !type) {
      return NextResponse.json(
        { error: 'Title, message, and type are required' },
        { status: 400 }
      );
    }

    const alert = await createAlert({
      title,
      message,
      type,
      priority,
      clientId,
      relatedEntityId,
      relatedEntityType,
      sentToSlack,
    });

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}

// DELETE bulk delete alerts
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Array of alert IDs is required' },
        { status: 400 }
      );
    }

    const result = await deleteAlerts(ids);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting alerts:', error);
    return NextResponse.json(
      { error: 'Failed to delete alerts' },
      { status: 500 }
    );
  }
}

// PATCH bulk update alerts (mark as read)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, action } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Array of alert IDs is required' },
        { status: 400 }
      );
    }

    if (action === 'markAsRead') {
      const updated = await markAlertsAsRead(ids);
      return NextResponse.json({ updated });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating alerts:', error);
    return NextResponse.json(
      { error: 'Failed to update alerts' },
      { status: 500 }
    );
  }
}
