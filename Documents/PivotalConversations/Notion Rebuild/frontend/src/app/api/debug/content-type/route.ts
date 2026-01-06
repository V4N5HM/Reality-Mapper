import { NextRequest, NextResponse } from 'next/server';
import { notion, DATABASE_IDS } from '@/lib/notion/client';
import { getContent } from '@/lib/notion/content';

// Debug endpoint to check content type detection
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    // Get content for the client (or all if no clientId)
    const content = clientId
      ? await getContent({ clientId })
      : await getContent({ limit: 20 });

    // Filter to only Client Review/Client Feedback items
    const pendingApproval = content.filter(c =>
      ['Client Feedback', 'Client Review'].includes(c.status)
    );

    // Return detailed info about each item
    const debugInfo = pendingApproval.map(c => ({
      id: c.id,
      title: c.title,
      contentType: c.contentType,
      contentTypeType: typeof c.contentType,
      contentTypeStringified: JSON.stringify(c.contentType),
      status: c.status,
      isYouTube: c.contentType === 'YouTube',
      isPodcast: c.contentType === 'Podcast',
      isShortForm: c.contentType === 'Short Form',
      expectedNewStatus: (c.contentType === 'YouTube' || c.contentType === 'Podcast') ? 'Final Review' : 'Approved',
    }));

    return NextResponse.json({
      totalPending: pendingApproval.length,
      items: debugInfo,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
    }, { status: 500 });
  }
}
