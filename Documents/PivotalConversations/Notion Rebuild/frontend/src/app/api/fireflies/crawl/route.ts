import { NextRequest, NextResponse } from 'next/server';
import { FirefliesClient, FirefliesTranscript } from '@/lib/integrations/fireflies-client';
import { parseTranscriptEnhanced, MeetingTranscript } from '@/lib/integrations/notetaker';
import { getClients } from '@/lib/notion/clients';
import { createCaseNote, getCaseNotes } from '@/lib/notion/case-notes';
import { createTask } from '@/lib/notion/tasks';

interface CrawlResult {
  transcriptId: string;
  title: string;
  date: string;
  clientMatched: string | null;
  caseNoteCreated: boolean;
  caseNoteId?: string;
  tasksCreated: number;
  error?: string;
}

interface CrawlResponse {
  success: boolean;
  user: {
    name: string;
    email: string;
    userId: string;
  } | null;
  transcriptsFound: number;
  results: CrawlResult[];
  errors: string[];
}

/**
 * POST /api/fireflies/crawl
 *
 * Crawl Fireflies transcripts for a specific user and create case notes.
 *
 * Body:
 * - userName: string (required) - Name or email of the Fireflies user to crawl
 * - fromDate?: string - ISO date string for start of range
 * - toDate?: string - ISO date string for end of range
 * - maxTranscripts?: number - Maximum transcripts to fetch (default: 50)
 * - dryRun?: boolean - If true, preview without creating notes
 * - clientFilter?: string - Only process meetings for this client
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userName,
      fromDate,
      toDate,
      maxTranscripts = 50,
      dryRun = false,
      clientFilter,
    } = body;

    if (!userName) {
      return NextResponse.json(
        { error: 'userName is required' },
        { status: 400 }
      );
    }

    // Restrict crawling to Natasha Rofe's account only for case notes generation
    const ALLOWED_USER_EMAIL = 'natasha@pivotalconversations.com.au';
    const ALLOWED_USER_NAME = 'natasha rofe';
    const userNameLower = userName.toLowerCase();

    if (userNameLower !== ALLOWED_USER_NAME && userNameLower !== ALLOWED_USER_EMAIL) {
      return NextResponse.json(
        { error: 'Fireflies crawling is restricted to Natasha Rofe\'s account only' },
        { status: 403 }
      );
    }

    const apiKey = process.env.FIREFLIES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'FIREFLIES_API_KEY not configured' },
        { status: 500 }
      );
    }

    const response: CrawlResponse = {
      success: false,
      user: null,
      transcriptsFound: 0,
      results: [],
      errors: [],
    };

    // Initialize Fireflies client
    const client = new FirefliesClient(apiKey);

    // Get all clients from Notion for matching
    const notionClients = await getClients();
    const clientNames = notionClients.map(c => c.name);

    console.log(`[Fireflies Crawl] Starting crawl for user: ${userName}`);

    // Get transcripts for the user
    const { user, transcripts } = await client.getTranscriptsForUser(userName, {
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      maxTranscripts,
    });

    response.user = {
      name: user.name,
      email: user.email,
      userId: user.user_id,
    };
    response.transcriptsFound = transcripts.length;

    console.log(`[Fireflies Crawl] Found ${transcripts.length} transcripts for ${user.name}`);

    // Get existing case notes to avoid duplicates
    const existingNotes = await getCaseNotes({});
    const existingTitles = new Set(existingNotes.map(n => n.title.toLowerCase()));

    // Process each transcript
    for (const transcript of transcripts) {
      const result: CrawlResult = {
        transcriptId: transcript.id,
        title: transcript.title,
        date: transcript.dateString || new Date(transcript.date).toISOString(),
        clientMatched: null,
        caseNoteCreated: false,
        tasksCreated: 0,
      };

      try {
        // Try to match to a client
        const matchedClientName = client.extractClientFromMeeting(transcript, clientNames);
        result.clientMatched = matchedClientName;

        // If client filter is set, skip non-matching transcripts
        if (clientFilter && matchedClientName?.toLowerCase() !== clientFilter.toLowerCase()) {
          continue;
        }

        // Find the Notion client ID
        const matchedClient = matchedClientName
          ? notionClients.find(c => c.name.toLowerCase() === matchedClientName.toLowerCase())
          : null;

        // Check for duplicate
        const noteTitle = `[Meeting] ${transcript.title}`;
        if (existingTitles.has(noteTitle.toLowerCase())) {
          result.error = 'Duplicate - case note already exists';
          response.results.push(result);
          continue;
        }

        if (dryRun) {
          result.caseNoteCreated = false;
          result.error = 'Dry run - no note created';
          response.results.push(result);
          continue;
        }

        // Convert to MeetingTranscript format
        // Handle action_items which can be string or array
        let actionItems: string[] | undefined;
        if (transcript.summary?.action_items) {
          if (typeof transcript.summary.action_items === 'string') {
            // Split string action items by newlines
            actionItems = transcript.summary.action_items
              .split('\n')
              .map(s => s.trim())
              .filter(s => s.length > 0);
          } else {
            actionItems = transcript.summary.action_items;
          }
        }

        const meetingTranscript: MeetingTranscript = {
          id: transcript.id,
          title: transcript.title,
          date: new Date(transcript.date).toISOString(),
          duration: Math.round(transcript.duration / 60),
          participants: (transcript.meeting_attendees || []).map(a => a.displayName || a.name || a.email),
          transcript: client.formatTranscript(transcript.sentences),
          summary: transcript.summary?.overview,
          actionItems,
          source: 'fireflies',
          sourceUrl: transcript.transcript_url,
        };

        // Parse with AI enhancement
        const parsedNote = await parseTranscriptEnhanced(meetingTranscript, {
          useAI: true,
          clientContext: matchedClient ? { name: matchedClient.name } : undefined,
        });

        // Create the case note
        const caseNote = await createCaseNote({
          title: noteTitle,
          clientId: matchedClient?.id,
          type: parsedNote.type,
          source: 'Call',
          date: parsedNote.date,
          content: formatCaseNoteContent(transcript, parsedNote.content),
          autoGenerated: true,
        });

        if (caseNote) {
          result.caseNoteCreated = true;
          result.caseNoteId = caseNote.id;
          existingTitles.add(noteTitle.toLowerCase());

          // Create tasks from action items
          if (matchedClient && parsedNote.actionItems.length > 0) {
            for (const actionItem of parsedNote.actionItems) {
              try {
                const task = await createTask({
                  task: actionItem.task,
                  clientId: matchedClient.id,
                  status: 'To Do',
                  urgency: actionItem.urgency,
                  sourceCaseNoteId: caseNote.id,
                  notes: `Auto-generated from Fireflies meeting: ${transcript.title}`,
                });
                if (task) result.tasksCreated++;
              } catch (taskError) {
                console.error('[Fireflies Crawl] Task creation error:', taskError);
              }
            }
          }
        }
      } catch (error) {
        result.error = error instanceof Error ? error.message : 'Unknown error';
        response.errors.push(`${transcript.title}: ${result.error}`);
      }

      response.results.push(result);
    }

    response.success = true;

    const created = response.results.filter(r => r.caseNoteCreated).length;
    const tasks = response.results.reduce((sum, r) => sum + r.tasksCreated, 0);
    console.log(`[Fireflies Crawl] Complete: ${created} notes, ${tasks} tasks created`);

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Fireflies Crawl] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to crawl Fireflies',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/fireflies/crawl
 *
 * Get Fireflies users (for selecting who to crawl)
 */
export async function GET() {
  try {
    const apiKey = process.env.FIREFLIES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'FIREFLIES_API_KEY not configured' },
        { status: 500 }
      );
    }

    const client = new FirefliesClient(apiKey);
    const users = await client.getUsers();

    return NextResponse.json({
      success: true,
      users: users.map(u => ({
        userId: u.user_id,
        name: u.name,
        email: u.email,
        transcriptCount: u.num_transcripts,
        recentMeeting: u.recent_meeting,
      })),
    });
  } catch (error) {
    console.error('[Fireflies Users] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get Fireflies users' },
      { status: 500 }
    );
  }
}

/**
 * Format case note content with meeting details
 */
function formatCaseNoteContent(
  transcript: FirefliesTranscript,
  summary: string
): string {
  const lines: string[] = [];

  lines.push('**Meeting recorded via Fireflies.ai**\n');

  if (transcript.summary?.overview) {
    lines.push('## Overview');
    lines.push(transcript.summary.overview);
    lines.push('');
  }

  if (summary && summary !== transcript.summary?.overview) {
    lines.push('## Summary');
    lines.push(summary);
    lines.push('');
  }

  if (transcript.summary?.action_items) {
    lines.push('## Action Items');
    // action_items can be a string or array depending on the Fireflies response
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
  lines.push(`**Attendees:** ${transcript.meeting_attendees.map(a => a.displayName || a.name || a.email).join(', ')}`);
  lines.push(`**Duration:** ${Math.round(transcript.duration / 60)} minutes`);

  if (transcript.transcript_url) {
    lines.push(`**Transcript:** ${transcript.transcript_url}`);
  }

  if (transcript.video_url) {
    lines.push(`**Recording:** ${transcript.video_url}`);
  }

  return lines.join('\n');
}
