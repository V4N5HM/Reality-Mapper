import { NextRequest, NextResponse } from 'next/server';
import { getClients, createClient, getClientStats, deleteClients } from '@/lib/notion/clients';
import { ClientStatus } from '@/types';

// GET - List all clients with optional status filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as ClientStatus | null;
    const stats = searchParams.get('stats') === 'true';

    if (stats) {
      const clientStats = await getClientStats();
      const response = NextResponse.json(clientStats);
      response.headers.set('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
      return response;
    }

    const clients = await getClients(status || undefined);
    const response = NextResponse.json(clients);
    // Cache for 30 seconds, allow stale data for 60 more seconds while revalidating
    response.headers.set('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return response;
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

// POST - Create new client
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, status, packageId, startDate, slackChannel } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Client name is required' },
        { status: 400 }
      );
    }

    const client = await createClient({
      name,
      status,
      packageId,
      startDate,
      slackChannel,
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    );
  }
}

// DELETE - Bulk delete clients
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Array of client IDs is required' },
        { status: 400 }
      );
    }

    const result = await deleteClients(ids);

    return NextResponse.json({
      success: true,
      deleted: result.deleted,
      failed: result.failed,
    });
  } catch (error) {
    console.error('Error deleting clients:', error);
    return NextResponse.json(
      { error: 'Failed to delete clients' },
      { status: 500 }
    );
  }
}
