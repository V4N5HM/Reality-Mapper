import { NextRequest, NextResponse } from 'next/server';
import { crawlToBePostedFolders } from '@/lib/frameio/service';

/**
 * Frame.io Crawl Endpoint (Manual Fallback)
 *
 * Primary method is webhook (/api/frameio/webhook)
 * This endpoint is a manual fallback to:
 * 1. Check "To Be Posted" folders in Frame.io for new video uploads
 * 2. Match uploads by title to existing Notion content
 * 3. Update content with Frame.io link and move to "PC Feedback"
 *
 * Can be triggered manually or via cron if needed
 */

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('[Frame.io Crawl] Starting manual crawl...');

    const result = await crawlToBePostedFolders();

    const duration = Date.now() - startTime;

    console.log(`[Frame.io Crawl] Completed in ${duration}ms:`, {
      processed: result.processed,
      matched: result.matched,
      skipped: result.skipped,
      unmatched: result.unmatched,
      errors: result.errors.length,
    });

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      summary: {
        processed: result.processed,
        matched: result.matched,
        skipped: result.skipped,
        unmatched: result.unmatched,
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error('[Frame.io Crawl] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
