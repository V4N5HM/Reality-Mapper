import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { notion } from '@/lib/notion/client';
import { getContentItem } from '@/lib/notion/content';
import { getClient } from '@/lib/notion/clients';
import {
  sendSlackMessage,
  buildContentStatusNotification,
} from '@/lib/slack';
import { createTasksFromScheduledDate, updateTasksDueDatesForContent, getTasksByContentId } from '@/lib/notion/tasks';
import { sendChannelNotification } from '@/lib/slack/client';
import { moveAssetToPosted } from '@/lib/frameio/service';

// Statuses that trigger Slack notifications
const NOTIFY_STATUSES = [
  'Approved',
  'Not Approved',
  'Posted',
  'Live',
];

// Statuses that indicate content needs editing work (consistent across all content types)
// Filmed - content has been filmed/recorded and is ready for editing
// PC Feedback - content is ready for PC review
const EDITING_NEEDED_STATUSES = [
  'Filmed',        // All types - filmed and ready for edit
  'PC Feedback',   // All types - ready for PC review
];

// Statuses that indicate content needs scheduling
const SCHEDULING_NEEDED_STATUSES = [
  'Approved',      // Short Form - approved, needs scheduling
  'To Schedule',   // YouTube/Podcast - ready to be scheduled
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

// GET single content item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const page = await notion.pages.retrieve({ page_id: id });
    return NextResponse.json(page);
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

// PATCH - Update content (status, title, scheduled date, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    console.log(`[Content API] PATCH request for content ID: ${id}`);
    console.log(`[Content API] Request body keys:`, Object.keys(body));

    const {
      status,
      title,
      scheduledDate,
      contentType,
      clientFeedback,
      internalNotes,
      parentContentId,
      briefUrl,
      driveLink,
      frameIoLink,
      assignedEditor,
      assignedStrategist,
      assignedCoordinator,
      style,
      editingNotes,
      // Attributes
      titleOptions,
      thumbnails,
      description,
      transcription,
      script,
      copy,
      // Additional Links
      editedEpisodeLink,
      switchedFileFrameLink,
      sourceFileLink,
      dropboxLink,
      trailerLink,
      trailerSocialLink,
      snippetsLink,
      sourceLink,
      // Clip-specific
      podcastClipStyle,
      clipTimestamp,
      clipTranscription,
    } = body;

    console.log(`[Content API] Thumbnails received:`, thumbnails);

    const properties: Record<string, unknown> = {};

    if (status) {
      properties['Status'] = { select: { name: status } };
      console.log(`[Content API] Updating status to: ${status} for content ID: ${id}`);
    }

    if (title) {
      properties['Title'] = { title: [{ text: { content: title } }] };
    }

    if (scheduledDate !== undefined) {
      properties['Scheduled Date'] = scheduledDate
        ? { date: { start: scheduledDate } }
        : { date: null };
    }

    if (contentType) {
      properties['Content Type'] = { select: { name: contentType } };
    }

    if (clientFeedback !== undefined) {
      const truncatedFeedback = clientFeedback ? clientFeedback.substring(0, 2000) : '';
      properties['Client Feedback'] = { rich_text: truncatedFeedback ? [{ text: { content: truncatedFeedback } }] : [] };
    }

    if (internalNotes !== undefined) {
      const truncatedNotes = internalNotes ? internalNotes.substring(0, 2000) : '';
      properties['Internal Notes'] = { rich_text: truncatedNotes ? [{ text: { content: truncatedNotes } }] : [] };
    }

    // Parent/child content relations
    if (parentContentId !== undefined) {
      properties['Parent Content'] = parentContentId
        ? { relation: [{ id: parentContentId }] }
        : { relation: [] }; // Allow removing parent
    }

    // URLs - validate before sending to Notion, return error for invalid URLs
    // Collect validation errors
    const urlErrors: string[] = [];

    if (briefUrl !== undefined) {
      const trimmedBriefUrl = briefUrl?.trim() || '';
      if (!trimmedBriefUrl) {
        properties['Brief URL'] = { url: null };
      } else if (isValidUrl(trimmedBriefUrl)) {
        properties['Brief URL'] = { url: trimmedBriefUrl };
      } else {
        urlErrors.push(`Brief URL is invalid (must start with http:// or https:// and be under 2000 chars)`);
      }
    }

    if (driveLink !== undefined) {
      const trimmedDriveLink = driveLink?.trim() || '';
      if (!trimmedDriveLink) {
        properties['Drive Link'] = { url: null };
      } else if (isValidUrl(trimmedDriveLink)) {
        properties['Drive Link'] = { url: trimmedDriveLink };
      } else {
        urlErrors.push(`Drive Link is invalid (must start with http:// or https:// and be under 2000 chars)`);
      }
    }

    if (frameIoLink !== undefined) {
      const trimmedFrameIoLink = frameIoLink?.trim() || '';
      if (!trimmedFrameIoLink) {
        properties['Frame.io Link'] = { url: null };
      } else if (isValidUrl(trimmedFrameIoLink)) {
        properties['Frame.io Link'] = { url: trimmedFrameIoLink };
      } else {
        urlErrors.push(`Frame.io Link is invalid (must start with http:// or https:// and be under 2000 chars)`);
      }
    }

    // Attributes (text fields)
    if (titleOptions !== undefined) {
      const truncatedTitleOptions = titleOptions ? titleOptions.substring(0, 2000) : '';
      properties['Title Options'] = { rich_text: truncatedTitleOptions ? [{ text: { content: truncatedTitleOptions } }] : [] };
    }

    if (thumbnails !== undefined) {
      // Thumbnails is now an array stored as JSON in rich_text
      const thumbArray = Array.isArray(thumbnails) ? thumbnails : (thumbnails ? [thumbnails] : []);
      const filtered = thumbArray.filter((t: string) => t && t.trim());
      console.log(`[Content API] Updating thumbnails for content ID ${id}:`, filtered);
      properties['Thumbnails'] = filtered.length > 0
        ? { rich_text: [{ text: { content: JSON.stringify(filtered) } }] }
        : { rich_text: [] };
    }

    if (description !== undefined) {
      // Truncate to Notion's 2000 char limit for rich_text
      const truncatedDesc = description ? description.substring(0, 2000) : '';
      properties['Description'] = { rich_text: truncatedDesc ? [{ text: { content: truncatedDesc } }] : [] };
    }

    if (transcription !== undefined) {
      const truncatedTranscription = transcription ? transcription.substring(0, 2000) : '';
      properties['Transcription'] = { rich_text: truncatedTranscription ? [{ text: { content: truncatedTranscription } }] : [] };
    }

    if (script !== undefined) {
      const truncatedScript = script ? script.substring(0, 2000) : '';
      properties['Script'] = { rich_text: truncatedScript ? [{ text: { content: truncatedScript } }] : [] };
    }

    if (copy !== undefined) {
      const truncatedCopy = copy ? copy.substring(0, 2000) : '';
      properties['Copy'] = { rich_text: truncatedCopy ? [{ text: { content: truncatedCopy } }] : [] };
    }

    // Additional Links - use truncated names that Notion actually uses
    // All URL fields require valid URLs or null to clear
    if (editedEpisodeLink !== undefined) {
      const trimmed = editedEpisodeLink?.trim() || '';
      if (!trimmed) {
        properties['Edited Episode D...'] = { url: null };
      } else if (isValidUrl(trimmed)) {
        properties['Edited Episode D...'] = { url: trimmed };
      } else {
        urlErrors.push(`Edited Episode Link is invalid (must start with http:// or https://)`);
      }
    }

    if (switchedFileFrameLink !== undefined) {
      const trimmed = switchedFileFrameLink?.trim() || '';
      if (!trimmed) {
        properties['Switched File Fra...'] = { url: null };
      } else if (isValidUrl(trimmed)) {
        properties['Switched File Fra...'] = { url: trimmed };
      } else {
        urlErrors.push(`Switched File Frame Link is invalid (must start with http:// or https://)`);
      }
    }

    if (sourceFileLink !== undefined) {
      const trimmed = sourceFileLink?.trim() || '';
      if (!trimmed) {
        properties['Source File Link'] = { url: null };
      } else if (isValidUrl(trimmed)) {
        properties['Source File Link'] = { url: trimmed };
      } else {
        urlErrors.push(`Source File Link is invalid (must start with http:// or https://)`);
      }
    }

    if (dropboxLink !== undefined) {
      const trimmed = dropboxLink?.trim() || '';
      if (!trimmed) {
        properties['Dropbox Link'] = { url: null };
      } else if (isValidUrl(trimmed)) {
        properties['Dropbox Link'] = { url: trimmed };
      } else {
        urlErrors.push(`Dropbox Link is invalid (must start with http:// or https://)`);
      }
    }

    if (trailerLink !== undefined) {
      const trimmed = trailerLink?.trim() || '';
      if (!trimmed) {
        properties['Trailer'] = { url: null };
      } else if (isValidUrl(trimmed)) {
        properties['Trailer'] = { url: trimmed };
      } else {
        urlErrors.push(`Trailer Link is invalid (must start with http:// or https://)`);
      }
    }

    if (trailerSocialLink !== undefined) {
      const trimmed = trailerSocialLink?.trim() || '';
      if (!trimmed) {
        properties['Trailer Social Ver...'] = { url: null };
      } else if (isValidUrl(trimmed)) {
        properties['Trailer Social Ver...'] = { url: trimmed };
      } else {
        urlErrors.push(`Trailer Social Link is invalid (must start with http:// or https://)`);
      }
    }

    if (snippetsLink !== undefined) {
      const trimmed = snippetsLink?.trim() || '';
      if (!trimmed) {
        properties['Snippets'] = { url: null };
      } else if (isValidUrl(trimmed)) {
        properties['Snippets'] = { url: trimmed };
      } else {
        urlErrors.push(`Snippets Link is invalid (must start with http:// or https://)`);
      }
    }

    if (sourceLink !== undefined) {
      const trimmed = sourceLink?.trim() || '';
      if (!trimmed) {
        properties['Source Link'] = { url: null };
      } else if (isValidUrl(trimmed)) {
        properties['Source Link'] = { url: trimmed };
      } else {
        urlErrors.push(`Source Link is invalid (must start with http:// or https://)`);
      }
    }

    // Return error if any URLs are invalid
    if (urlErrors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid URL(s)', details: urlErrors.join('; ') },
        { status: 400 }
      );
    }

    // Editor Assignment - use Select field with editor name (from Team Members database)
    // This allows assigning editors without requiring Notion workspace membership
    if (assignedEditor !== undefined) {
      properties['Assigned Editor Name'] = assignedEditor
        ? { select: { name: assignedEditor } }
        : { select: null };
    }

    // Select field assignments (hardcoded options)
    if (assignedStrategist !== undefined) {
      properties['Assigned Strategist'] = assignedStrategist
        ? { select: { name: assignedStrategist } }
        : { select: null };
    }

    if (assignedCoordinator !== undefined) {
      properties['Assigned Coordinator'] = assignedCoordinator
        ? { select: { name: assignedCoordinator } }
        : { select: null };
    }

    if (style !== undefined) {
      properties['Style'] = style
        ? { select: { name: style } }
        : { select: null };
    }

    if (editingNotes !== undefined) {
      const truncatedEditingNotes = editingNotes ? editingNotes.substring(0, 2000) : '';
      properties['Editing Notes'] = { rich_text: truncatedEditingNotes ? [{ text: { content: truncatedEditingNotes } }] : [] };
    }

    // Clip-specific fields
    if (podcastClipStyle !== undefined) {
      properties['Podcast Clip Style'] = podcastClipStyle
        ? { select: { name: podcastClipStyle } }
        : { select: null };
    }

    if (clipTimestamp !== undefined) {
      const truncatedTimestamp = clipTimestamp ? clipTimestamp.substring(0, 2000) : '';
      properties['Clip Timestamp'] = { rich_text: truncatedTimestamp ? [{ text: { content: truncatedTimestamp } }] : [] };
    }

    if (clipTranscription !== undefined) {
      const truncatedTranscription = clipTranscription ? clipTranscription.substring(0, 2000) : '';
      properties['Clip Transcription'] = { rich_text: truncatedTranscription ? [{ text: { content: truncatedTranscription } }] : [] };
    }

    // Get the current content item to compare status and scheduled date
    let previousStatus: string | undefined;
    let previousScheduledDate: string | undefined;
    let contentItem: Awaited<ReturnType<typeof getContentItem>> | null = null;

    // Fetch current content if we need to check status OR scheduled date changes
    if (status || scheduledDate !== undefined) {
      try {
        contentItem = await getContentItem(id);
        previousStatus = contentItem?.status;
        previousScheduledDate = contentItem?.scheduledDate;
      } catch (e) {
        // Continue even if we can't get the previous status
        console.warn('Could not fetch previous content status');
      }
    }

    console.log(`[Content API] Updating Notion page ${id} with properties:`, JSON.stringify(properties, null, 2));

    const response = await notion.pages.update({
      page_id: id,
      properties: properties as any,
    });

    console.log(`[Content API] Notion update successful for ${id}`);

    // Send Slack notification for important status changes
    if (status && previousStatus && status !== previousStatus && NOTIFY_STATUSES.includes(status)) {
      // Fire and forget - don't block response
      sendStatusNotification(id, contentItem, status, previousStatus).catch((err) => {
        console.error('Failed to send Slack notification:', err);
      });
    }

    // Send "Editing Needed" notification when content enters edit stage
    if (status && previousStatus && status !== previousStatus && EDITING_NEEDED_STATUSES.includes(status)) {
      sendEditingNeededNotification(id, contentItem, status).catch((err) => {
        console.error('Failed to send editing needed notification:', err);
      });
    }

    // Send "Scheduling Needed" notification when content is approved but not scheduled
    if (status && previousStatus && status !== previousStatus && SCHEDULING_NEEDED_STATUSES.includes(status)) {
      sendSchedulingNeededNotification(id, contentItem, status).catch((err) => {
        console.error('Failed to send scheduling needed notification:', err);
      });
    }

    // Auto-create or update tasks when scheduled date changes
    const currentContentType = contentType || contentItem?.contentType;
    const isNewlyScheduled = scheduledDate && !previousScheduledDate;
    const isDateChanged = scheduledDate && previousScheduledDate && scheduledDate !== previousScheduledDate;

    if (currentContentType && isNewlyScheduled) {
      // Create tasks for ANY content type when newly scheduled
      createContentScheduledTasks(
        id,
        contentItem?.clientId,
        contentItem?.title || 'Untitled',
        scheduledDate,
        currentContentType as 'Short Form' | 'YouTube' | 'Podcast'
      ).catch((err) => {
        console.error('Failed to create scheduled date tasks:', err);
      });
    } else if (currentContentType && isDateChanged) {
      // Update existing tasks when date changes
      updateContentTaskDueDates(
        id,
        scheduledDate,
        currentContentType as 'Short Form' | 'YouTube' | 'Podcast'
      ).catch((err) => {
        console.error('Failed to update task due dates:', err);
      });
    }

    // Auto-move Frame.io asset to "Posted" folder when status changes to "Scheduled"
    if (status === 'Scheduled' && previousStatus && previousStatus !== 'Scheduled') {
      const frameIoAssetId = contentItem?.frameIoAssetId;
      if (frameIoAssetId) {
        moveAssetToPosted(frameIoAssetId).then((result) => {
          if (result.success) {
            console.log(`[Content API] Moved Frame.io asset to Posted folder for content ${id}`);
            sendChannelNotification(
              'Content Moved in Frame.io',
              `*${contentItem?.title || 'Content'}* has been scheduled and moved to the "Posted" folder in Frame.io.`,
              'info'
            ).catch(console.error);
          } else {
            console.warn(`[Content API] Failed to move Frame.io asset: ${result.error}`);
          }
        }).catch((err) => {
          console.error('Failed to move Frame.io asset:', err);
        });
      }
    }

    // Revalidate all caches for instant updates
    revalidateTag('content', { expire: 0 });
    revalidateTag('pipeline', { expire: 0 });
    revalidateTag('schedule', { expire: 0 });
    revalidateTag('dashboard', { expire: 0 });
    revalidateTag('clients', { expire: 0 });
    revalidateTag('tasks', { expire: 0 });
    revalidateTag('ideas', { expire: 0 });

    // Also revalidate specific paths to ensure fresh data on navigation
    revalidatePath('/pipeline', 'page');
    revalidatePath('/schedule', 'page');
    revalidatePath('/', 'page');
    revalidatePath('/dashboard', 'page');

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error updating content:', error);
    // Return more detailed error for debugging
    const errorMessage = error?.body?.message || error?.message || 'Failed to update content';
    return NextResponse.json(
      { error: errorMessage, details: error?.body || error?.toString() },
      { status: 500 }
    );
  }
}

// Helper to truncate text to Notion's 2000 char limit for rich_text
function truncateText(text: string, maxLength: number = 2000): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Send Slack notification for status change
async function sendStatusNotification(
  contentId: string,
  contentItem: Awaited<ReturnType<typeof getContentItem>> | null,
  newStatus: string,
  previousStatus: string
): Promise<void> {
  try {
    // Get fresh content if not provided
    if (!contentItem) {
      contentItem = await getContentItem(contentId);
    }

    if (!contentItem) {
      console.warn('Could not fetch content item for notification');
      return;
    }

    // Get client info for channel
    let clientSlackChannel: string | undefined;
    if (contentItem.clientId) {
      try {
        const client = await getClient(contentItem.clientId);
        clientSlackChannel = client?.slackChannel;
      } catch (e) {
        console.warn('Could not fetch client info');
      }
    }

    // Build the notification
    // Link to pipeline page with content highlighted
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const contentUrl = appUrl ? `${appUrl}/pipeline?highlight=${contentId}` : undefined;

    const notification = buildContentStatusNotification({
      contentTitle: contentItem.title,
      contentType: contentItem.contentType,
      clientName: contentItem.clientName || 'Unknown Client',
      previousStatus,
      newStatus,
      contentUrl,
    });

    // Send to main alerts channel only (client channels are READ-ONLY)
    await sendSlackMessage(notification);
    // NOTE: Do not send to client channels - they are strictly read-only
  } catch (error) {
    console.error('Error sending status notification:', error);
  }
}

// DELETE content
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`[Content API] Deleting content: ${id}`);

    // Archive the page (Notion doesn't truly delete, it archives)
    const response = await notion.pages.update({
      page_id: id,
      archived: true,
    });

    console.log(`[Content API] Successfully deleted content: ${id}`);

    // Revalidate caches for instant UI updates
    revalidateTag('content', { expire: 0 });
    revalidateTag('pipeline', { expire: 0 });
    revalidateTag('schedule', { expire: 0 });
    revalidateTag('dashboard', { expire: 0 });
    revalidateTag('clients', { expire: 0 });
    revalidatePath('/pipeline', 'page');
    revalidatePath('/schedule', 'page');
    revalidatePath('/', 'page');

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Content API] Error deleting content:', error);
    console.error('[Content API] Error details:', error?.body || error?.message);
    return NextResponse.json(
      { error: 'Failed to delete content', details: error?.body?.message || error?.message },
      { status: 500 }
    );
  }
}

/**
 * Create tasks when content gets a scheduled date (for ALL content types)
 * This function creates tasks with reverse-engineered deadlines
 */
async function createContentScheduledTasks(
  contentId: string,
  clientId: string | undefined,
  contentTitle: string,
  scheduledDate: string,
  contentType: 'Short Form' | 'YouTube' | 'Podcast'
): Promise<void> {
  try {
    // Get client name for task titles
    let clientName: string | undefined;
    if (clientId) {
      try {
        const client = await getClient(clientId);
        clientName = client?.name;
      } catch (e) {
        console.warn('[Content API] Could not fetch client name for tasks');
      }
    }

    const tasks = await createTasksFromScheduledDate({
      contentId,
      clientId,
      clientName,
      contentTitle,
      scheduledDate,
      contentType,
    });

    // Send Slack notification about auto-created tasks
    if (tasks.length > 0) {
      const dateFormatted = new Date(scheduledDate).toLocaleDateString('en-AU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      const taskList = tasks.map(t => `• ${t.task} (Due: ${t.dueDate})`).join('\n');

      await sendChannelNotification(
        `📋 Tasks Created - ${contentType} Scheduled`,
        `*${contentTitle}*${clientName ? ` (${clientName})` : ''} is scheduled for *${dateFormatted}*.\n\n` +
        `✅ Auto-created ${tasks.length} tasks:\n${taskList}`,
        'info'
      );
    }

    console.log(`[Content API] Created ${tasks.length} tasks for ${contentType} "${contentTitle}"${clientName ? ` (Client: ${clientName})` : ''}`);
  } catch (error) {
    console.error(`[Content API] Error creating tasks for ${contentType}:`, error);
    throw error;
  }
}

/**
 * Update task due dates when content scheduled date changes
 * Recalculates all associated task deadlines based on the new date
 */
async function updateContentTaskDueDates(
  contentId: string,
  newScheduledDate: string,
  contentType: 'Short Form' | 'YouTube' | 'Podcast'
): Promise<void> {
  try {
    const updatedTasks = await updateTasksDueDatesForContent({
      contentId,
      newScheduledDate,
      contentType,
    });

    // Send Slack notification about updated tasks
    if (updatedTasks.length > 0) {
      const dateFormatted = new Date(newScheduledDate).toLocaleDateString('en-AU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      const taskList = updatedTasks.map(t => `• ${t.task} (New Due: ${t.dueDate})`).join('\n');

      await sendChannelNotification(
        `${contentType} Date Changed`,
        `Content date moved to *${dateFormatted}*.\n\n` +
        `Updated ${updatedTasks.length} task due dates:\n${taskList}`,
        'info'
      );
    }

    console.log(`[Content API] Updated ${updatedTasks.length} task due dates for content ${contentId}`);
  } catch (error) {
    console.error(`[Content API] Error updating task due dates:`, error);
    throw error;
  }
}

/**
 * Send Slack notification when content enters the editing stage
 * Triggers for: Filmed, PC Feedback (consistent across all content types)
 */
async function sendEditingNeededNotification(
  contentId: string,
  contentItem: Awaited<ReturnType<typeof getContentItem>> | null,
  newStatus: string
): Promise<void> {
  try {
    if (!contentItem) {
      contentItem = await getContentItem(contentId);
    }

    if (!contentItem) {
      console.warn('Could not fetch content item for editing notification');
      return;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const contentUrl = appUrl ? `${appUrl}/pipeline?highlight=${contentId}` : undefined;

    const emoji = contentItem.contentType === 'Short Form' ? '📱' :
                  contentItem.contentType === 'YouTube' ? '🎬' : '🎙️';

    // Build a descriptive message based on status
    let actionText = 'is ready for editing';
    if (newStatus === 'Filmed') {
      actionText = 'has been filmed and is ready for editing';
    } else if (newStatus === 'PC Feedback') {
      actionText = 'is ready for PC review';
    }

    const message = `${emoji} *${contentItem.title}*\n` +
      `Client: ${contentItem.clientName || 'Unknown'}\n` +
      `Type: ${contentItem.contentType}\n\n` +
      `This content ${actionText}.` +
      (contentUrl ? `\n\n<${contentUrl}|View in Pipeline>` : '');

    await sendChannelNotification(
      '✂️ Editing Work Needed',
      message,
      'info'
    );

    console.log(`[Content API] Sent editing needed notification for "${contentItem.title}"`);
  } catch (error) {
    console.error('[Content API] Error sending editing needed notification:', error);
  }
}

/**
 * Send Slack notification when content is approved and needs scheduling
 * Triggers for: Approved (Short Form), To Schedule (YouTube/Podcast)
 */
async function sendSchedulingNeededNotification(
  contentId: string,
  contentItem: Awaited<ReturnType<typeof getContentItem>> | null,
  newStatus: string
): Promise<void> {
  try {
    if (!contentItem) {
      contentItem = await getContentItem(contentId);
    }

    if (!contentItem) {
      console.warn('Could not fetch content item for scheduling notification');
      return;
    }

    // Only send scheduling needed if not already scheduled
    if (contentItem.scheduledDate) {
      console.log(`[Content API] Content "${contentItem.title}" already has scheduled date, skipping scheduling notification`);
      return;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const contentUrl = appUrl ? `${appUrl}/pipeline?highlight=${contentId}` : undefined;

    const emoji = contentItem.contentType === 'Short Form' ? '📱' :
                  contentItem.contentType === 'YouTube' ? '🎬' : '🎙️';

    const message = `${emoji} *${contentItem.title}*\n` +
      `Client: ${contentItem.clientName || 'Unknown'}\n` +
      `Type: ${contentItem.contentType}\n\n` +
      `This content has been approved and is *ready to be scheduled*.` +
      (contentUrl ? `\n\n<${contentUrl}|View in Pipeline>` : '');

    await sendChannelNotification(
      '📅 Scheduling Needed',
      message,
      'warning'
    );

    console.log(`[Content API] Sent scheduling needed notification for "${contentItem.title}"`);
  } catch (error) {
    console.error('[Content API] Error sending scheduling needed notification:', error);
  }
}

