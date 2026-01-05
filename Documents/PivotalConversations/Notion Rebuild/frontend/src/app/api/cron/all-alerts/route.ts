import { NextRequest, NextResponse } from 'next/server';

/**
 * Unified Cron Job - Runs all alert systems
 *
 * This endpoint consolidates all cron jobs into one to stay within
 * Vercel's free tier limit of 2 cron jobs.
 *
 * Runs daily at 9pm UTC (8am AEDT Melbourne time)
 *
 * Jobs included:
 * 1. Pipeline Health Check - checks if clients have enough scheduled content
 * 2. Review Deadline Check - alerts for content approaching deadlines
 * 3. Daily Task Alerts - morning task summaries for team members
 * 4. Task Reminders - 3-day and 24-hour reminders
 * 5. Deliverables Tracker - monthly deliverables progress
 * 6. Fireflies Crawl - process meeting transcripts
 * 7. Slack Channel Crawl - extract case notes from Slack
 * 8. Check-in Email - weekday morning check-ins (only runs Mon-Fri)
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

  // 1. Pipeline Health Check
  console.log('[All Alerts Cron] Running: Pipeline Health Check');
  const pipelineResult = await callInternalEndpoint(
    baseUrl,
    '/api/cron/pipeline-check',
    'GET',
    cronSecret
  );
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

  // 3. Daily Task Alerts
  console.log('[All Alerts Cron] Running: Daily Task Alerts');
  const dailyAlertsResult = await callInternalEndpoint(
    baseUrl,
    '/api/slack/daily-alerts',
    'POST',
    cronSecret
  );
  results.push({
    job: 'daily-task-alerts',
    success: dailyAlertsResult.success,
    data: dailyAlertsResult.data,
    error: dailyAlertsResult.error,
  });

  // 4. Task Reminders
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

  // 5. Deliverables Tracker
  console.log('[All Alerts Cron] Running: Deliverables Tracker');
  const deliverablesResult = await callInternalEndpoint(
    baseUrl,
    '/api/agents/deliverables-tracker',
    'POST',
    cronSecret
  );
  results.push({
    job: 'deliverables-tracker',
    success: deliverablesResult.success,
    data: deliverablesResult.data,
    error: deliverablesResult.error,
  });

  // 6. Fireflies Crawl
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

  // 7. Slack Channel Crawl
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

  // 8. Check-in Email (weekdays only)
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
