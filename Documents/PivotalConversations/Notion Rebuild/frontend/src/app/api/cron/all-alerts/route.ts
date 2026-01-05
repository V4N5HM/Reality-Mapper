import { NextRequest, NextResponse } from 'next/server';
import { getClients } from '@/lib/notion/clients';
import { getContent } from '@/lib/notion/content';
import { sendSlackMessage } from '@/lib/slack/client';

/**
 * Unified Cron Job - Runs all alert systems
 *
 * This endpoint consolidates all cron jobs into one to stay within
 * Vercel's free tier limit of 2 cron jobs.
 *
 * Runs daily at 9pm UTC (8am AEDT Melbourne time)
 *
 * Jobs included:
 * 1. Pipeline Health Check - alerts when client has <5 days of scheduled content
 * 2. Review Deadline Check - alerts for content approaching deadlines
 * 3. Task Reminders - 3-day and 24-hour reminders (only for weekly/monthly tasks)
 * 4. Monthly Content Summary - summary of scheduled/filmed content per client
 * 5. Fireflies Crawl - process meeting transcripts
 * 6. Slack Channel Crawl - extract case notes from Slack
 * 7. Check-in Email - weekday morning check-ins (only runs Mon-Fri)
 */

interface JobResult {
  job: string;
  success: boolean;
  data?: unknown;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

// Verify cron secret
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured');
    return true; // Allow in development
  }

  return authHeader === `Bearer ${cronSecret}`;
}

// Helper to call internal API endpoints
async function callInternalEndpoint(
  baseUrl: string,
  path: string,
  method: 'GET' | 'POST' = 'GET',
  cronSecret?: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(cronSecret ? { 'Authorization': `Bearer ${cronSecret}` } : {}),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || `HTTP ${response.status}` };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Check pipeline health for all clients
 * Alert when a client has less than 5 days of scheduled content remaining
 */
async function runPipelineHealthCheck(): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const [clients, allContent] = await Promise.all([
      getClients('Active'),
      getContent({ limit: 500 }),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fiveDaysFromNow = new Date(today);
    fiveDaysFromNow.setDate(today.getDate() + 5);

    const clientsAtRisk: Array<{
      name: string;
      daysOfContentRemaining: number;
      scheduledCount: number;
    }> = [];

    for (const client of clients) {
      // Get scheduled content for this client in the next 5 days
      const clientContent = allContent.filter(c =>
        c.clientId === client.id &&
        c.scheduledDate &&
        ['Approved', 'Scheduled', 'To Schedule', 'Live', 'Posted'].includes(c.status)
      );

      // Find the furthest scheduled date
      const futureDates = clientContent
        .map(c => new Date(c.scheduledDate!))
        .filter(d => d >= today)
        .sort((a, b) => b.getTime() - a.getTime());

      let daysRemaining = 0;
      if (futureDates.length > 0) {
        daysRemaining = Math.ceil((futureDates[0].getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Content scheduled in the next 5 days
      const contentNext5Days = clientContent.filter(c => {
        const date = new Date(c.scheduledDate!);
        return date >= today && date <= fiveDaysFromNow;
      }).length;

      // Alert if less than 5 days of content remaining
      if (daysRemaining < 5) {
        clientsAtRisk.push({
          name: client.name,
          daysOfContentRemaining: daysRemaining,
          scheduledCount: contentNext5Days,
        });
      }
    }

    // Send Slack alert if there are clients at risk
    if (clientsAtRisk.length > 0) {
      const blocks: any[] = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚠️ Pipeline Alert - Low Content Warning',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${clientsAtRisk.length} client(s)* have less than 5 days of scheduled content remaining:`,
          },
        },
        {
          type: 'divider',
        },
      ];

      for (const client of clientsAtRisk) {
        const emoji = client.daysOfContentRemaining === 0 ? '🔴' : client.daysOfContentRemaining <= 2 ? '🟠' : '🟡';
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji} *${client.name}*\n• Days of content remaining: ${client.daysOfContentRemaining}\n• Content in next 5 days: ${client.scheduledCount}`,
          },
        });
      }

      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `_Generated by Pipeline Health Check at ${new Date().toLocaleTimeString('en-AU')}_`,
          },
        ],
      });

      await sendSlackMessage({
        text: `Pipeline Alert: ${clientsAtRisk.length} client(s) with low content`,
        blocks,
      });
    }

    return {
      success: true,
      data: {
        totalClients: clients.length,
        clientsAtRisk: clientsAtRisk.length,
        details: clientsAtRisk,
      },
    };
  } catch (error) {
    console.error('[Pipeline Health Check] Error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Monthly content summary for all clients
 * Shows scheduled and filmed content counts for the current month
 */
async function runMonthlyContentSummary(): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const [clients, allContent] = await Promise.all([
      getClients('Active'),
      getContent({ limit: 500 }),
    ]);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthName = now.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

    const clientSummaries: Array<{
      name: string;
      scheduled: { shortForm: number; youtube: number; podcast: number };
      filmed: { shortForm: number; youtube: number; podcast: number };
    }> = [];

    for (const client of clients) {
      const clientContent = allContent.filter(c => c.clientId === client.id);

      // Scheduled content this month (has scheduled date in current month)
      const scheduledThisMonth = clientContent.filter(c => {
        if (!c.scheduledDate) return false;
        const date = new Date(c.scheduledDate);
        return date >= monthStart && date <= monthEnd;
      });

      // Filmed content this month (status is Filmed or further, created/modified this month)
      const filmedStatuses = ['Filmed', 'Edit', 'PC Review', 'PC Feedback', 'Client Review', 'Client Feedback', 'Approved', 'To Schedule', 'Scheduled', 'Posted', 'Live'];
      const filmedThisMonth = clientContent.filter(c => filmedStatuses.includes(c.status));

      const scheduled = {
        shortForm: scheduledThisMonth.filter(c => c.contentType === 'Short Form').length,
        youtube: scheduledThisMonth.filter(c => c.contentType === 'YouTube').length,
        podcast: scheduledThisMonth.filter(c => c.contentType === 'Podcast').length,
      };

      const filmed = {
        shortForm: filmedThisMonth.filter(c => c.contentType === 'Short Form').length,
        youtube: filmedThisMonth.filter(c => c.contentType === 'YouTube').length,
        podcast: filmedThisMonth.filter(c => c.contentType === 'Podcast').length,
      };

      // Only include clients with some content
      if (scheduled.shortForm + scheduled.youtube + scheduled.podcast > 0 ||
          filmed.shortForm + filmed.youtube + filmed.podcast > 0) {
        clientSummaries.push({
          name: client.name,
          scheduled,
          filmed,
        });
      }
    }

    // Send monthly summary to Slack
    if (clientSummaries.length > 0) {
      const blocks: any[] = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `📊 Monthly Content Summary - ${monthName}`,
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Content overview for *${clientSummaries.length} active clients*:`,
          },
        },
        {
          type: 'divider',
        },
      ];

      for (const client of clientSummaries.slice(0, 10)) { // Limit to 10 clients to avoid message overflow
        const scheduledTotal = client.scheduled.shortForm + client.scheduled.youtube + client.scheduled.podcast;
        const filmedTotal = client.filmed.shortForm + client.filmed.youtube + client.filmed.podcast;

        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${client.name}*\n` +
              `📅 Scheduled: ${scheduledTotal} (SF: ${client.scheduled.shortForm} | YT: ${client.scheduled.youtube} | Pod: ${client.scheduled.podcast})\n` +
              `🎬 Filmed: ${filmedTotal} (SF: ${client.filmed.shortForm} | YT: ${client.filmed.youtube} | Pod: ${client.filmed.podcast})`,
          },
        });
      }

      if (clientSummaries.length > 10) {
        blocks.push({
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `_...and ${clientSummaries.length - 10} more clients_`,
            },
          ],
        });
      }

      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `_Generated by Monthly Content Summary at ${new Date().toLocaleTimeString('en-AU')}_`,
          },
        ],
      });

      await sendSlackMessage({
        text: `Monthly Content Summary: ${clientSummaries.length} clients`,
        blocks,
      });
    }

    return {
      success: true,
      data: {
        month: monthName,
        clientCount: clientSummaries.length,
        summaries: clientSummaries,
      },
    };
  } catch (error) {
    console.error('[Monthly Content Summary] Error:', error);
    return { success: false, error: String(error) };
  }
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const baseUrl = new URL(request.url).origin;
  const cronSecret = process.env.CRON_SECRET;
  const results: JobResult[] = [];

  console.log('[All Alerts Cron] Starting unified cron job run');

  // Check if it's a weekday for check-in email
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

  // 1. Pipeline Health Check (alerts when <5 days content remaining)
  console.log('[All Alerts Cron] Running: Pipeline Health Check');
  const pipelineResult = await runPipelineHealthCheck();
  results.push({
    job: 'pipeline-check',
    success: pipelineResult.success,
    data: pipelineResult.data,
    error: pipelineResult.error,
  });

  // 2. Review Deadline Check
  console.log('[All Alerts Cron] Running: Review Deadline Check');
  const deadlineResult = await callInternalEndpoint(
    baseUrl,
    '/api/cron/review-deadline-check',
    'POST',
    cronSecret
  );
  results.push({
    job: 'review-deadline-check',
    success: deadlineResult.success,
    data: deadlineResult.data,
    error: deadlineResult.error,
  });

  // DISABLED: Daily Task Alerts (not needed)
  results.push({
    job: 'daily-task-alerts',
    success: true,
    skipped: true,
    skipReason: 'Disabled - daily task alerts not required',
  });

  // 3. Task Reminders (only for weekly/monthly tasks, not daily/urgent)
  console.log('[All Alerts Cron] Running: Task Reminders');
  const remindersResult = await callInternalEndpoint(
    baseUrl,
    '/api/slack/reminders',
    'POST',
    cronSecret
  );
  results.push({
    job: 'task-reminders',
    success: remindersResult.success,
    data: remindersResult.data,
    error: remindersResult.error,
  });

  // 4. Monthly Content Summary (replaces deliverables tracker)
  console.log('[All Alerts Cron] Running: Monthly Content Summary');
  const summaryResult = await runMonthlyContentSummary();
  results.push({
    job: 'monthly-content-summary',
    success: summaryResult.success,
    data: summaryResult.data,
    error: summaryResult.error,
  });

  // 5. Fireflies Crawl
  console.log('[All Alerts Cron] Running: Fireflies Crawl');
  const firefliesResult = await callInternalEndpoint(
    baseUrl,
    '/api/cron/fireflies-crawl',
    'GET',
    cronSecret
  );
  results.push({
    job: 'fireflies-crawl',
    success: firefliesResult.success,
    data: firefliesResult.data,
    error: firefliesResult.error,
  });

  // 6. Slack Channel Crawl
  console.log('[All Alerts Cron] Running: Slack Channel Crawl');
  const slackCrawlResult = await callInternalEndpoint(
    baseUrl,
    '/api/slack/crawl/scheduled',
    'POST',
    cronSecret
  );
  results.push({
    job: 'slack-crawl',
    success: slackCrawlResult.success,
    data: slackCrawlResult.data,
    error: slackCrawlResult.error,
  });

  // 7. Check-in Email (weekdays only)
  if (isWeekday) {
    console.log('[All Alerts Cron] Running: Check-in Email');
    const checkinResult = await callInternalEndpoint(
      baseUrl,
      '/api/cron/checkin-email',
      'GET',
      cronSecret
    );
    results.push({
      job: 'checkin-email',
      success: checkinResult.success,
      data: checkinResult.data,
      error: checkinResult.error,
    });
  } else {
    results.push({
      job: 'checkin-email',
      success: true,
      skipped: true,
      skipReason: 'Weekend - check-in emails only run on weekdays',
    });
  }

  const endTime = Date.now();
  const duration = endTime - startTime;

  const summary = {
    totalJobs: results.length,
    successful: results.filter(r => r.success && !r.skipped).length,
    failed: results.filter(r => !r.success).length,
    skipped: results.filter(r => r.skipped).length,
    durationMs: duration,
  };

  console.log(`[All Alerts Cron] Completed in ${duration}ms:`, summary);

  return NextResponse.json({
    success: summary.failed === 0,
    timestamp: new Date().toISOString(),
    summary,
    results,
  });
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
