import { NextRequest, NextResponse } from 'next/server';
import { FirefliesClient } from '@/lib/integrations/fireflies-client';
import { getClients } from '@/lib/notion/clients';

/**
 * GET /api/fireflies/transcripts
 *
 * Preview transcripts for a specific Fireflies user.
 *
 * Query params:
 * - userName: string (required) - Name or email of the user
 * - fromDate?: string - ISO date for start of range
 * - toDate?: string - ISO date for end of range
 * - limit?: number - Max transcripts to fetch (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userName = searchParams.get('userName');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!userName) {
      return NextResponse.json(
        { error: 'userName query parameter is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.FIREFLIES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'FIREFLIES_API_KEY not configured' },
        { status: 500 }
      );
    }

    const client = new FirefliesClient(apiKey);

    // Get clients for matching
    const notionClients = await getClients();
    const clientNames = notionClients.map(c => c.name);

    // Fetch transcripts
    const { user, transcripts } = await client.getTranscriptsForUser(userName, {
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      maxTranscripts: limit,
    });

    // Map transcripts with client matching
    const transcriptPreviews = transcripts.map(t => {
      const matchedClient = client.extractClientFromMeeting(t, clientNames);
      const notionClient = matchedClient
        ? notionClients.find(c => c.name.toLowerCase() === matchedClient.toLowerCase())
        : null;

      return {
        id: t.id,
        title: t.title,
        date: t.dateString || new Date(t.date).toISOString(),
        durationMinutes: Math.round(t.duration / 60),
        hostEmail: t.host_email,
        attendees: t.meeting_attendees.map(a => ({
          name: a.displayName || a.name,
          email: a.email,
        })),
        matchedClient: matchedClient
          ? {
              name: matchedClient,
              notionId: notionClient?.id,
            }
          : null,
        summary: t.summary?.overview?.substring(0, 300) || null,
        actionItemCount: t.summary?.action_items?.length || 0,
        keywords: t.summary?.keywords?.slice(0, 10) || [],
        transcriptUrl: t.transcript_url,
        videoUrl: t.video_url,
      };
    });

    return NextResponse.json({
      success: true,
      user: {
        name: user.name,
        email: user.email,
        userId: user.user_id,
        totalTranscripts: user.num_transcripts,
      },
      transcriptsReturned: transcripts.length,
      transcripts: transcriptPreviews,
    });
  } catch (error) {
    console.error('[Fireflies Transcripts] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch transcripts' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/fireflies/transcripts/[id]
 *
 * Get a single transcript with full details
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcriptId } = body;

    if (!transcriptId) {
      return NextResponse.json(
        { error: 'transcriptId is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.FIREFLIES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'FIREFLIES_API_KEY not configured' },
        { status: 500 }
      );
    }

    const client = new FirefliesClient(apiKey);
    const transcript = await client.getTranscript(transcriptId);

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 }
      );
    }

    // Format the full transcript
    const formattedTranscript = client.formatTranscript(transcript.sentences);

    return NextResponse.json({
      success: true,
      transcript: {
        id: transcript.id,
        title: transcript.title,
        date: transcript.dateString || new Date(transcript.date).toISOString(),
        durationMinutes: Math.round(transcript.duration / 60),
        hostEmail: transcript.host_email,
        attendees: transcript.meeting_attendees.map(a => ({
          name: a.displayName || a.name,
          email: a.email,
        })),
        speakers: transcript.speakers,
        summary: transcript.summary,
        formattedTranscript,
        transcriptUrl: transcript.transcript_url,
        videoUrl: transcript.video_url,
        audioUrl: transcript.audio_url,
      },
    });
  } catch (error) {
    console.error('[Fireflies Transcript] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch transcript' },
      { status: 500 }
    );
  }
}
