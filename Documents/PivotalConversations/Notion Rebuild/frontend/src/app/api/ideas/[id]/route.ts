import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getIdea, updateIdea } from '@/lib/notion/ideas';
import { notion } from '@/lib/notion/client';
import { ContentType, IdeaContentFormat, IdeaRejectionReason } from '@/types';
import { sendUrgentIdeaAlert } from '@/lib/slack/client';

// GET - Get single idea by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idea = await getIdea(id);

    if (!idea) {
      return NextResponse.json(
        { error: 'Idea not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(idea);
  } catch (error) {
    console.error('Error fetching idea:', error);
    return NextResponse.json(
      { error: 'Failed to fetch idea' },
      { status: 500 }
    );
  }
}

// PATCH - Update idea
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, status, contentType, script, hook, angle, source, sourceLink, style, priority, url, rejectionReason, rejectionNote, editingNotes } = body;

    // Get the current idea to check if priority is changing to Urgent
    const currentIdea = await getIdea(id);
    const isNewlyUrgent = priority === 'Urgent' && currentIdea?.priority !== 'Urgent';

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

    const idea = await updateIdea(id, {
      title,
      status,
      contentFormat,
      script,
      hook,
      angle,
      source,
      sourceLink,
      style,
      priority,
      url,
      rejectionReason: rejectionReason as IdeaRejectionReason,
      rejectionNote,
      editingNotes,
    });

    // Send urgent notification if priority was just set to Urgent
    if (isNewlyUrgent) {
      try {
        const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000';

        await sendUrgentIdeaAlert({
          title: idea.title,
          clientName: idea.clientName || currentIdea?.clientName,
          contentFormat: idea.contentFormat,
          ideaId: idea.id,
        }, appBaseUrl);

        console.log(`[Ideas API] Sent urgent notification for idea: ${idea.title}`);
      } catch (notifError) {
        // Log but don't fail the update if notification fails
        console.error('[Ideas API] Failed to send urgent notification:', notifError);
      }
    }

    // Expire caches immediately for instant updates
    revalidateTag('ideas', { expire: 0 });
    revalidateTag('clients', { expire: 0 });
    revalidateTag('dashboard', { expire: 0 });

    return NextResponse.json(idea);
  } catch (error) {
    console.error('Error updating idea:', error);
    return NextResponse.json(
      { error: 'Failed to update idea' },
      { status: 500 }
    );
  }
}

// DELETE - Archive idea
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await notion.pages.update({
      page_id: id,
      archived: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting idea:', error);
    return NextResponse.json(
      { error: 'Failed to delete idea' },
      { status: 500 }
    );
  }
}
