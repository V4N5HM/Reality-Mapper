import { NextRequest, NextResponse } from 'next/server';
import { sendSlackMessage } from '@/lib/slack';

// POST /api/slack/notify - Send a Slack notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channel, text, blocks } = body;

    if (!text) {
      return NextResponse.json(
        { ok: false, error: 'Missing text parameter' },
        { status: 400 }
      );
    }

    const success = await sendSlackMessage({
      channel,
      text,
      blocks,
    });

    if (!success) {
      return NextResponse.json(
        { ok: false, error: 'Failed to send Slack message' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error sending Slack notification:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
