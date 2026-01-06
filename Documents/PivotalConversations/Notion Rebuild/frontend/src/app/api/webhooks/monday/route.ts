import { NextRequest, NextResponse } from 'next/server';
import {
  MondayWebhookPayload,
  verifyMondayWebhook,
  isSocialTeamHandover,
  inferContentType,
  extractClientName,
} from '@/lib/monday/client';
import { findClientByName } from '@/lib/notion/clients';
import { createContent } from '@/lib/notion/content';
import { sendSlackMessage } from '@/lib/slack/client';
import { ContentType } from '@/types';

/**
 * Monday.com Webhook Handler
 *
 * Triggers when "Handover Team" column changes to "Social Team" on the Handover Management board.
 * Creates content in the Pipeline with status "Filmed" and sends a Slack notification.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    console.log('Monday.com webhook received:', body);
    const payload = JSON.parse(body) as MondayWebhookPayload;

    // Handle URL verification challenge (required by Monday.com)
    const verification = verifyMondayWebhook(payload);
    if (verification.isChallenge) {
      console.log('Monday.com webhook verification challenge received');
      return NextResponse.json({ challenge: verification.challenge });
    }

    // Check if this is a "Handover Team → Social Team" change
    if (!isSocialTeamHandover(payload)) {
      // Not the event we're looking for, acknowledge and exit
      console.log('Event ignored - not Social Team handover:', payload.event);
      return NextResponse.json({ ok: true, message: 'Event ignored - not Social Team handover' });
    }

    // Process the handover synchronously (must complete before function terminates)
    // Monday.com has a 30 second timeout, so we need to be fast
    const result = await processMondayHandover(payload);

    return NextResponse.json({ ok: true, message: 'Handover processed', result });
  } catch (error) {
    console.error('Monday.com webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Process a Monday.com handover event
 * - Uses webhook payload data directly (no additional API call needed)
 * - Matches client by name
 * - Creates content in Pipeline
 * - Sends Slack notification
 */
async function processMondayHandover(payload: MondayWebhookPayload): Promise<{ success: boolean; contentId?: string; error?: string }> {
  const { event } = payload;
  const itemId = String(event.pulseId);
  const itemName = event.pulseName;

  console.log(`Processing Monday.com handover for item: ${itemName} (ID: ${itemId})`);

  try {
    // Extract client name from item name (e.g., "test - ella cass" → "ella cass" or "test")
    const clientNameFromItem = extractClientName(itemName);
    console.log(`Extracted client name: "${clientNameFromItem}" from "${itemName}"`);

    // Find matching client in Notion
    const client = await findClientByName(clientNameFromItem);
    if (!client) {
      console.error(`No matching client found for name: "${clientNameFromItem}"`);

      // Send Slack notification about unmatched client and store alert
      await sendSlackMessage(
        {
          text: `⚠️ Monday.com handover could not be processed - no matching client found`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `:warning: *Monday.com Handover - Client Not Found*\n\nA handover was marked as "Social Team" but no matching client was found in the system.`,
              },
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Item Name:*\n${itemName}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Extracted Name:*\n${clientNameFromItem}`,
                },
              ],
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `_Please manually create this content or check client name spelling._`,
                },
              ],
            },
          ],
        },
        {
          title: `Monday.com Handover Failed: Client Not Found`,
          type: 'warning',
          priority: 'high',
        }
      );
      return { success: false, error: `Client not found: ${clientNameFromItem}` };
    }

    console.log(`Matched client: ${client.name} (ID: ${client.id})`);

    // Determine content type from item name
    const contentType: ContentType = inferContentType(itemName);
    console.log(`Inferred content type: ${contentType}`);

    // Determine the correct initial status based on content type
    // All content types now use "Filmed" as the initial stage for consistency
    const initialStatus = 'Filmed';
    console.log(`Using initial status: ${initialStatus} for ${contentType}`);

    // Create content in the Pipeline
    // No scheduled date - will be scheduled manually
    const content = await createContent({
      title: itemName,
      contentType,
      clientId: client.id,
      status: initialStatus,
    });

    console.log(`Created content: ${content.id} - "${content.title}" for ${client.name}`);

    // Send Slack notification about new content and store alert
    await sendSlackMessage(
      {
        text: `🎬 New ${contentType} content created from Monday.com handover`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🎬 Monday.com Handover → Pipeline',
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `New content has been created in the *${contentType}* pipeline from a Monday.com handover.`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Content:*\n${itemName}`,
              },
              {
                type: 'mrkdwn',
                text: `*Client:*\n${client.name}`,
              },
            ],
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Status:*\n${initialStatus}`,
              },
              {
                type: 'mrkdwn',
                text: `*Type:*\n${contentType}`,
              },
            ],
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `_Automatically created from Monday.com Handover Management board_`,
              },
            ],
          },
        ],
      },
      {
        title: `Monday.com Handover: ${itemName}`,
        type: 'info',
        priority: 'normal',
        clientId: client.id,
        relatedEntityId: content.id,
        relatedEntityType: 'content',
      }
    );

    console.log(`Successfully processed Monday.com handover for ${client.name}`);
    return { success: true, contentId: content.id };
  } catch (error) {
    console.error('Error processing Monday.com handover:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Send error notification to Slack and store alert
    await sendSlackMessage(
      {
        text: `❌ Error processing Monday.com handover for "${itemName}"`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:x: *Monday.com Handover Error*\n\nFailed to process handover for "${itemName}".\n\nError: ${errorMessage}`,
            },
          },
        ],
      },
      {
        title: `Monday.com Handover Error: ${itemName}`,
        type: 'error',
        priority: 'high',
      }
    );

    return { success: false, error: errorMessage };
  }
}
