import { NextRequest, NextResponse } from 'next/server';
import { runNotetakerAgent, getAgentStatus } from '@/lib/agents/notetaker-agent';

/**
 * POST /api/agents/notetaker/run
 * Trigger the Notetaker Agent to crawl all sources
 *
 * This endpoint should be called by:
 * 1. A cron job (Vercel Cron, external scheduler, etc.)
 * 2. Manual trigger from admin dashboard
 *
 * Headers:
 * - Authorization: Bearer <CRON_SECRET> (for cron jobs)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization for cron/manual triggers
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In production, require authorization
    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Parse optional config overrides from body
    let config;
    try {
      const body = await request.json();
      config = body.config;
    } catch {
      // No body or invalid JSON, use defaults
    }

    console.log('[NotetakerAgent API] Starting agent run...');

    // Run the agent
    const result = await runNotetakerAgent(config);

    return NextResponse.json({
      success: true,
      runId: result.runId,
      duration: result.endTime.getTime() - result.startTime.getTime(),
      summary: {
        clientsProcessed: result.results.length,
        caseNotesCreated: result.totalCaseNotes,
        tasksCreated: result.totalTasks,
        errors: result.errors.length,
      },
      details: result.results,
      errors: result.errors,
    });
  } catch (error) {
    console.error('[NotetakerAgent API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to run notetaker agent' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents/notetaker/run
 * Get the current agent status
 */
export async function GET() {
  try {
    const status = getAgentStatus();

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error('[NotetakerAgent API] Status error:', error);
    return NextResponse.json(
      { error: 'Failed to get agent status' },
      { status: 500 }
    );
  }
}
