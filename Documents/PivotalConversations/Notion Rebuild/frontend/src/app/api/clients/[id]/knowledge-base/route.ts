import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/notion/clients';
import { getKnowledgeBaseByClientName } from '@/lib/notion/knowledge-base';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // First get the client to get their name
    const client = await getClient(id);
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Find and fetch the knowledge base by client name
    const knowledgeBase = await getKnowledgeBaseByClientName(client.name);

    if (!knowledgeBase) {
      return NextResponse.json({
        found: false,
        clientName: client.name,
        message: 'No knowledge base found for this client',
      });
    }

    return NextResponse.json({
      found: true,
      knowledgeBase,
    });
  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    return NextResponse.json(
      { error: 'Failed to fetch knowledge base' },
      { status: 500 }
    );
  }
}
