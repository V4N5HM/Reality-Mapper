import { NextRequest, NextResponse } from 'next/server';
import { getClient, updateClient } from '@/lib/notion/clients';
import { notion } from '@/lib/notion/client';

// GET - Get single client by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await getClient(id);

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    );
  }
}

// PATCH - Update client
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    console.log('[PATCH /api/clients] Request body:', JSON.stringify(body));
    console.log('[PATCH /api/clients] Client ID:', id);

    const { name, email, status, packageId, startDate, slackChannel, accountManager } = body;

    const updateData = {
      name,
      ...(email ? { email } : {}),
      status,
      packageId,
      startDate,
      slackChannel,
      accountManager,
    };
    console.log('[PATCH /api/clients] Update data:', JSON.stringify(updateData));

    const client = await updateClient(id, updateData);
    console.log('[PATCH /api/clients] Success, updated client:', client.name);

    return NextResponse.json(client);
  } catch (error: any) {
    console.error('[PATCH /api/clients] Error updating client:', error);
    console.error('[PATCH /api/clients] Error body:', JSON.stringify(error?.body));
    console.error('[PATCH /api/clients] Error message:', error?.message);
    return NextResponse.json(
      { error: 'Failed to update client', details: error?.body?.message || error?.message || String(error) },
      { status: 500 }
    );
  }
}

// DELETE - Archive client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Archive the page (Notion doesn't truly delete)
    await notion.pages.update({
      page_id: id,
      archived: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    );
  }
}
