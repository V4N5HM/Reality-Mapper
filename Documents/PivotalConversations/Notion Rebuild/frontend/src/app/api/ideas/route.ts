import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getIdeasWithClientNames, createIdea, getIdeaStats, getIdeasPaginated, enrichIdeaWithClientName, deleteIdeas } from '@/lib/notion/ideas';
import { sendUrgentIdeaAlert } from '@/lib/slack/client';
import { IdeaStatus, ContentType, IdeaContentFormat } from '@/types';

// GET - List ideas with optional filters
// Supports date range filtering via ?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId') || undefined;
    const status = searchParams.get('status') as IdeaStatus | null;
    const contentType = searchParams.get('contentType') as ContentType | null;
    const contentFormat = searchParams.get('contentFormat') as IdeaContentFormat | null;
    const limit = searchParams.get('limit');
    const cursor = searchParams.get('cursor') || undefined;
    const pageSize = searchParams.get('pageSize');
    const stats = searchParams.get('stats') === 'true';
    const paginated = searchParams.get('paginated') === 'true';
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    // Return stats for a specific client
    if (stats && clientId) {
      const ideaStats = await getIdeaStats(clientId);
      return NextResponse.json(ideaStats);
    }

    // Use paginated response for "Load More" functionality
    if (paginated) {
      const result = await getIdeasPaginated({
        clientId,
        status: status || undefined,
        contentType: contentType || undefined,
        contentFormat: contentFormat || undefined,
        pageSize: pageSize ? parseInt(pageSize) : 100,
        cursor,
      });
      return NextResponse.json(result);
    }

    const ideas = await getIdeasWithClientNames({
      clientId,
      status: status || undefined,
      contentType: contentType || undefined,
      limit: limit ? parseInt(limit) : undefined,
      dateFrom,
      dateTo,
    });

    return NextResponse.json(ideas);
  } catch (error) {
    console.error('Error fetching ideas:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ideas' },
      { status: 500 }
    );
  }
}

// POST - Create new idea (optimized for fast response)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, clientId, contentType, status, script, hook, angle, source, sourceLink, style, priority, url, briefUrl, editingNotes } = body;

    if (!title || !clientId) {
      return NextResponse.json(
        { error: 'Title and clientId are required' },
        { status: 400 }
      );
    }

    // Convert contentType to contentFormat if provided
    let contentFormat: IdeaContentFormat | undefined;
    if (contentType) {
      const formatMap: Record<ContentType, IdeaContentFormat> = {
        'Short Form': '📹 Short Video',
        'YouTube': '🎥 Long Video',
        'Podcast': '🎥 Long Video',
      };
      contentFormat = formatMap[contentType as ContentType];
    }

    const idea = await createIdea({
      title,
      clientId,
      contentFormat,
      status,
      script,
      hook,
      angle,
      source,
      sourceLink,
      style,
      priority,
      url,
      briefUrl,
      editingNotes,
    });

    // Enrich with client name for the response so it displays properly in the UI
    const enrichedIdea = await enrichIdeaWithClientName(idea);

    // Expire caches immediately for instant updates
    revalidateTag('ideas', { expire: 0 });
    revalidateTag('clients', { expire: 0 });
    revalidateTag('dashboard', { expire: 0 });

    // Send Slack notification asynchronously (don't wait for it)
    if (priority === 'Urgent') {
      const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

      // Fire and forget - don't await
      sendUrgentIdeaAlert({
        title: enrichedIdea.title,
        clientName: enrichedIdea.clientName,
        contentFormat: enrichedIdea.contentFormat,
        ideaId: enrichedIdea.id,
      }, appBaseUrl).catch(err => {
        console.error('[Ideas API] Failed to send urgent notification:', err);
      });
    }

    return NextResponse.json(enrichedIdea, { status: 201 });
  } catch (error: any) {
    console.error('Error creating idea:', error);
    // Log full Notion API error details
    if (error?.body) {
      console.error('Notion API error body:', JSON.stringify(error.body, null, 2));
    }
    if (error?.code) {
      console.error('Notion API error code:', error.code);
    }
    return NextResponse.json(
      { error: 'Failed to create idea', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

// DELETE - Bulk delete ideas
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Array of idea IDs is required' },
        { status: 400 }
      );
    }

    const result = await deleteIdeas(ids);

    // Expire caches immediately
    revalidateTag('ideas', { expire: 0 });
    revalidateTag('clients', { expire: 0 });
    revalidateTag('dashboard', { expire: 0 });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting ideas:', error);
    return NextResponse.json(
      { error: 'Failed to delete ideas' },
      { status: 500 }
    );
  }
}
