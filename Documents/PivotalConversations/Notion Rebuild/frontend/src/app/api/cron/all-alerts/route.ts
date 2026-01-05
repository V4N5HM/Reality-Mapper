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
 * 1. Review Deadline Check - alerts for content approaching deadlines
 * 2. Task Reminders - 3-day and 24-hour reminders (only for weekly/monthly tasks)
 * 3. Fireflies Crawl - process meeting transcripts
 * 4. Slack Channel Crawl - extract case notes from Slack
 * 5. Check-in Email - weekday morning check-ins (only runs Mon-Fri)
 *
 * DISABLED (no quotas set up yet):
 * - Pipeline Health Check
 * - Daily Task Alerts
 * - Deliverables Tracker
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

  // DISABLED: Pipeline Health Check (no quotas set up yet)
  // Will be re-enabled once package quotas are configured
  results.push({
    job: 'pipeline-check',
    success: true,
    skipped: true,
    skipReason: 'Disabled - no package quotas configured yet',
  });

  // 1. Review Deadline Check
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

  // 2. Task Reminders (only for weekly/monthly tasks, not daily/urgent)
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

  // DISABLED: Deliverables Tracker (no quotas set up yet)
  // Will be re-enabled once package quotas are configured
  results.push({
    job: 'deliverables-tracker',
    success: true,
    skipped: true,
    skipReason: 'Disabled - no package quotas configured yet',
  });

  // 3. Fireflies Crawl
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

  // 4. Slack Channel Crawl
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

  // 5. Check-in Email (weekdays only)
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
