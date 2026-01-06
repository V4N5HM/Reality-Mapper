import { NextRequest, NextResponse } from 'next/server';
import { getIdea, updateIdea, mapContentBankToMainClient } from '@/lib/notion/ideas';
import { notion, DATABASE_IDS } from '@/lib/notion/client';

// POST - Convert idea to content
// Creates a new Content item and links it back to the idea
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { scheduledDate, assignedEditor, status } = body;

    // Get the idea first
    const idea = await getIdea(id);
    if (!idea) {
      return NextResponse.json(
        { error: 'Idea not found' },
        { status: 404 }
      );
    }

    // Check if already converted
    if (idea.linkedContentId) {
      return NextResponse.json(
        { error: 'Idea has already been converted to content', contentId: idea.linkedContentId },
        { status: 400 }
      );
    }

    // Map the Content Bank client ID to main client ID
    // The Ideas database uses Content Bank clients, but Content database uses main clients
    const mainClientId = await mapContentBankToMainClient(idea.clientId) || idea.clientId;

    // Create the content item
    const contentProperties: Record<string, unknown> = {
      'Title': { title: [{ text: { content: idea.title } }] },
      'Client': { relation: [{ id: mainClientId }] },
      'Content Type': { select: { name: idea.contentType } },
      'Status': { select: { name: status || 'Filmed' } },
      'Idea Source': { relation: [{ id: idea.id }] },
    };

    // Add internal notes with hook and script if available
    const notes: string[] = [];
    if (idea.hook) notes.push(`Hook: ${idea.hook}`);
    if (idea.script) notes.push(`Script: ${idea.script}`);
    if (idea.source) notes.push(`Source: ${idea.source}`);
    if (idea.url) notes.push(`Reference: ${idea.url}`);

    if (notes.length > 0) {
      contentProperties['Internal Notes'] = {
        rich_text: [{ text: { content: notes.join('\n\n') } }]
      };
    }

    // Copy editing notes from idea to content
    if (idea.editingNotes) {
      contentProperties['Editing Notes'] = {
        rich_text: [{ text: { content: idea.editingNotes } }]
      };
    }

    if (scheduledDate) {
      contentProperties['Scheduled Date'] = { date: { start: scheduledDate } };
    }

    // Create the content
    const contentPage = await notion.pages.create({
      parent: { database_id: DATABASE_IDS.content },
      properties: contentProperties as any,
    });

    // Update the idea to mark it as used
    // Note: The content is linked via the 'Idea Source' relation on the Content side,
    // so we don't need to update linkedContentId on the Idea side
    await updateIdea(id, {
      status: 'Used',
    });

    return NextResponse.json({
      success: true,
      contentId: contentPage.id,
      message: `Idea "${idea.title}" converted to content successfully`,
    }, { status: 201 });
  } catch (error) {
    console.error('Error converting idea to content:', error);
    return NextResponse.json(
      { error: 'Failed to convert idea to content' },
      { status: 500 }
    );
  }
}
