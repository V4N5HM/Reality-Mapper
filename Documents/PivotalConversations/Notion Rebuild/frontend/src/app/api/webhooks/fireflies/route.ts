import { NextRequest, NextResponse } from 'next/server';
import { processMeetingTranscript } from '@/lib/agents/notetaker-agent';
import { parseFirefliesPayload, FirefliesWebhookPayload } from '@/lib/integrations/notetaker';
import { getClients } from '@/lib/notion/clients';

// Special people whose meetings should always be processed (even without client match)
const ALWAYS_INCLUDE_PEOPLE = [
  'sam gordon', 'sam',
  'jack henderson', 'jack',
  'stephen ash', 'stephen',
];

/**
 * Check if a meeting involves one of the special people who should always be included
 */
function meetingInvolvesSpecialPeople(
  title: string,
  participants: Array<{ name?: string; email?: string }>
): boolean {
  const titleLower = title.toLowerCase();

  // Check if any special person name appears in title
  for (const person of ALWAYS_INCLUDE_PEOPLE) {
    if (titleLower.includes(person)) {
      return true;
    }
  }

  // Check participants
  for (const participant of participants || []) {
    const name = (participant.name || '').toLowerCase();
    const email = (participant.email || '').toLowerCase();

    for (const person of ALWAYS_INCLUDE_PEOPLE) {
      if (name.includes(person) || email.includes(person)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * POST /api/webhooks/fireflies
 * Webhook endpoint for Fireflies.ai meeting transcripts
 *
 * Fireflies sends a webhook when a meeting recording is processed.
 * This endpoint receives the transcript and creates case notes.
 *
 * Setup in Fireflies:
 * 1. Go to Settings > Integrations > Webhooks
 * 2. Add webhook URL: https://your-domain.com/api/webhooks/fireflies
 * 3. Select events: Transcription Completed
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature if configured
    const webhookSecret = process.env.FIREFLIES_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get('x-fireflies-signature');
      if (!signature) {
        console.warn('[Fireflies Webhook] Missing signature');
      }
    }

    const payload = await request.json() as FirefliesWebhookPayload;

    console.log('[Fireflies Webhook] Received:', {
      meetingId: payload.meeting_id,
      title: payload.title,
      attendeeCount: payload.participants?.length,
    });

    // Parse the Fireflies payload into our transcript format
    const transcript = parseFirefliesPayload(payload);

    // Try to match the meeting to a client
    const clients = await getClients('Active');
    let matchedClient = null;

    // Match by participant names/emails or meeting title
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

      // Check attendee emails if available
      if (payload.participants) {
        for (const attendee of payload.participants) {
          if (attendee.email?.toLowerCase().includes(clientNameLower) ||
              attendee.name?.toLowerCase().includes(clientNameLower)) {
            matchedClient = client;
            break;
          }
        }
      }

      if (matchedClient) break;
    }

    // Check if meeting involves special people (Sam Gordon, Jack Henderson, Stephen Ash)
    const involvesSpecialPeople = meetingInvolvesSpecialPeople(
      payload.title || transcript.title,
      payload.participants || []
    );

    if (!matchedClient && !involvesSpecialPeople) {
      console.log('[Fireflies Webhook] Skipping meeting (no client match, no special people):', transcript.title);
      return NextResponse.json({
        success: false,
        message: 'No client match found and meeting does not involve key stakeholders',
        meetingTitle: transcript.title,
      });
    }

    if (matchedClient) {
      console.log('[Fireflies Webhook] Matched to client:', matchedClient.name);
    } else {
      console.log('[Fireflies Webhook] Processing meeting for special stakeholder (no client match):', transcript.title);
    }

    // Process the transcript
    // Note: For internal meetings without a client, we pass empty string for clientId
    // The notetaker agent will create case notes without client association
    const result = await processMeetingTranscript(
      transcript,
      matchedClient?.id || '',
      matchedClient?.name || 'Internal Meeting',
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
      client: matchedClient?.name || 'Internal Meeting',
      specialStakeholder: !matchedClient && involvesSpecialPeople,
      caseNotesCreated: result.caseNotesCreated,
      tasksCreated: result.tasksCreated,
      errors: result.errors,
    });
  } catch (error) {
    console.error('[Fireflies Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process Fireflies webhook' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/fireflies
 * Webhook verification endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    service: 'fireflies-webhook',
    timestamp: new Date().toISOString(),
  });
}
