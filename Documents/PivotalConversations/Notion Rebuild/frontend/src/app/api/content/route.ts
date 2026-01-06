import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { notion, DATABASES } from '@/lib/notion/client';
import { getContent, getContentPaginated, getContentItem, deleteContents } from '@/lib/notion/content';
import { getClient } from '@/lib/notion/clients';
import { getIdea } from '@/lib/notion/ideas';
import { createTasksFromScheduledDate, createTask } from '@/lib/notion/tasks';
import { getTeamMembers } from '@/lib/notion/team';
import { sendChannelNotification } from '@/lib/slack/client';
import { ContentType, ContentStatus } from '@/types';

// Statuses that indicate content needs editing work (same as in [id]/route.ts)
const EDITING_NEEDED_STATUSES = [
  'Filmed',
  'PC Feedback',
];

// Helper to validate URLs before sending to Notion
// Notion URL fields have a 2000 char limit
function isValidUrl(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  // Trim whitespace
  const trimmed = str.trim();
  if (!trimmed) return false;
  // Check length limit (Notion URL max is 2000)
  if (trimmed.length > 2000) {
    console.warn(`[Content API] URL too long (${trimmed.length} chars, max 2000): ${trimmed.substring(0, 100)}...`);
    return false;
  }
  try {
    const url = new URL(trimmed);
    const isValid = url.protocol === 'http:' || url.protocol === 'https:';
    if (!isValid) {
      console.warn(`[Content API] URL has invalid protocol: ${url.protocol}`);
    }
    return isValid;
  } catch (e) {
    console.warn(`[Content API] Invalid URL format: "${trimmed.substring(0, 100)}"`, e);
    return false;
  }
}

// GET - Retrieve all content with optional filters
// Supports pagination via ?paginated=true&pageSize=100&cursor=xxx
// Supports date filtering via ?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
// Supports limit via ?limit=100
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId') || undefined;
    const contentType = searchParams.get('contentType') as ContentType | undefined;
    const status = searchParams.get('status') as ContentStatus | undefined;
    const paginated = searchParams.get('paginated') === 'true';
    const pageSize = searchParams.get('pageSize');
    const cursor = searchParams.get('cursor') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const limit = searchParams.get('limit');

    // Return paginated response if requested
    if (paginated) {
      const result = await getContentPaginated({
        clientId,
        contentType,
        status,
        dateFrom,
        dateTo,
        pageSize: pageSize ? parseInt(pageSize) : 100,
        cursor,
      });
      const response = NextResponse.json(result);
      response.headers.set('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
      return response;
    }

    // Default: return content with optional date filters and limit
    const content = await getContent({
      clientId,
      contentType,
      status,
      dateFrom,
      dateTo,
      limit: limit ? parseInt(limit) : 100,
    });
    const response = NextResponse.json(content);
    response.headers.set('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return response;
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

// POST - Create new content
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      clientId,
      contentType,
      status,
      scheduledDate,
      parentContentId,
      ideaSourceId,
      driveLink,
      briefUrl,
      isUrgent,
      clipTranscription,
      clipTimestamp,
      podcastClipStyle,
      // New fields for expanded create dialog
      assignedEditor,
      assignedStrategist,
      assignedCoordinator,
      style,
      editingNotes,
      internalNotes,
      frameIoLink,
      clientFeedback,
      // Schedule/Attributes tab fields
      titleOptions,
      description,
      transcription,
      script,
      copy,
      sourceFileLink,
      dropboxLink,
    } = body;

    if (!title || !clientId) {
      return NextResponse.json(
        { error: 'Title and clientId are required' },
        { status: 400 }
      );
    }

    const properties: Record<string, unknown> = {
      'Title': { title: [{ text: { content: title } }] },
      'Client': { relation: [{ id: clientId }] },
      'Content Type': { select: { name: contentType || 'Short Form' } },
      'Status': { select: { name: status || 'Filmed' } },
    };

    if (scheduledDate) {
      properties['Scheduled Date'] = { date: { start: scheduledDate } };
    }

    // Support parent/child content relations (e.g., Short Form clips from YouTube/Podcast)
    if (parentContentId) {
      properties['Parent Content'] = { relation: [{ id: parentContentId }] };
    }

    // Link to source idea and copy over editing notes if present
    if (ideaSourceId) {
      properties['Idea Source'] = { relation: [{ id: ideaSourceId }] };

      // Fetch the source idea to copy editing notes
      try {
        const sourceIdea = await getIdea(ideaSourceId);
        if (sourceIdea?.editingNotes) {
          properties['Editing Notes'] = { rich_text: [{ text: { content: sourceIdea.editingNotes } }] };
        }
      } catch (e) {
        console.warn('[Content API] Could not fetch source idea for editing notes:', e);
      }
    }

    // Collect URL validation errors
    const urlErrors: string[] = [];

    // Add drive/dropbox link (validate URL)
    if (driveLink) {
      const trimmed = driveLink.trim();
      if (isValidUrl(trimmed)) {
        properties['Drive Link'] = { url: trimmed };
      } else {
        urlErrors.push('Drive Link is invalid (must start with http:// or https://)');
      }
    }

    // Add brief URL (validate URL)
    if (briefUrl) {
      const trimmed = briefUrl.trim();
      if (isValidUrl(trimmed)) {
        properties['Brief URL'] = { url: trimmed };
      } else {
        urlErrors.push('Brief URL is invalid (must start with http:// or https://)');
      }
    }

    // Team assignments
    if (assignedEditor) {
      properties['Assigned Editor'] = { people: [{ id: assignedEditor }] };
    }
    if (assignedStrategist) {
      properties['Assigned Strategist'] = { select: { name: assignedStrategist } };
    }
    if (assignedCoordinator) {
      properties['Assigned Coordinator'] = { select: { name: assignedCoordinator } };
    }

    // Style (for Short Form)
    if (style) {
      properties['Style'] = { select: { name: style } };
    }

    // Notes - only set if not already set from idea source
    if (editingNotes && !properties['Editing Notes']) {
      properties['Editing Notes'] = { rich_text: [{ text: { content: editingNotes } }] };
    }
    if (internalNotes) {
      properties['Internal Notes'] = { rich_text: [{ text: { content: internalNotes } }] };
    }
    if (clientFeedback) {
      properties['Client Feedback'] = { rich_text: [{ text: { content: clientFeedback } }] };
    }

    // Frame.io link - use 'Frame.io Link' property name (actual Notion property)
    if (frameIoLink) {
      const trimmed = frameIoLink.trim();
      if (isValidUrl(trimmed)) {
        properties['Frame.io Link'] = { url: trimmed };
      } else {
        urlErrors.push('Frame.io Link is invalid (must start with http:// or https://)');
      }
    }

    // Source File Link
    if (sourceFileLink) {
      const trimmed = sourceFileLink.trim();
      if (isValidUrl(trimmed)) {
        properties['Source File Link'] = { url: trimmed };
      } else {
        urlErrors.push('Source File Link is invalid (must start with http:// or https://)');
      }
    }

    // Dropbox Link
    if (dropboxLink) {
      const trimmed = dropboxLink.trim();
      if (isValidUrl(trimmed)) {
        properties['Dropbox Link'] = { url: trimmed };
      } else {
        urlErrors.push('Dropbox Link is invalid (must start with http:// or https://)');
      }
    }

    // Return error if any URLs are invalid
    if (urlErrors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid URL(s)', details: urlErrors.join('; ') },
        { status: 400 }
      );
    }

    // Schedule/Attributes tab fields
    if (titleOptions) {
      properties['Title Options'] = { rich_text: [{ text: { content: titleOptions } }] };
    }
    if (description) {
      properties['Description'] = { rich_text: [{ text: { content: description } }] };
    }
    if (transcription) {
      properties['Transcription'] = { rich_text: [{ text: { content: transcription } }] };
    }
    if (script) {
      properties['Script'] = { rich_text: [{ text: { content: script } }] };
    }
    if (copy) {
      properties['Copy'] = { rich_text: [{ text: { content: copy } }] };
    }

    // Clip-specific fields (for Short Form clips from YouTube/Podcast)
    if (clipTranscription) {
      properties['Clip Transcription'] = { rich_text: [{ text: { content: clipTranscription } }] };
    }
    if (clipTimestamp) {
      properties['Clip Timestamp'] = { rich_text: [{ text: { content: clipTimestamp } }] };
    }
    if (podcastClipStyle) {
      properties['Podcast Clip Style'] = { select: { name: podcastClipStyle } };
    }

    console.log('[Content API] Creating content with properties:', JSON.stringify(properties, null, 2));

    const response = await notion.pages.create({
      parent: { database_id: DATABASES.content },
      properties: properties as any,
    });

    const effectiveStatus = status || 'Filmed';
    const effectiveContentType = contentType || 'Short Form';

    // Auto-create tasks if content is created with a scheduled date
    // Skip the "Scheduled" notification if content is in editing stage (we'll send "Editing Needed" instead)
    if (scheduledDate) {
      const skipScheduledNotification = EDITING_NEEDED_STATUSES.includes(effectiveStatus);
      // Fire and forget - don't block response
      createContentScheduledTasks(
        response.id,
        clientId,
        title,
        scheduledDate,
        effectiveContentType as 'Short Form' | 'YouTube' | 'Podcast',
        skipScheduledNotification
      ).catch((err) => {
        console.error('Failed to create scheduled date tasks:', err);
      });
    }

    // Send "Editing Needed" notification when content is created with an edit-stage status
    if (EDITING_NEEDED_STATUSES.includes(effectiveStatus)) {
      sendEditingNeededNotification(
        response.id,
        title,
        clientId,
        effectiveContentType,
        effectiveStatus,
        isUrgent
      ).catch((err) => {
        console.error('Failed to send editing needed notification:', err);
      });
    }

    // Create "Briefing Needed" task when content is created with Filmed status
    if (effectiveStatus === 'Filmed') {
      createBriefingNeededTask(
        response.id,
        title,
        clientId,
        effectiveContentType
      ).catch((err) => {
        console.error('Failed to create briefing needed task:', err);
      });
    }

    // Expire caches immediately for instant updates
    revalidateTag('content', { expire: 0 });
    revalidateTag('pipeline', { expire: 0 });
    revalidateTag('schedule', { expire: 0 });
    revalidateTag('dashboard', { expire: 0 });
    revalidateTag('clients', { expire: 0 });
    revalidateTag('tasks', { expire: 0 });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error creating content:', error);
    console.error('Error details:', error?.body || error?.message || error);
    return NextResponse.json(
      { error: 'Failed to create content', details: error?.body?.message || error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Create tasks when content gets a scheduled date (for ALL content types)
 * @param skipNotification - If true, skip the "Scheduled" notification (used when "Editing Needed" notification is sent instead)
 */
async function createContentScheduledTasks(
  contentId: string,
  clientId: string,
  contentTitle: string,
  scheduledDate: string,
  contentType: 'Short Form' | 'YouTube' | 'Podcast',
  skipNotification: boolean = false
): Promise<void> {
  try {
    // Get client name for task titles
    let clientName: string | undefined;
    try {
      const client = await getClient(clientId);
      clientName = client?.name;
    } catch (e) {
      console.warn('[Content API] Could not fetch client name for tasks');
    }

    const tasks = await createTasksFromScheduledDate({
      contentId,
      clientId,
      clientName,
      contentTitle,
      scheduledDate,
      contentType,
    });

    // Send Slack notification about auto-created tasks (unless skipNotification is true)
    if (tasks.length > 0 && !skipNotification) {
      const dateFormatted = new Date(scheduledDate).toLocaleDateString('en-AU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      // Format task list with due dates
      const taskList = tasks.map(t => `• ${t.task} (Due: ${t.dueDate})`).join('\n');

      await sendChannelNotification(
        `📋 Tasks Created - ${contentType} Scheduled`,
        `*${contentTitle}*${clientName ? ` (${clientName})` : ''} has been scheduled for *${dateFormatted}*.\n\n` +
        `✅ Auto-created ${tasks.length} tasks:\n${taskList}`,
        'info'
      );
    }

    // Always send a notification when tasks are created (even if skipNotification for "Scheduled" message)
    if (tasks.length > 0 && skipNotification) {
      // This is when content is in editing stage - send task creation notification
      const dateFormatted = new Date(scheduledDate).toLocaleDateString('en-AU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const taskList = tasks.map(t => `• ${t.task} (Due: ${t.dueDate})`).join('\n');

      await sendChannelNotification(
        `📋 Tasks Created for ${contentType}`,
        `*${contentTitle}*${clientName ? ` (${clientName})` : ''} is scheduled for *${dateFormatted}*.\n\n` +
        `✅ Auto-created ${tasks.length} tasks:\n${taskList}`,
        'info'
      );
    }

    console.log(`[Content API] Created ${tasks.length} tasks for new ${contentType} "${contentTitle}"${clientName ? ` (Client: ${clientName})` : ''}`);
  } catch (error) {
    console.error(`[Content API] Error creating tasks for ${contentType}:`, error);
    throw error;
  }
}

/**
 * Send Slack notification when new content is created that needs editing
 * @param isUrgent - If true, adds urgent tag to the notification
 */
async function sendEditingNeededNotification(
  contentId: string,
  title: string,
  clientId: string,
  contentType: string,
  status: string,
  isUrgent: boolean = false
): Promise<void> {
  try {
    // Get client name
    let clientName = 'Unknown';
    try {
      const client = await getClient(clientId);
      clientName = client?.name || 'Unknown';
    } catch (e) {
      console.warn('Could not fetch client name for editing notification');
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const contentUrl = appUrl ? `${appUrl}/pipeline?highlight=${contentId}` : undefined;

    const emoji = contentType === 'Short Form' ? '📱' :
                  contentType === 'YouTube' ? '🎬' : '🎙️';

    // Build a descriptive message based on status
    let actionText = 'has been added and is ready for editing';
    if (status === 'Filmed') {
      actionText = 'has been filmed and is ready for editing';
    } else if (status === 'PC Feedback') {
      actionText = 'has been added and is ready for PC review';
    }

    // Add urgent tag if flagged
    const urgentTag = isUrgent ? '🚨 *URGENT* - ' : '';
    const urgentNote = isUrgent ? '\n\n⚠️ *This content is marked as URGENT and should be prioritized!*' : '';

    const message = `${emoji} ${urgentTag}*${title}*\n` +
      `Client: ${clientName}\n` +
      `Type: ${contentType}\n\n` +
      `New content ${actionText}.${urgentNote}` +
      (contentUrl ? `\n\n<${contentUrl}|View in Pipeline>` : '');

    // Use warning type for urgent content to make it stand out
    const notificationType = isUrgent ? 'warning' : 'info';
    const notificationTitle = isUrgent
      ? '🚨 URGENT - New Content - Editing Needed'
      : '✂️ New Content - Editing Needed';

    await sendChannelNotification(
      notificationTitle,
      message,
      notificationType
    );

    console.log(`[Content API] Sent editing needed notification for new content "${title}"${isUrgent ? ' (URGENT)' : ''}`);
  } catch (error) {
    console.error('[Content API] Error sending editing needed notification:', error);
  }
}

/**
 * Create a "Briefing Needed" task assigned to Natasha when content is created with Filmed status
 * This task reminds to create a brief for the newly filmed content
 */
async function createBriefingNeededTask(
  contentId: string,
  title: string,
  clientId: string,
  contentType: string
): Promise<void> {
  try {
    // Get client name
    let clientName = 'Unknown';
    try {
      const client = await getClient(clientId);
      clientName = client?.name || 'Unknown';
    } catch (e) {
      console.warn('[Content API] Could not fetch client name for briefing task');
    }

    // Get Natasha's team member ID
    const teamMembers = await getTeamMembers();
    const natasha = teamMembers.find(m => m.name.toLowerCase().includes('natasha'));

    if (!natasha) {
      console.warn('[Content API] Could not find Natasha in team members for briefing task assignment');
      // Still create the task but unassigned
    }

    // Create the briefing needed task
    const task = await createTask({
      task: `📋 Briefing Needed: "${title}"`,
      clientId,
      status: 'To Do',
      urgency: 'This Week',
      relatedContentId: contentId,
      notes: `Auto-generated: Content created with Filmed status and needs a brief.`,
      assigneeId: natasha?.id, // Assign to Natasha if found
      skipDuplicateCheck: false, // Let it check for duplicates
    });

    if (task) {
      console.log(`[Content API] Created briefing needed task for new content "${title}" (assigned to ${natasha?.name || 'unassigned'})`);

      // Send Slack notification about the task
      await sendChannelNotification(
        '📋 Briefing Task Created',
        `A briefing task has been created for *${title}* (${clientName}).\n\n` +
        `Assigned to: ${natasha?.name || 'Unassigned'}\n` +
        `Content Type: ${contentType}`,
        'info'
      );
    }
  } catch (error) {
    console.error('[Content API] Error creating briefing needed task:', error);
  }
}

// DELETE - Bulk delete content
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Array of content IDs is required' },
        { status: 400 }
      );
    }

    const result = await deleteContents(ids);

    // Expire caches immediately
    revalidateTag('content', { expire: 0 });
    revalidateTag('pipeline', { expire: 0 });
    revalidateTag('schedule', { expire: 0 });
    revalidateTag('dashboard', { expire: 0 });
    revalidateTag('clients', { expire: 0 });

    return NextResponse.json({
      success: true,
      deleted: result.deleted,
      failed: result.failed,
    });
  } catch (error) {
    console.error('Error deleting content:', error);
    return NextResponse.json(
      { error: 'Failed to delete content' },
      { status: 500 }
    );
  }
}
