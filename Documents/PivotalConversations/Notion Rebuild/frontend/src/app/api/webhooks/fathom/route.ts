import { NextRequest, NextResponse } from 'next/server';
import { processMeetingTranscript } from '@/lib/agents/notetaker-agent';
import { parseFathomPayload, FathomPayload } from '@/lib/integrations/notetaker';
import { getClients } from '@/lib/notion/clients';

/**
 * POST /api/webhooks/fathom
 * Webhook endpoint for Fathom meeting transcripts
 *
 * Fathom sends a webhook when a meeting recording is processed.
 * This endpoint receives the transcript and creates case notes.
 *
 * Setup in Fathom:
 * 1. Go to Settings > Integrations > Webhooks
 * 2. Add webhook URL: https://your-domain.com/api/webhooks/fathom
 * 3. Select events: recording.completed
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature if configured
    const webhookSecret = process.env.FATHOM_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get('x-fathom-signature');
      // In production, verify the signature matches
      // For now, just check if it exists when secret is configured
      if (!signature) {
        console.warn('[Fathom Webhook] Missing signature');
      }
    }

    const payload = await request.json() as FathomPayload;

    console.log('[Fathom Webhook] Received:', {
      title: payload.name,
      duration: payload.duration_seconds,
      participantCount: payload.attendees?.length,
    });

    // Parse the Fathom payload into our transcript format
    const transcript = parseFathomPayload(payload);

    // Try to match the meeting to a client
    const clients = await getClients('Active');
    let matchedClient = null;

    // Match by participant names or meeting title
    for (const client of clients) {
      const clientNameLower = client.name.toLowerCase();

      // Check if client name appears in title
      if (transcript.title.toLowerCase().includes(clientNameLower)) {
        matchedClient = client;
        break;
      }

      // Check if client name appears in participants
      for (const participant of transcript.participants) {
        if (participant.toLowerCase().includes(clientNameLower)) {
          matchedClient = client;
          break;
        }
      }

      if (matchedClient) break;
    }

    if (!matchedClient) {
      console.log('[Fathom Webhook] No client match found for meeting:', transcript.title);
      return NextResponse.json({
        success: false,
        message: 'No client match found for this meeting',
        meetingTitle: transcript.title,
      });
    }

    console.log('[Fathom Webhook] Matched to client:', matchedClient.name);

    // Process the transcript
    const result = await processMeetingTranscript(
      transcript,
      matchedClient.id,
      matchedClient.name,
      {
        slackCrawlIntervalHours: 1,
        emailCrawlIntervalHours: 4,
        slackLookbackDays: 1,
        enableAIParsing: true,
        autoCreateTasks: true,
      }
    );

    return NextResponse.json({
      success: true,
      client: matchedClient.name,
      caseNotesCreated: result.caseNotesCreated,
      tasksCreated: result.tasksCreated,
      errors: result.errors,
    });
  } catch (error) {
    console.error('[Fathom Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process Fathom webhook' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/fathom
 * Webhook verification endpoint
 */
export async function GET(request: NextRequest) {
  // Some webhook systems send a GET request to verify the endpoint
  return NextResponse.json({
    status: 'ok',
    service: 'fathom-webhook',
    timestamp: new Date().toISOString(),
  });
}
