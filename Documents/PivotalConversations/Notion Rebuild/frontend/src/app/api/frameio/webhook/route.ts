import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, getAsset, FrameioWebhookPayload } from '@/lib/frameio/client';
import { getContent, updateContentFrameIo, getContentByFrameIoAssetId } from '@/lib/notion/content';
import { getClients } from '@/lib/notion/clients';
import { sendChannelNotification } from '@/lib/slack/client';

const FRAMEIO_WEBHOOK_SECRET = process.env.FRAMEIO_WEBHOOK_SECRET;

/**
 * Frame.io Webhook Handler
 *
 * Workflow:
 * 1. Editor uploads video to "To Be Posted" folder in Frame.io
 * 2. Frame.io sends webhook (asset.ready or asset.created)
 * 3. We match by EXACT TITLE (cleaned) to find existing content in Notion
 * 4. Update content with Frame.io link/asset ID and move to "PC Feedback"
 * 5. If no match, notify team
 *
 * IMPORTANT: Editors must name Frame.io files exactly as the content title in Notion
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-frameio-signature') || '';

    // Verify webhook signature if secret is configured
    if (FRAMEIO_WEBHOOK_SECRET && signature) {
      const isValid = verifyWebhookSignature(rawBody, signature, FRAMEIO_WEBHOOK_SECRET);
      if (!isValid) {
        console.error('[Frame.io Webhook] Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload: FrameioWebhookPayload = JSON.parse(rawBody);
    console.log(`[Frame.io Webhook] Received event: ${payload.type}`, payload.resource);

    // Handle asset.ready event (video finished transcoding)
    if (payload.type === 'asset.ready' || payload.type === 'asset.created') {
      await handleAssetReady(payload);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Frame.io Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Handle GET for webhook verification
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get('challenge');
  if (challenge) {
    return NextResponse.json({ challenge });
  }
  return NextResponse.json({ status: 'Frame.io webhook endpoint active' });
}

/**
 * Handle asset.ready event - video finished transcoding
 * Match by title to existing content and update with Frame.io info
 */
async function handleAssetReady(payload: FrameioWebhookPayload) {
  try {
    // Get full asset details
    const asset = await getAsset(payload.resource.id);

    // Only process video files
    if (asset.type !== 'file') {
      console.log(`[Frame.io Webhook] Skipping non-file asset: ${asset.name}`);
      return;
    }

    // Skip if not a video (check filetype if available)
    if (asset.filetype && !asset.filetype.startsWith('video/') && !asset.filetype.includes('video')) {
      console.log(`[Frame.io Webhook] Skipping non-video asset: ${asset.name} (${asset.filetype})`);
      return;
    }

    // Check if parent folder is a "To Be Posted" folder
    if (!asset.parent_id) {
      console.log(`[Frame.io Webhook] Asset has no parent folder: ${asset.name}`);
      return;
    }

    const parentFolder = await getAsset(asset.parent_id);
    const folderName = parentFolder.name.toLowerCase();

    // Check if this is a "To Be Posted" folder (handle uppercase "TO BE POSTED")
    const folderNameTrimmed = folderName.trim();
    const isToBePosted =
      folderNameTrimmed === 'to be posted' ||
      folderNameTrimmed.includes('to be posted') ||
      folderNameTrimmed.includes('to_be_posted') ||
      folderNameTrimmed.includes('tobeposted') ||
      folderNameTrimmed === 'tbp' ||
      folderNameTrimmed === 'ready to post' ||
      folderNameTrimmed === 'ready_to_post';

    if (!isToBePosted) {
      console.log(`[Frame.io Webhook] Asset not in "To Be Posted" folder: ${asset.name} (folder: ${parentFolder.name})`);
      return;
    }

    // Check if we already processed this asset
    const existingByAssetId = await getContentByFrameIoAssetId(asset.id);
    if (existingByAssetId) {
      console.log(`[Frame.io Webhook] Asset already processed: ${asset.name}`);
      return;
    }

    // Clean the asset name to get the title to match
    const cleanedTitle = cleanAssetName(asset.name);
    const frameIoUrl = `https://app.frame.io/player/${asset.id}`;

    // Try to determine client from folder structure
    // Typically: Project > Client Folder > To Be Posted > Asset
    let clientName: string | null = null;
    let clientId: string | null = null;

    if (parentFolder.parent_id) {
      const grandparentFolder = await getAsset(parentFolder.parent_id);
      if (grandparentFolder.type === 'folder') {
        clientName = grandparentFolder.name;

        // Find matching client in Notion
        const clients = await getClients('Active');
        const matchedClient = clients.find(c =>
          c.name.toLowerCase() === clientName!.toLowerCase() ||
          c.name.toLowerCase().includes(clientName!.toLowerCase()) ||
          clientName!.toLowerCase().includes(c.name.toLowerCase())
        );

        if (matchedClient) {
          clientId = matchedClient.id;
        }
      }
    }

    // Search for content with matching title
    let matchedContent = null;

    if (clientId) {
      // Search within the client's content first
      const clientContent = await getContent({ clientId, limit: 500 });
      matchedContent = findMatchingContent(clientContent, cleanedTitle);
    }

    // If not found in client content, search all recent content
    if (!matchedContent) {
      const recentContent = await getContent({ limit: 500 });
      matchedContent = findMatchingContent(recentContent, cleanedTitle);
    }

    if (matchedContent) {
      // Found a match! Update with Frame.io info and move to PC Feedback
      await updateContentFrameIo(matchedContent.id, {
        frameIoLink: frameIoUrl,
        frameIoAssetId: asset.id,
        status: 'PC Feedback',
      });

      console.log(`[Frame.io Webhook] Matched and updated content: "${matchedContent.title}" → PC Feedback`);

      // Send success notification
      await sendChannelNotification(
        'Content Uploaded to Frame.io',
        `*${matchedContent.title}* has been uploaded to Frame.io and moved to PC Feedback.\n\n` +
        `• Client: ${matchedContent.clientName || 'Unknown'}\n` +
        `• Content Type: ${matchedContent.contentType}\n` +
        `• Frame.io: ${frameIoUrl}`,
        'info'
      );
    } else {
      // No match found - notify team
      console.log(`[Frame.io Webhook] No matching content found for: "${cleanedTitle}"`);

      await sendChannelNotification(
        'Frame.io Upload - No Match Found',
        `A video was uploaded to Frame.io but no matching content was found in Notion.\n\n` +
        `• File name: *${asset.name}*\n` +
        `• Cleaned title: *${cleanedTitle}*\n` +
        `• Client folder: ${clientName || 'Unknown'}\n` +
        `• Frame.io: ${frameIoUrl}\n\n` +
        `_Please ensure the file name exactly matches the content title in Notion._`,
        'warning'
      );
    }

  } catch (error) {
    console.error('[Frame.io Webhook] Error handling asset ready:', error);
    throw error;
  }
}

/**
 * Find content matching the given title
 * Uses exact match after cleaning both titles
 */
function findMatchingContent(contentList: any[], searchTitle: string): any | null {
  const normalizedSearch = normalizeTitle(searchTitle);

  for (const content of contentList) {
    const normalizedContentTitle = normalizeTitle(content.title);

    // Exact match (after normalization)
    if (normalizedContentTitle === normalizedSearch) {
      return content;
    }
  }

  // If no exact match, try fuzzy match (one contains the other)
  for (const content of contentList) {
    const normalizedContentTitle = normalizeTitle(content.title);

    if (normalizedContentTitle.includes(normalizedSearch) ||
        normalizedSearch.includes(normalizedContentTitle)) {
      return content;
    }
  }

  return null;
}

/**
 * Normalize title for comparison
 * Removes special characters, extra spaces, makes lowercase
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ')        // Normalize spaces
    .trim();
}

/**
 * Clean asset filename to use as search title
 * Removes file extensions, underscores, etc.
 */
function cleanAssetName(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, '') // Remove file extension
    .replace(/_/g, ' ')       // Replace underscores with spaces
    .replace(/-/g, ' ')       // Replace hyphens with spaces
    .replace(/\s+/g, ' ')     // Normalize multiple spaces
    .trim();
}
