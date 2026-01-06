import { NextRequest, NextResponse } from 'next/server';
import {
  runDeliverablesTrackerAgent,
  getClientDeliverables,
  DeliverableTrackerConfig,
} from '@/lib/agents/deliverables-tracker-agent';

/**
 * POST /api/agents/deliverables-tracker
 * Run the deliverables tracker agent
 *
 * Can be triggered by:
 * - Vercel Cron (daily)
 * - Manual trigger from dashboard
 *
 * Body (optional):
 * {
 *   sendSlackSummary: boolean,
 *   sendIndividualAlerts: boolean,
 *   alertThreshold: number,
 *   slackChannel: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization for cron jobs
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // For cron jobs, verify the secret
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Allow requests without auth header for manual triggers in development
      if (process.env.NODE_ENV === 'production' && !authHeader?.includes('Bearer')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Parse config from body if provided
    let config: Partial<DeliverableTrackerConfig> = {};
    try {
      const body = await request.json();
      config = body || {};
    } catch {
      // No body provided, use defaults
    }

    console.log('[Deliverables Tracker API] Starting agent run');

    const result = await runDeliverablesTrackerAgent({
      sendSlackSummary: config.sendSlackSummary ?? true,
      sendIndividualAlerts: config.sendIndividualAlerts ?? true,
      alertThreshold: config.alertThreshold ?? 20,
      slackChannel: config.slackChannel,
    });

    return NextResponse.json({
      success: true,
      runId: result.runId,
      timestamp: result.timestamp,
      summary: {
        clientsProcessed: result.clientSummaries.length,
        clientsBehindPace: result.clientsBehindPace.length,
        clientsAheadOfPace: result.clientsAheadOfPace.length,
        slackMessageSent: result.slackMessageSent,
        errors: result.errors.length,
      },
      behindPace: result.clientsBehindPace,
      aheadOfPace: result.clientsAheadOfPace,
      errors: result.errors,
    });
  } catch (error) {
    console.error('[Deliverables Tracker API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to run deliverables tracker agent' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents/deliverables-tracker
 * Get deliverables status for all clients or a specific client
 *
 * Query params:
 * - clientId: string (optional) - Get deliverables for a specific client
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (clientId) {
      // Get deliverables for specific client
      const summary = await getClientDeliverables(clientId);

      if (!summary) {
        return NextResponse.json(
          { error: 'Client not found or no package assigned' },
          { status: 404 }
        );
      }

      return NextResponse.json(summary);
    }

    // Run a dry check (without sending Slack messages)
    const result = await runDeliverablesTrackerAgent({
      sendSlackSummary: false,
      sendIndividualAlerts: false,
      alertThreshold: 20,
    });

    return NextResponse.json({
      timestamp: result.timestamp,
      summaries: result.clientSummaries,
      behindPace: result.clientsBehindPace,
      aheadOfPace: result.clientsAheadOfPace,
    });
  } catch (error) {
    console.error('[Deliverables Tracker API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get deliverables status' },
      { status: 500 }
    );
  }
}
