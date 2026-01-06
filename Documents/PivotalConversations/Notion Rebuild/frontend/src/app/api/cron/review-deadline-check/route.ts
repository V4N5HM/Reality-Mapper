import { NextRequest, NextResponse } from 'next/server';
import { getContent } from '@/lib/notion/content';
import { getClients } from '@/lib/notion/clients';
import { sendSlackMessage } from '@/lib/slack/client';
import { Content, ContentStatus } from '@/types';

/**
 * Review Deadline Automation
 *
 * Per spec:
 * - Trigger: When YouTube/Podcast content is within 72 hours of Scheduled Date
 *   and Status is before "To Schedule"
 * - Action: Send Slack alert with content link
 *
 * Runs twice daily (8am and 2pm) via Vercel cron
 */

// Statuses that are considered "not ready" (before To Schedule)
const NOT_READY_STATUSES_YOUTUBE: ContentStatus[] = [
  'Research',
  'Brief',
  'To Shoot',
  'Filmed',
  'Edit',
  'Thumbnail Design',
  'PC Review',
  'Client Review',
];

const NOT_READY_STATUSES_PODCAST: ContentStatus[] = [
  'Guest Booked',
  'Research',
  'Brief',
  'Filmed',
  'Edit',
  'Thumbnail Design',
  'PC Review',
  'Client Review',
  'Final Review',
];

interface AtRiskContent {
  content: Content;
  hoursUntilDeadline: number;
  clientName: string;
}

/**
 * Find content at risk of missing deadlines
 */
function findAtRiskContent(
  content: Content[],
  clientMap: Map<string, string>,
  hoursThreshold: number = 72
): AtRiskContent[] {
  const now = new Date();
  const atRisk: AtRiskContent[] = [];

  for (const item of content) {
    // Skip if no scheduled date
    if (!item.scheduledDate) continue;

    // Only check YouTube and Podcast content
    if (item.contentType !== 'YouTube' && item.contentType !== 'Podcast') continue;

    // Check if status is "not ready"
    const notReadyStatuses =
      item.contentType === 'YouTube' ? NOT_READY_STATUSES_YOUTUBE : NOT_READY_STATUSES_PODCAST;

    if (!notReadyStatuses.includes(item.status)) continue;

    // Calculate hours until deadline
    const scheduledDate = new Date(item.scheduledDate);
    const msUntilDeadline = scheduledDate.getTime() - now.getTime();
    const hoursUntilDeadline = msUntilDeadline / (1000 * 60 * 60);

    // Only include if within threshold and not already past
    if (hoursUntilDeadline > 0 && hoursUntilDeadline <= hoursThreshold) {
      atRisk.push({
        content: item,
        hoursUntilDeadline: Math.round(hoursUntilDeadline),
        clientName: clientMap.get(item.clientId || '') || 'Unknown Client',
      });
    }
  }

  // Sort by urgency (closest deadline first)
  return atRisk.sort((a, b) => a.hoursUntilDeadline - b.hoursUntilDeadline);
}

/**
 * Send Slack alert for at-risk content
 */
async function sendDeadlineAlerts(atRiskContent: AtRiskContent[]): Promise<boolean> {
  if (atRiskContent.length === 0) return true;

  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🚨 Content Deadline Alert',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${atRiskContent.length} piece(s) of content* scheduled within 72 hours but not ready!\n_These need immediate attention to meet the deadline._`,
      },
    },
    {
      type: 'divider',
    },
  ];

  // Group by urgency level
  const critical = atRiskContent.filter((c) => c.hoursUntilDeadline <= 24);
  const warning = atRiskContent.filter(
    (c) => c.hoursUntilDeadline > 24 && c.hoursUntilDeadline <= 48
  );
  const attention = atRiskContent.filter((c) => c.hoursUntilDeadline > 48);

  // Critical (< 24 hours)
  if (critical.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:rotating_light: *CRITICAL - Less than 24 hours (${critical.length})*`,
      },
    });

    for (const item of critical) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `• *${item.content.title}* (${item.content.contentType})\n  Client: ${item.clientName} | Status: ${item.content.status}\n  ⏰ *${item.hoursUntilDeadline}h until deadline*`,
        },
      });
    }
  }

  // Warning (24-48 hours)
  if (warning.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:warning: *WARNING - 24-48 hours (${warning.length})*`,
      },
    });

    for (const item of warning) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `• *${item.content.title}* (${item.content.contentType})\n  Client: ${item.clientName} | Status: ${item.content.status}\n  ⏰ ${item.hoursUntilDeadline}h until deadline`,
        },
      });
    }
  }

  // Attention (48-72 hours)
  if (attention.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:clock3: *ATTENTION - 48-72 hours (${attention.length})*`,
      },
    });

    for (const item of attention.slice(0, 5)) {
      // Limit to 5
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `• *${item.content.title}* (${item.content.contentType})\n  Client: ${item.clientName} | Status: ${item.content.status}\n  ⏰ ${item.hoursUntilDeadline}h until deadline`,
        },
      });
    }

    if (attention.length > 5) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `_...and ${attention.length - 5} more_`,
          },
        ],
      });
    }
  }

  // Add action reminder
  blocks.push({
    type: 'divider',
  });
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `_Per workflow rules: YouTube/Podcast content must be ready at least 72 hours before release._`,
    },
  });
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `_Generated by Review Deadline Automation at ${new Date().toLocaleTimeString('en-AU')}_`,
      },
    ],
  });

  const result = await sendSlackMessage({
    text: `Content Deadline Alert: ${atRiskContent.length} piece(s) at risk`,
    blocks,
  });

  return result.success;
}

/**
 * POST /api/cron/review-deadline-check
 * Check for content at risk of missing deadlines
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret if configured
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      if (process.env.NODE_ENV === 'production' && !authHeader?.includes('Bearer')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('[Review Deadline Check] Starting check');

    // Get content scheduled in the next 3 days
    const now = new Date();
    const threeDaysAhead = new Date(now);
    threeDaysAhead.setDate(now.getDate() + 3);

    const dateFrom = now.toISOString().split('T')[0];
    const dateTo = threeDaysAhead.toISOString().split('T')[0];

    const [content, clients] = await Promise.all([
      getContent({ dateFrom, dateTo, limit: 0 }),
      getClients('Active'),
    ]);

    // Create client lookup map
    const clientMap = new Map<string, string>();
    clients.forEach((c) => clientMap.set(c.id, c.name));

    // Find at-risk content
    const atRisk = findAtRiskContent(content, clientMap, 72);

    console.log(`[Review Deadline Check] Found ${atRisk.length} at-risk content items`);

    // Send alerts if any at-risk content
    let alertSent = false;
    if (atRisk.length > 0) {
      alertSent = await sendDeadlineAlerts(atRisk);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      contentChecked: content.length,
      atRiskCount: atRisk.length,
      alertSent,
      atRiskContent: atRisk.map((c) => ({
        title: c.content.title,
        contentType: c.content.contentType,
        status: c.content.status,
        clientName: c.clientName,
        hoursUntilDeadline: c.hoursUntilDeadline,
      })),
    });
  } catch (error) {
    console.error('[Review Deadline Check] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check review deadlines' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/review-deadline-check
 * Run check and send alerts (used by Vercel cron) or preview with ?preview=true
 */
export async function GET(request: NextRequest) {
  const isPreview = request.nextUrl.searchParams.get('preview') === 'true';

  // If not preview, this is a cron call - delegate to POST logic
  if (!isPreview) {
    return POST(request);
  }

  // Preview mode - just return data without sending alerts
  try {
    const now = new Date();
    const threeDaysAhead = new Date(now);
    threeDaysAhead.setDate(now.getDate() + 3);

    const dateFrom = now.toISOString().split('T')[0];
    const dateTo = threeDaysAhead.toISOString().split('T')[0];

    const [content, clients] = await Promise.all([
      getContent({ dateFrom, dateTo, limit: 0 }),
      getClients('Active'),
    ]);

    const clientMap = new Map<string, string>();
    clients.forEach((c) => clientMap.set(c.id, c.name));

    const atRisk = findAtRiskContent(content, clientMap, 72);

    return NextResponse.json({
      preview: true,
      timestamp: new Date().toISOString(),
      contentChecked: content.length,
      atRiskCount: atRisk.length,
      atRiskContent: atRisk.map((c) => ({
        id: c.content.id,
        title: c.content.title,
        contentType: c.content.contentType,
        status: c.content.status,
        clientName: c.clientName,
        clientId: c.content.clientId,
        scheduledDate: c.content.scheduledDate,
        hoursUntilDeadline: c.hoursUntilDeadline,
      })),
    });
  } catch (error) {
    console.error('[Review Deadline Check] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check review deadlines' },
      { status: 500 }
    );
  }
}
