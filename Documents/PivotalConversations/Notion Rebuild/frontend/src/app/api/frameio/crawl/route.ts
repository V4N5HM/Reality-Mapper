import { NextRequest, NextResponse } from 'next/server';
import { crawlToBePostedFolders, getFolderMapping, clearFolderCache } from '@/lib/frameio/service';

/**
 * Manual Frame.io Crawl Endpoint
 *
 * POST /api/frameio/crawl - Trigger a manual crawl
 * GET /api/frameio/crawl - Get folder mapping info
 * DELETE /api/frameio/crawl - Clear folder cache
 */

// GET - Get folder mapping
export async function GET(request: NextRequest) {
  try {
    const mapping = await getFolderMapping();

    return NextResponse.json({
      success: true,
      folderCount: mapping.length,
      mapping,
    });
  } catch (error) {
    console.error('[Frame.io Crawl API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get folder mapping' },
      { status: 500 }
    );
  }
}

// POST - Trigger manual crawl
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('[Frame.io Crawl API] Manual crawl triggered');

    const result = await crawlToBePostedFolders();
    const duration = Date.now() - startTime;

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
    console.error('[Frame.io Crawl API] Error:', error);
    return NextResponse.json(
      { error: 'Crawl failed', details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE - Clear folder cache (useful after adding new clients)
export async function DELETE(request: NextRequest) {
  try {
    clearFolderCache();

    return NextResponse.json({
      success: true,
      message: 'Folder cache cleared. Next request will rebuild mapping.',
    });
  } catch (error) {
    console.error('[Frame.io Crawl API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
