import { NextRequest, NextResponse } from 'next/server';

// This cron endpoint is called by Vercel Cron every 4 hours
// It delegates to the main scheduled crawl endpoint

export async function GET(request: NextRequest) {
  // Verify cron request is from Vercel
  const authHeader = request.headers.get('authorization');

  // In production, verify the request comes from Vercel Cron
  // Vercel sets CRON_SECRET environment variable for verification
  const cronSecret = process.env.CRON_SECRET;

  try {
    // Get the base URL from the request
    const baseUrl = new URL(request.url).origin;

    // Call the scheduled crawl endpoint
    const response = await fetch(`${baseUrl}/api/slack/crawl/scheduled`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cronSecret ? { 'Authorization': `Bearer ${cronSecret}` } : {}),
      },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Slack Cron] Crawl failed:', result);
      return NextResponse.json(
        { success: false, error: result.error || 'Crawl failed' },
        { status: 500 }
      );
    }

    console.log('[Slack Cron] Crawl completed:', result.summary);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Slack Cron] Error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
