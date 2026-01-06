import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/auth/session';
import { notion, databases, getRichText } from '@/lib/notion/client';
import { FirefliesClient, FirefliesTranscript } from '@/lib/integrations/fireflies-client';
import { createCaseNote, getCaseNotes } from '@/lib/notion/case-notes';
import { getClients } from '@/lib/notion/clients';

// GET - Get user's Fireflies connection status
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.userType !== 'team') {
      return NextResponse.json({ error: 'Only team members can access this' }, { status: 403 });
    }

    const globalApiKey = process.env.FIREFLIES_API_KEY;
    if (!globalApiKey) {
      return NextResponse.json({
        configured: false,
        message: 'Fireflies is not configured',
      });
    }

    // Check if user has linked their Fireflies account
    if (!databases.teamMembers) {
      return NextResponse.json({
        configured: true,
        linked: false,
      });
    }

    const existingMembers = await notion.databases.query({
      database_id: databases.teamMembers,
      filter: {
        property: 'Email',
        email: {
          equals: session.email.toLowerCase(),
        },
      },
    });

    if (existingMembers.results.length === 0) {
      return NextResponse.json({
        configured: true,
        linked: false,
      });
    }

    const page = existingMembers.results[0] as any;
    const firefliesUserId = getRichText(page.properties['Fireflies User ID']?.rich_text || []);
    const firefliesUserName = getRichText(page.properties['Fireflies User Name']?.rich_text || []);
    const firefliesLinkedAt = page.properties['Fireflies Linked At']?.date?.start || null;

    return NextResponse.json({
      configured: true,
      linked: !!firefliesUserId,
      firefliesUserId: firefliesUserId || null,
      firefliesUserName: firefliesUserName || null,
      firefliesLinkedAt,
    });
  } catch (error) {
    console.error('Fireflies GET error:', error);
    return NextResponse.json({ error: 'Failed to get Fireflies status' }, { status: 500 });
  }
}

// PUT - Link/update Fireflies user for current team member
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.userType !== 'team') {
      return NextResponse.json({ error: 'Only team members can access this' }, { status: 403 });
    }

    const body = await request.json();
    const { firefliesUserId, firefliesUserName } = body;

    if (!firefliesUserId) {
      return NextResponse.json({ error: 'Fireflies user ID is required' }, { status: 400 });
    }

    if (!databases.teamMembers) {
      return NextResponse.json({ error: 'Team database not configured' }, { status: 500 });
    }

    // Find the user's Notion page
    const existingMembers = await notion.databases.query({
      database_id: databases.teamMembers,
      filter: {
        property: 'Email',
        email: {
          equals: session.email.toLowerCase(),
        },
      },
    });

    if (existingMembers.results.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const pageId = existingMembers.results[0].id;
    const linkedAt = new Date().toISOString();

    // Update the Fireflies user ID in Notion
    await notion.pages.update({
      page_id: pageId,
      properties: {
        'Fireflies User ID': {
          rich_text: [{ text: { content: firefliesUserId } }],
        },
        'Fireflies User Name': {
          rich_text: [{ text: { content: firefliesUserName || '' } }],
        },
        'Fireflies Linked At': {
          date: { start: linkedAt },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Fireflies account linked successfully. Future meetings will be automatically imported.',
      firefliesUserId,
      firefliesUserName,
      linkedAt,
    });
  } catch (error) {
    console.error('Fireflies PUT error:', error);
    return NextResponse.json({ error: 'Failed to link Fireflies account' }, { status: 500 });
  }
}

// DELETE - Unlink Fireflies user
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.userType !== 'team') {
      return NextResponse.json({ error: 'Only team members can access this' }, { status: 403 });
    }

    if (!databases.teamMembers) {
      return NextResponse.json({ error: 'Team database not configured' }, { status: 500 });
    }

    const existingMembers = await notion.databases.query({
      database_id: databases.teamMembers,
      filter: {
        property: 'Email',
        email: {
          equals: session.email.toLowerCase(),
        },
      },
    });

    if (existingMembers.results.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const pageId = existingMembers.results[0].id;

    // Clear the Fireflies user ID
    await notion.pages.update({
      page_id: pageId,
      properties: {
        'Fireflies User ID': {
          rich_text: [],
        },
        'Fireflies User Name': {
          rich_text: [],
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Fireflies account unlinked',
    });
  } catch (error) {
    console.error('Fireflies DELETE error:', error);
    return NextResponse.json({ error: 'Failed to unlink Fireflies account' }, { status: 500 });
  }
}

// POST - Import transcripts for the linked Fireflies user only (after link date)
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.userType !== 'team') {
      return NextResponse.json({ error: 'Only team members can import transcripts' }, { status: 403 });
    }

    const globalApiKey = process.env.FIREFLIES_API_KEY;
    if (!globalApiKey) {
      return NextResponse.json({
        error: 'Fireflies is not configured',
      }, { status: 500 });
    }

    if (!databases.teamMembers) {
      return NextResponse.json({ error: 'Team database not configured' }, { status: 500 });
    }

    // Get the user's linked Fireflies user ID and link date
    const existingMembers = await notion.databases.query({
      database_id: databases.teamMembers,
      filter: {
        property: 'Email',
        email: {
          equals: session.email.toLowerCase(),
        },
      },
    });

    if (existingMembers.results.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const page = existingMembers.results[0] as any;
    const teamMemberId = page.id; // The Notion page ID for this team member
    const firefliesUserId = getRichText(page.properties['Fireflies User ID']?.rich_text || []);
    const firefliesLinkedAt = page.properties['Fireflies Linked At']?.date?.start || null;

    if (!firefliesUserId) {
      return NextResponse.json({
        error: 'No Fireflies account linked. Please select your Fireflies account first.',
      }, { status: 400 });
    }

    // Only import meetings AFTER the account was linked
    const fromDate = firefliesLinkedAt ? new Date(firefliesLinkedAt) : new Date();

    const client = new FirefliesClient(globalApiKey);

    // Fetch transcripts only from AFTER the link date for THIS USER ONLY
    const transcripts = await client.getTranscripts({
      userId: firefliesUserId,
      fromDate: fromDate,
      limit: 50,
    });

    if (transcripts.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        message: 'No new transcripts found since you linked your account',
      });
    }

    // Get existing case notes to avoid duplicates
    const existingNotes = await getCaseNotes({});
    const existingTitles = new Set(existingNotes.map(n => n.title.toLowerCase()));

    // Get all clients to try to match meetings
    const clients = await getClients('Active');
    const clientNameMap = new Map(clients.map(c => [c.name.toLowerCase(), c.id]));

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const transcript of transcripts) {
      try {
        // Skip if duplicate
        const noteTitle = `[Meeting] ${transcript.title || 'Untitled Meeting'}`;
        if (existingTitles.has(noteTitle.toLowerCase())) {
          skipped++;
          continue;
        }

        // Try to match client from meeting title or attendees
        let matchedClientId: string | undefined;

        // Check meeting title for client name
        const titleLower = transcript.title?.toLowerCase() || '';
        for (const [clientName, clientId] of clientNameMap) {
          if (titleLower.includes(clientName)) {
            matchedClientId = clientId;
            break;
          }
        }

        // If no match in title, check attendees
        if (!matchedClientId && transcript.meeting_attendees) {
          for (const attendee of transcript.meeting_attendees) {
            const attendeeName = (attendee.displayName || attendee.name || '').toLowerCase();
            for (const [clientName, clientId] of clientNameMap) {
              if (attendeeName.includes(clientName) || clientName.includes(attendeeName)) {
                matchedClientId = clientId;
                break;
              }
            }
            if (matchedClientId) break;
          }
        }

        // Format content in the same style as the cron job
        const content = formatMeetingContent(transcript);

        // Parse date from transcript
        const meetingDate = transcript.date
          ? new Date(transcript.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];

        // Create case note with owner info for filtering
        const caseNote = await createCaseNote({
          title: noteTitle,
          clientId: matchedClientId,
          date: meetingDate,
          type: 'Internal Note',
          source: 'Call',
          content: content,
          autoGenerated: true,
          // Tag the meeting with its owner for filtering
          firefliesOwnerId: teamMemberId,
          firefliesOwnerEmail: session.email,
        });

        if (caseNote) {
          imported++;
          existingTitles.add(noteTitle.toLowerCase());
        }
      } catch (error) {
        console.error(`Error importing transcript ${transcript.id}:`, error);
        errors.push(transcript.title || transcript.id);
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: transcripts.length,
      errors: errors.length > 0 ? errors : undefined,
      message: imported > 0
        ? `Imported ${imported} new meeting${imported !== 1 ? 's' : ''} as case notes${skipped > 0 ? ` (${skipped} already existed)` : ''}`
        : skipped > 0
          ? `All ${skipped} meetings were already imported`
          : 'No new transcripts found since you linked your account',
    });
  } catch (error) {
    console.error('Fireflies import error:', error);
    return NextResponse.json({ error: 'Failed to import transcripts' }, { status: 500 });
  }
}

/**
 * Format meeting transcript content - same format as cron job
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

  if (transcript.duration) {
    lines.push(`**Duration:** ${Math.round(transcript.duration / 60)} minutes`);
  }

  if (transcript.transcript_url) {
    lines.push(`**Transcript:** ${transcript.transcript_url}`);
  }

  return lines.join('\n');
}
