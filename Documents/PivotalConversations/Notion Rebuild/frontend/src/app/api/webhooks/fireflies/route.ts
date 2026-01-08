import { NextRequest, NextResponse } from 'next/server';
import { FirefliesClient, FirefliesTranscript } from '@/lib/integrations/fireflies-client';
import { getClients } from '@/lib/notion/clients';
import { createCaseNote, getCaseNotes } from '@/lib/notion/case-notes';
import { getTeamMembers, getPersonalBrandTeamEmails, getTeamMemberByEmail } from '@/lib/notion/team';

// Natasha's email - her meetings are ALWAYS imported and visible to Personal Brand team
const NATASHA_EMAIL = 'natasha@pivotalconversations.ai';

/**
 * Format meeting transcript content
 */
function formatMeetingContent(transcript: FirefliesTranscript): string {
  const lines: string[] = [];

  lines.push('**Meeting recorded via Fireflies.ai**\n');

  if (transcript.summary?.overview) {
    lines.push('## Overview');
    lines.push(transcript.summary.overview);
    lines.push('');
  }

  if (transcript.summary?.action_items) {
    lines.push('## Action Items');
    const actionItems = transcript.summary.action_items;
    if (typeof actionItems === 'string') {
      lines.push(actionItems);
    } else if (Array.isArray(actionItems)) {
      actionItems.forEach(item => {
        lines.push(`- ${item}`);
      });
    }
    lines.push('');
  }

  if (transcript.summary?.keywords?.length) {
    lines.push('## Keywords');
    lines.push(transcript.summary.keywords.join(', '));
    lines.push('');
  }

  lines.push('---');

  const attendees = (transcript.meeting_attendees || [])
    .map(a => a.displayName || a.name || a.email)
    .filter(Boolean);

  if (attendees.length > 0) {
    lines.push(`**Attendees:** ${attendees.join(', ')}`);
  }

  lines.push(`**Duration:** ${Math.round(transcript.duration / 60)} minutes`);

  if (transcript.transcript_url) {
    lines.push(`**Transcript:** ${transcript.transcript_url}`);
  }

  return lines.join('\n');
}

/**
 * Fireflies webhook payload structure
 */
interface FirefliesWebhookPayload {
  meetingId?: string;
  meeting_id?: string;
  transcriptId?: string;
  transcript_id?: string;
  eventType?: string;
  event_type?: string;
  title?: string;
  clientReferenceId?: string;
  data?: {
    meetingId?: string;
    transcriptId?: string;
    title?: string;
  };
}

/**
 * Determine meeting owner from transcript
 * Returns the team member who owns this meeting (host/organizer/first team attendee)
 */
async function determineMeetingOwner(transcript: FirefliesTranscript): Promise<{
  teamMemberId: string;
  teamMemberName: string;
  teamMemberEmail: string;
  isNatasha: boolean;
} | null> {
  const allMembers = await getTeamMembers();
  const memberEmails = new Map(allMembers.map(m => [m.email.toLowerCase(), m]));

  // Check host email
  const hostEmail = (transcript.host_email || '').toLowerCase();
  if (hostEmail && memberEmails.has(hostEmail)) {
    const member = memberEmails.get(hostEmail)!;
    return {
      teamMemberId: member.id,
      teamMemberName: member.name,
      teamMemberEmail: member.email,
      isNatasha: hostEmail === NATASHA_EMAIL.toLowerCase(),
    };
  }

  // Check organizer email
  const organizerEmail = (transcript.organizer_email || '').toLowerCase();
  if (organizerEmail && memberEmails.has(organizerEmail)) {
    const member = memberEmails.get(organizerEmail)!;
    return {
      teamMemberId: member.id,
      teamMemberName: member.name,
      teamMemberEmail: member.email,
      isNatasha: organizerEmail === NATASHA_EMAIL.toLowerCase(),
    };
  }

  // Check attendees - find first team member attendee
  for (const attendee of transcript.meeting_attendees || []) {
    const attendeeEmail = (attendee.email || '').toLowerCase();
    if (attendeeEmail && memberEmails.has(attendeeEmail)) {
      const member = memberEmails.get(attendeeEmail)!;
      return {
        teamMemberId: member.id,
        teamMemberName: member.name,
        teamMemberEmail: member.email,
        isNatasha: attendeeEmail === NATASHA_EMAIL.toLowerCase(),
      };
    }
  }

  return null;
}

/**
 * POST /api/webhooks/fireflies
 *
 * Webhook endpoint for Fireflies.ai meeting transcripts.
 * ACCEPTS ALL MEETINGS from the Fireflies workspace - filtering happens at display time.
 *
 * Storage Logic:
 * - ALL meetings are stored as case notes
 * - Each case note is tagged with the meeting owner (firefliesOwnerId, firefliesOwnerEmail)
 * - Natasha's meetings are marked with isNatashaMeeting=true for Personal Brand team visibility
 *
 * Display Logic (handled in case-notes API):
 * - Personal Brand team: See ALL of Natasha's meetings
 * - Other team members: Only see their OWN meetings (if they've connected Fireflies)
 *
 * Setup in Fireflies:
 * 1. Go to Settings > Integrations > Webhooks
 * 2. Add webhook URL: https://personalbrandpc.vercel.app/api/webhooks/fireflies
 * 3. Select events: Transcription Completed
 */
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log(`[Fireflies Webhook] ========== INCOMING REQUEST at ${timestamp} ==========`);

  try {
    // Log headers for debugging
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log('[Fireflies Webhook] Request headers:', JSON.stringify(headers, null, 2));

    const payload = await request.json() as FirefliesWebhookPayload;
    console.log('[Fireflies Webhook] Received payload:', JSON.stringify(payload, null, 2));

    // Extract transcript ID
    const transcriptId =
      payload.transcriptId ||
      payload.transcript_id ||
      payload.meetingId ||
      payload.meeting_id ||
      payload.data?.transcriptId ||
      payload.data?.meetingId;

    if (!transcriptId) {
      console.error('[Fireflies Webhook] No transcript ID found in payload');
      return NextResponse.json({
        success: false,
        message: 'No transcript ID in webhook payload',
        receivedPayload: payload,
      }, { status: 400 });
    }

    console.log(`[Fireflies Webhook] Processing transcript: ${transcriptId}`);

    // Fetch full transcript from Fireflies API
    const apiKey = process.env.FIREFLIES_API_KEY;
    if (!apiKey) {
      console.error('[Fireflies Webhook] No API key configured');
      return NextResponse.json({
        success: false,
        message: 'Fireflies API key not configured',
      }, { status: 500 });
    }

    const firefliesClient = new FirefliesClient(apiKey);
    const transcript = await firefliesClient.getTranscript(transcriptId);

    if (!transcript) {
      console.error(`[Fireflies Webhook] Could not fetch transcript: ${transcriptId}`);
      return NextResponse.json({
        success: false,
        message: 'Could not fetch transcript from Fireflies API',
        transcriptId,
      }, { status: 404 });
    }

    console.log(`[Fireflies Webhook] Fetched transcript: ${transcript.title}`);
    console.log(`[Fireflies Webhook] Host: ${transcript.host_email}, Organizer: ${transcript.organizer_email}`);
    console.log(`[Fireflies Webhook] Attendees: ${transcript.meeting_attendees?.map(a => a.email).join(', ')}`);

    // Determine meeting owner
    const meetingOwner = await determineMeetingOwner(transcript);

    if (!meetingOwner) {
      // No team member associated with this meeting - still store it but mark as unassigned
      console.log(`[Fireflies Webhook] No team member found for meeting - storing as unassigned`);
    } else {
      console.log(`[Fireflies Webhook] Meeting owner: ${meetingOwner.teamMemberName} (${meetingOwner.teamMemberEmail})`);
      console.log(`[Fireflies Webhook] Is Natasha's meeting: ${meetingOwner.isNatasha}`);
    }

    // Check for duplicate case notes
    const noteTitle = `[Meeting] ${transcript.title}`;
    const existingNotes = await getCaseNotes({});
    const isDuplicate = existingNotes.some(n =>
      n.title.toLowerCase() === noteTitle.toLowerCase()
    );

    if (isDuplicate) {
      console.log(`[Fireflies Webhook] Duplicate detected, skipping: ${noteTitle}`);
      return NextResponse.json({
        success: true,
        message: 'Duplicate case note already exists',
        title: noteTitle,
      });
    }

    // Get clients for matching
    const notionClients = await getClients();
    const clientNames = notionClients.map(c => c.name);

    // Try to match to client
    const matchedClientName = firefliesClient.extractClientFromMeeting(transcript, clientNames);
    const matchedClient = matchedClientName
      ? notionClients.find(c => c.name.toLowerCase() === matchedClientName.toLowerCase())
      : null;

    if (matchedClient) {
      console.log(`[Fireflies Webhook] Matched to client: ${matchedClient.name}`);
    }

    // Format content
    const content = formatMeetingContent(transcript);

    // Create case note with owner info
    // The display logic will filter based on firefliesOwnerEmail:
    // - Personal Brand team members can see all Personal Brand team's meetings (including Natasha's)
    // - Other team members can only see their own meetings
    const caseNote = await createCaseNote({
      title: noteTitle,
      clientId: matchedClient?.id,
      type: 'Internal Note',
      source: 'Call',
      date: new Date(transcript.date).toISOString().split('T')[0],
      content,
      autoGenerated: true,
      // Owner info for filtering - Personal Brand team emails are fetched from Notion
      // so Natasha's meetings will automatically be visible to Personal Brand team
      firefliesOwnerId: meetingOwner?.teamMemberId || '',
      firefliesOwnerEmail: meetingOwner?.teamMemberEmail || transcript.host_email || transcript.organizer_email || '',
    });

    if (!caseNote) {
      return NextResponse.json({
        success: true,
        message: 'Case note creation skipped (likely duplicate)',
        title: noteTitle,
      });
    }

    console.log(`[Fireflies Webhook] Created case note: ${caseNote.id}`);

    return NextResponse.json({
      success: true,
      message: 'Case note created successfully',
      caseNoteId: caseNote.id,
      title: noteTitle,
      client: matchedClient?.name || 'No Client Match',
      owner: meetingOwner?.teamMemberName || 'Unassigned',
      ownerEmail: meetingOwner?.teamMemberEmail || '',
      isNatashaMeeting: meetingOwner?.isNatasha || false,
    });
  } catch (error) {
    console.error('[Fireflies Webhook] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process Fireflies webhook',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/fireflies
 * Health check and test endpoint
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const testMode = searchParams.get('test') === 'true';
  const meetingId = searchParams.get('meetingId');
  const shouldProcess = searchParams.get('process') === 'true'; // Actually create case note

  if (testMode && meetingId) {
    console.log(`[Fireflies Webhook] Manual test for meeting: ${meetingId}`);

    const apiKey = process.env.FIREFLIES_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'FIREFLIES_API_KEY not configured' }, { status: 500 });
    }

    try {
      const firefliesClient = new FirefliesClient(apiKey);
      const transcript = await firefliesClient.getTranscript(meetingId);

      if (!transcript) {
        return NextResponse.json({
          success: false,
          error: 'Could not fetch transcript from Fireflies',
          meetingId,
        }, { status: 404 });
      }

      // Determine owner
      const meetingOwner = await determineMeetingOwner(transcript);

      // If shouldProcess=true, actually create the case note
      if (shouldProcess) {
        // Simulate POST request
        const mockRequest = new Request(request.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meetingId }),
        });
        return POST(mockRequest as NextRequest);
      }

      return NextResponse.json({
        success: true,
        test: true,
        transcript: {
          id: transcript.id,
          title: transcript.title,
          date: transcript.date,
          dateString: transcript.dateString,
          host_email: transcript.host_email,
          organizer_email: transcript.organizer_email,
          duration: transcript.duration,
          attendees: transcript.meeting_attendees?.map(a => ({
            name: a.name,
            email: a.email,
            displayName: a.displayName,
          })),
        },
        meetingOwner: meetingOwner ? {
          name: meetingOwner.teamMemberName,
          email: meetingOwner.teamMemberEmail,
          isNatasha: meetingOwner.isNatasha,
        } : null,
        message: 'Add &process=true to actually create the case note',
      });
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, { status: 500 });
    }
  }

  return NextResponse.json({
    status: 'ok',
    service: 'fireflies-webhook',
    message: 'Fireflies webhook endpoint is active',
    timestamp: new Date().toISOString(),
    testInstructions: 'Add ?test=true&meetingId=<id> to test, add &process=true to create case note',
  });
}
