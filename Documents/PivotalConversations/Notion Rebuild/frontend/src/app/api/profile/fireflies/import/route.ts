import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/auth/session';
import { notion, databases, getRichText } from '@/lib/notion/client';
import { createCaseNote } from '@/lib/notion/case-notes';
import { getClients } from '@/lib/notion/clients';

// POST - Import Fireflies transcripts as case notes for the current user
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

    if (!databases.teamMembers) {
      return NextResponse.json({ error: 'Team database not configured' }, { status: 500 });
    }

    // Get user's Fireflies API key from Notion
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
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    const page = existingMembers.results[0] as any;
    const apiKey = getRichText(page.properties['Fireflies API Key']?.rich_text || []);

    if (!apiKey) {
      return NextResponse.json({
        error: 'No Fireflies API key configured. Please add your API key in your profile settings.'
      }, { status: 400 });
    }

    // Fetch recent transcripts from Fireflies (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transcriptsResponse = await fetch('https://api.fireflies.ai/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: `
          query Transcripts($fromDate: DateTime, $limit: Int) {
            transcripts(fromDate: $fromDate, limit: $limit) {
              id
              title
              date
              dateString
              duration
              host_email
              organizer_email
              transcript_url
              summary {
                keywords
                action_items
                overview
              }
              meeting_attendees {
                displayName
                email
                name
              }
            }
          }
        `,
        variables: {
          fromDate: thirtyDaysAgo.toISOString(),
          limit: 20,
        },
      }),
    });

    const transcriptsData = await transcriptsResponse.json();

    if (transcriptsData.errors) {
      console.error('Fireflies API error:', transcriptsData.errors);
      return NextResponse.json({
        error: 'Failed to fetch transcripts from Fireflies'
      }, { status: 500 });
    }

    const transcripts = transcriptsData.data?.transcripts || [];

    if (transcripts.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        message: 'No recent transcripts found',
      });
    }

    // Get all clients to try to match meetings
    const clients = await getClients('Active');
    const clientNameMap = new Map(clients.map(c => [c.name.toLowerCase(), c.id]));

    let imported = 0;
    const errors: string[] = [];

    for (const transcript of transcripts) {
      try {
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

        // Build case note content
        const summary = transcript.summary || {};
        const overview = summary.overview || 'No summary available';
        const keywords = Array.isArray(summary.keywords) ? summary.keywords.join(', ') : '';
        const actionItems = Array.isArray(summary.action_items)
          ? summary.action_items.map((item: string, i: number) => `${i + 1}. ${item}`).join('\n')
          : (summary.action_items || '');

        const attendeesList = (transcript.meeting_attendees || [])
          .map((a: any) => a.displayName || a.name || a.email)
          .filter(Boolean)
          .join(', ');

        const duration = transcript.duration
          ? `${Math.round(transcript.duration / 60)} minutes`
          : 'Unknown';

        const noteContent = [
          `**Meeting Summary**`,
          overview,
          '',
          `**Duration:** ${duration}`,
          attendeesList ? `**Attendees:** ${attendeesList}` : '',
          keywords ? `**Keywords:** ${keywords}` : '',
          actionItems ? `\n**Action Items:**\n${actionItems}` : '',
          '',
          `[View full transcript](${transcript.transcript_url})`,
        ].filter(Boolean).join('\n');

        // Parse date from transcript
        const meetingDate = transcript.date
          ? new Date(transcript.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];

        // Create case note
        const caseNote = await createCaseNote({
          title: transcript.title || 'Untitled Meeting',
          clientId: matchedClientId,
          date: meetingDate,
          type: 'Internal Note',
          source: 'Call',
          fullNote: noteContent.slice(0, 2000), // Notion has 2000 char limit for rich text
          autoGenerated: true,
        });

        if (caseNote) {
          imported++;
        }
      } catch (error) {
        console.error(`Error importing transcript ${transcript.id}:`, error);
        errors.push(transcript.title || transcript.id);
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      total: transcripts.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Imported ${imported} of ${transcripts.length} transcripts`,
    });
  } catch (error) {
    console.error('Fireflies import error:', error);
    return NextResponse.json({ error: 'Failed to import transcripts' }, { status: 500 });
  }
}
