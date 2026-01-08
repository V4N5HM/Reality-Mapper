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
    const { name, email, status, packageId, startDate, slackChannel, accountManager } = body;

    const client = await updateClient(id, {
      name,
      email,
      status,
      packageId,
      startDate,
      slackChannel,
      accountManager,
    });

    return NextResponse.json(client);
  } catch (error: any) {
    console.error('Error updating client:', error);
    console.error('Error details:', error?.body || error?.message || error);
    return NextResponse.json(
      { error: 'Failed to update client', details: error?.message || String(error) },
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
