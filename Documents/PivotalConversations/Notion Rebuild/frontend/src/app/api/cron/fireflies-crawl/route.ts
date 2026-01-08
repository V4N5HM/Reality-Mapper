import { NextRequest, NextResponse } from 'next/server';
import { FirefliesClient, FirefliesTranscript, FirefliesUser } from '@/lib/integrations/fireflies-client';
import { getClients } from '@/lib/notion/clients';
import { createCaseNote, getCaseNotes } from '@/lib/notion/case-notes';
import { sendSlackMessage } from '@/lib/slack/client';
import { notion, databases, getRichText } from '@/lib/notion/client';
import { getTeamMembersByTeam, getTeamMembers } from '@/lib/notion/team';

/**
 * GET /api/cron/fireflies-crawl
 *
 * Daily cron job to crawl Fireflies for new meeting transcripts
 * and automatically create case notes.
 *
 * Behavior:
 * 1. ALWAYS crawls Natasha's Fireflies meetings (for Personal Brand team)
 * 2. Also crawls any other team members who have linked their Fireflies account
 * 3. Tags each case note with the owner (firefliesOwnerId/firefliesOwnerEmail)
 *
 * Runs daily at 7 AM AEST (configurable in vercel.json)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.FIREFLIES_API_KEY;
    if (!apiKey) {
      console.log('[Fireflies Cron] No API key configured, skipping');
      return NextResponse.json({ skipped: true, reason: 'No API key' });
    }

    console.log('[Fireflies Cron] Starting daily crawl...');

    const client = new FirefliesClient(apiKey);

    // Get all Fireflies users from the team account
    const firefliesUsers = await client.getUsers();
    const firefliesUserMap = new Map(firefliesUsers.map(u => [u.user_id, u]));
    const firefliesUserByEmail = new Map(firefliesUsers.map(u => [u.email.toLowerCase(), u]));
    const firefliesUserByName = new Map(firefliesUsers.map(u => [u.name.toLowerCase(), u]));

    // Get Personal Brand team members from Notion - they're always crawled
    const personalBrandMembers = await getTeamMembersByTeam('Personal Brand');
    console.log('[Fireflies Cron] Personal Brand team members:', personalBrandMembers.map(m => m.email));

    // Get all team members who have linked their Fireflies account
    const linkedTeamMembers = await getLinkedFirefliesUsers();

    // Build list of users to process
    // ALWAYS include Personal Brand team members (no link date restriction)
    const usersToProcess: Array<{
      firefliesUser: FirefliesUser;
      linkedAt: Date | null; // null for Personal Brand team (always crawled)
      teamMemberName: string;
      teamMemberId: string;
      teamMemberEmail: string;
      isPersonalBrand: boolean;
    }> = [];

    // Add Personal Brand team members first (always crawled, no link date restriction)
    const processedEmails = new Set<string>();
    for (const member of personalBrandMembers) {
      const emailLower = member.email.toLowerCase();
      const nameLower = member.name.toLowerCase();

      const firefliesUser = firefliesUserByEmail.get(emailLower)
        || firefliesUserByName.get(nameLower);

      if (firefliesUser && firefliesUser.num_transcripts > 0) {
        usersToProcess.push({
          firefliesUser,
          linkedAt: null, // No link date restriction for Personal Brand team
          teamMemberName: member.name,
          teamMemberId: member.id,
          teamMemberEmail: member.email,
          isPersonalBrand: true,
        });
        processedEmails.add(emailLower);
        console.log(`[Fireflies Cron] Added Personal Brand team member: ${member.name}`);
      }
    }

    // Add all other linked team members (except Personal Brand who are already added)
    for (const member of linkedTeamMembers) {
      // Skip if already added (Personal Brand team)
      if (processedEmails.has(member.email.toLowerCase())) {
        continue;
      }

      const firefliesUser = firefliesUserMap.get(member.firefliesUserId);
      if (firefliesUser && firefliesUser.num_transcripts > 0) {
        usersToProcess.push({
          firefliesUser,
          linkedAt: new Date(member.firefliesLinkedAt),
          teamMemberName: member.name,
          teamMemberId: member.id,
          teamMemberEmail: member.email,
          isPersonalBrand: false,
        });
        processedEmails.add(member.email.toLowerCase());
      }
    }

    if (usersToProcess.length === 0) {
      console.log('[Fireflies Cron] No users to process (not even Natasha found)');
      return NextResponse.json({
        success: true,
        message: 'No Fireflies users to process',
        usersProcessed: 0,
      });
    }

    console.log(`[Fireflies Cron] Processing ${usersToProcess.length} users`);

    // Get existing case notes to avoid duplicates
    const existingNotes = await getCaseNotes({});
    const existingTitles = new Set(existingNotes.map(n => n.title.toLowerCase()));

    // Get clients for matching
    const notionClients = await getClients();
    const clientNames = notionClients.map(c => c.name);

    // Crawl transcripts from the last 2 days to catch any missed meetings
    // This ensures meetings transcribed after the previous cron run are still picked up
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const results = {
      usersProcessed: 0,
      transcriptsFound: 0,
      caseNotesCreated: 0,
      tasksCreated: 0,
      errors: [] as string[],
      byUser: [] as Array<{
        userName: string;
        transcripts: number;
        notesCreated: number;
        tasks: number;
      }>,
    };

    // Process each user (Personal Brand team + all linked team members)
    for (const { firefliesUser, linkedAt, teamMemberName, teamMemberId, teamMemberEmail, isPersonalBrand } of usersToProcess) {
      try {
        console.log(`[Fireflies Cron] Processing user: ${teamMemberName} (${firefliesUser.name})${isPersonalBrand ? ' [Personal Brand - always crawled]' : ''}`);

        // Use the later of: twoDaysAgo OR the user's link date
        // For Personal Brand team (linkedAt is null), always use twoDaysAgo
        let effectiveFromDate = twoDaysAgo;
        if (linkedAt && linkedAt > twoDaysAgo) {
          effectiveFromDate = linkedAt;
        }

        const transcripts = await client.getTranscripts({
          userId: firefliesUser.user_id,
          fromDate: effectiveFromDate,
          toDate: today,
          limit: 50,
        });

        const userResult = {
          userName: teamMemberName,
          transcripts: transcripts.length,
          notesCreated: 0,
          tasks: 0,
        };

        results.transcriptsFound += transcripts.length;

        for (const transcript of transcripts) {
          try {
            // Skip if duplicate
            const noteTitle = `[Meeting] ${transcript.title}`;
            if (existingTitles.has(noteTitle.toLowerCase())) {
              continue;
            }

            // Match to client
            const matchedClientName = client.extractClientFromMeeting(transcript, clientNames);
            const matchedClient = matchedClientName
              ? notionClients.find(c => c.name.toLowerCase() === matchedClientName.toLowerCase())
              : null;

            // FILTER: Skip meetings that don't match a client AND don't involve special people
            const involvesSpecialPeople = meetingInvolvesSpecialPeople(transcript);
            if (!matchedClient && !involvesSpecialPeople) {
              console.log(`[Fireflies Cron] Skipping meeting (no client match, no special people): ${transcript.title}`);
              continue;
            }

            // Format content
            const content = formatMeetingContent(transcript, client);

            // Create case note with owner info for filtering
            // This allows team members to see only their own Fireflies notes
            // Personal Brand team can see Natasha's notes
            const caseNote = await createCaseNote({
              title: noteTitle,
              clientId: matchedClient?.id,
              type: 'Internal Note',
              source: 'Call',
              date: new Date(transcript.date).toISOString().split('T')[0],
              content,
              autoGenerated: true,
              // Tag the meeting with its owner for filtering
              firefliesOwnerId: teamMemberId,
              firefliesOwnerEmail: teamMemberEmail,
            });

            if (caseNote) {
              userResult.notesCreated++;
              results.caseNotesCreated++;
              existingTitles.add(noteTitle.toLowerCase());

              // Tasks are NOT auto-created from action items anymore
              // Users should manually create tasks from the case notes tab with proper assignee selection
              // Action items are included in the case note content for reference
            }
          } catch (transcriptError) {
            const errorMsg = `Error processing transcript ${transcript.title}: ${transcriptError instanceof Error ? transcriptError.message : 'Unknown'}`;
            results.errors.push(errorMsg);
          }
        }

        results.byUser.push(userResult);
        results.usersProcessed++;

        // Rate limiting between users
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (userError) {
        results.errors.push(`Error processing user ${teamMemberName}: ${userError instanceof Error ? userError.message : 'Unknown'}`);
      }
    }

    // Send Slack summary if we created anything
    if (results.caseNotesCreated > 0) {
      try {
        const userSummary = results.byUser
          .filter(u => u.notesCreated > 0)
          .map(u => `• ${u.userName}: ${u.notesCreated} notes, ${u.tasks} tasks`)
          .join('\n');

        await sendSlackMessage({
          channel: process.env.SLACK_DEFAULT_CHANNEL || '#pivotal-alerts',
          text: `*Fireflies Daily Sync Complete*\n\n` +
            `Created ${results.caseNotesCreated} case notes and ${results.tasksCreated} tasks from yesterday's meetings.\n\n` +
            userSummary,
        });
      } catch {
        // Non-critical, continue
      }
    }

    console.log(`[Fireflies Cron] Complete: ${results.caseNotesCreated} notes, ${results.tasksCreated} tasks`);

    // Also trigger daily check-in tasks (since both run at 8am Melbourne time)
    // This allows us to stay within the 2 cron job limit on Vercel free plan
    let checkinTasksResult = null;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://personalbrandpc.vercel.app';
      const checkinResponse = await fetch(`${baseUrl}/api/cron/checkin-tasks`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`,
        },
      });
      checkinTasksResult = await checkinResponse.json();
      console.log('[Fireflies Cron] Also triggered check-in tasks:', checkinTasksResult);
    } catch (checkinError) {
      console.error('[Fireflies Cron] Failed to trigger check-in tasks:', checkinError);
    }

    // Also trigger Slack crawl (to stay within 2 cron job limit)
    let slackCrawlResult = null;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://personalbrandpc.vercel.app';
      const slackResponse = await fetch(`${baseUrl}/api/slack/crawl/scheduled`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`,
        },
      });
      slackCrawlResult = await slackResponse.json();
      console.log('[Fireflies Cron] Also triggered Slack crawl:', slackCrawlResult);
    } catch (slackError) {
      console.error('[Fireflies Cron] Failed to trigger Slack crawl:', slackError);
    }

    return NextResponse.json({
      success: true,
      ...results,
      checkinTasks: checkinTasksResult,
      slackCrawl: slackCrawlResult,
    });
  } catch (error) {
    console.error('[Fireflies Cron] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron job failed' },
      { status: 500 }
    );
  }
}

/**
 * Format meeting transcript content
 */
function formatMeetingContent(
  transcript: FirefliesTranscript,
  client: FirefliesClient
): string {
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

type TaskUrgency = 'Urgent' | 'This Week' | 'This Month' | 'Backlog';

// Known team member names to filter out
const KNOWN_TEAM_NAMES = [
  'natasha', 'natasha rofe',
  'kyle', 'kyle johnson', 'kyle traynor',
  'justin', 'justin smith',
  'olivia', 'olivia jones',
  'louise', 'louise williams', 'laura', 'laura williams',
  'xandrino', 'lottie', 'vansh',
  'eddie', 'eddie dong',
  'christian', 'christian stevens', 'christian stephens',
  'mark', 'mark kentwell',
  'ella', 'ella cas',
];

// Special people whose meetings should always be processed (even without client match)
const ALWAYS_INCLUDE_PEOPLE = [
  'sam gordon', 'sam',
  'jack henderson', 'jack',
  'stephen ash', 'stephen',
];

/**
 * Check if a meeting involves one of the special people who should always be included
 */
function meetingInvolvesSpecialPeople(transcript: FirefliesTranscript): boolean {
  const titleLower = transcript.title.toLowerCase();

  // Check if any special person name appears in title
  for (const person of ALWAYS_INCLUDE_PEOPLE) {
    if (titleLower.includes(person)) {
      return true;
    }
  }

  // Check attendees
  for (const attendee of transcript.meeting_attendees || []) {
    const attendeeName = (attendee.displayName || attendee.name || '').toLowerCase();
    const attendeeEmail = (attendee.email || '').toLowerCase();

    for (const person of ALWAYS_INCLUDE_PEOPLE) {
      if (attendeeName.includes(person) || attendeeEmail.includes(person)) {
        return true;
      }
    }
  }

  // Check speakers
  for (const speaker of transcript.speakers || []) {
    const speakerName = (speaker.name || '').toLowerCase();
    for (const person of ALWAYS_INCLUDE_PEOPLE) {
      if (speakerName.includes(person)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Parse Fireflies action items which come as formatted text with speaker headers
 * Format example:
 * **Speaker Name**
 * - Action item text (0:15)
 */
function parseFirefliesActionItems(
  actionItems: string | string[]
): Array<{ task: string; urgency: TaskUrgency; assignee?: string }> {
  const items: Array<{ task: string; urgency: TaskUrgency; assignee?: string }> = [];

  // Handle array format
  if (Array.isArray(actionItems)) {
    for (const item of actionItems) {
      if (typeof item === 'string') {
        // Clean the item first
        const cleaned = cleanTaskText(item);
        if (cleaned && isValidActionItem(cleaned)) {
          items.push({
            task: cleaned,
            urgency: determineUrgency(cleaned),
          });
        }
      }
    }
    return items;
  }

  // Handle string format (Fireflies formatted text)
  if (!actionItems || typeof actionItems !== 'string') return items;

  const lines = actionItems.split('\n');
  let currentAssignee: string | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if this is a speaker/assignee header (e.g., **Eddie Dong** or **Kyle**)
    const speakerMatch = trimmed.match(/^\*\*([^*]+)\*\*$/);
    if (speakerMatch) {
      currentAssignee = speakerMatch[1].trim();
      continue;
    }

    // Skip lines that are just names (like "Christian Stevens")
    if (isLikelyNameOnly(trimmed)) {
      currentAssignee = trimmed;
      continue;
    }

    // Clean the text
    const taskText = cleanTaskText(trimmed);
    if (!taskText) continue;

    // Validate this is a real action item
    if (!isValidActionItem(taskText)) continue;

    items.push({
      task: taskText,
      urgency: determineUrgency(taskText),
      assignee: currentAssignee,
    });
  }

  return items;
}

/**
 * Clean task text - remove timestamps, asterisks, and other formatting
 */
function cleanTaskText(text: string): string | null {
  let cleaned = text.trim();

  // Remove markdown bold markers at start/end
  cleaned = cleaned.replace(/^\*\*/, '').replace(/\*\*$/, '');

  // Remove timestamp at end (e.g., "(0:15)" or "(12:34:56)")
  cleaned = cleaned.replace(/\s*\(\d{1,2}:\d{2}(:\d{2})?\)\s*$/, '');

  // Remove leading bullet points or dashes
  cleaned = cleaned.replace(/^[-•*]\s*/, '');

  cleaned = cleaned.trim();

  // Skip if too short
  if (cleaned.length < 15) return null;

  // Skip if it's a known team name
  if (isKnownName(cleaned)) return null;

  return cleaned;
}

/**
 * Check if text matches a known team member name
 */
function isKnownName(text: string): boolean {
  const lower = text.toLowerCase().trim();

  // Direct match with known names
  if (KNOWN_TEAM_NAMES.includes(lower)) return true;

  // Check if text is ONLY a name (with possible asterisks)
  const withoutAsterisks = lower.replace(/\*/g, '').trim();
  if (KNOWN_TEAM_NAMES.includes(withoutAsterisks)) return true;

  return false;
}

/**
 * Check if text is likely just a person's name (not an action item)
 */
function isLikelyNameOnly(text: string): boolean {
  // First check against known names
  if (isKnownName(text)) return true;

  // Remove any asterisks for checking
  const cleanText = text.replace(/\*/g, '').trim();
  if (isKnownName(cleanText)) return true;

  const words = cleanText.split(/\s+/);

  // More than 4 words is probably not just a name
  if (words.length > 4) return false;

  // Check for action verbs
  const actionVerbs = [
    'create', 'update', 'send', 'review', 'follow', 'schedule', 'prepare',
    'complete', 'submit', 'check', 'fix', 'add', 'remove', 'implement',
    'discuss', 'contact', 'email', 'call', 'organize', 'plan', 'draft',
    'finalize', 'share', 'upload', 'download', 'research', 'analyze',
    'set up', 'follow up', 'reach out', 'look into', 'work on', 'monitor',
    'advise', 'consult', 'develop', 'conduct', 'provide', 'assist',
  ];

  const lowerText = cleanText.toLowerCase();
  if (actionVerbs.some(verb => lowerText.includes(verb))) {
    return false;
  }

  // If it's 1-3 words and all capitalized (like "Christian Stevens"), it's probably a name
  if (words.length >= 1 && words.length <= 3) {
    const allCapitalized = words.every(w => w.length > 0 && w[0] === w[0].toUpperCase());
    if (allCapitalized) return true;
  }

  return false;
}

/**
 * Check if text is a valid action item
 */
function isValidActionItem(text: string): boolean {
  // First, reject if it's a known name
  if (isKnownName(text)) return false;

  const actionWords = [
    'create', 'update', 'send', 'review', 'follow', 'schedule', 'prepare',
    'complete', 'submit', 'check', 'fix', 'add', 'remove', 'implement',
    'discuss', 'contact', 'email', 'call', 'organize', 'plan', 'draft',
    'finalize', 'share', 'upload', 'download', 'research', 'analyze',
    'set up', 'follow up', 'reach out', 'look into', 'work on', 'make sure',
    'ensure', 'confirm', 'book', 'meet', 'write', 'edit', 'revise',
    'arrange', 'coordinate', 'investigate', 'resolve', 'address',
    'need to', 'should', 'will', 'going to', 'must', 'have to',
    'monitor', 'advise', 'consult', 'develop', 'conduct', 'provide',
    'assist', 'continue', 'decide', 'film', 'identify', 'encourage',
    'explore', 'communicate', 'prioritize', 'leverage', 'propose',
    'brainstorm', 'support', 'use', 'respond',
  ];

  const lowerText = text.toLowerCase();

  // Must contain at least one action word
  const hasActionWord = actionWords.some(word => lowerText.includes(word));

  // Must be reasonable length
  const reasonableLength = text.length >= 15 && text.length <= 300;

  // Should not be just a conversation snippet or name
  const badPatterns = [
    /^(yes|no|ok|okay|sure|thanks|thank you|hi|hello|hey|bye|goodbye)/i,
    /^(um|uh|ah|oh|hmm|well|so|like|you know)/i,
    /^(I think|I mean|I guess|I don't know)/i,
    /^\d+$/,
    /^[^a-zA-Z]*$/,
    /^\*\*[^*]+\*\*$/, // Just a bolded name like **Kyle**
    /^[A-Z][a-z]+\s*$/, // Single capitalized word (likely a name)
    /^[A-Z][a-z]+\s+[A-Z][a-z]+\s*$/, // Two capitalized words (likely a name)
  ];

  const hasBadPattern = badPatterns.some(pattern => pattern.test(text));

  return hasActionWord && reasonableLength && !hasBadPattern;
}

/**
 * Determine urgency based on task content
 */
function determineUrgency(text: string): TaskUrgency {
  const urgentPatterns = [
    /urgent/i, /asap/i, /immediately/i, /today/i, /right away/i,
    /critical/i, /emergency/i, /priority/i, /deadline/i,
  ];

  const lowerText = text.toLowerCase();

  if (urgentPatterns.some(pattern => pattern.test(lowerText))) {
    return 'Urgent';
  }

  if (lowerText.includes('this week') || lowerText.includes('by friday') || lowerText.includes('before friday')) {
    return 'This Week';
  }

  if (lowerText.includes('this month') || lowerText.includes('end of month') || lowerText.includes('by end of')) {
    return 'This Month';
  }

  // Default to This Week for newly created tasks
  return 'This Week';
}

// Note: Team member assignment functions removed - tasks are now created manually
// from the case notes tab where users can assign team members directly

/**
 * Get all team members who have linked their Fireflies account
 */
async function getLinkedFirefliesUsers(): Promise<Array<{
  id: string;
  name: string;
  email: string;
  firefliesUserId: string;
  firefliesUserName: string;
  firefliesLinkedAt: string;
}>> {
  if (!databases.teamMembers) {
    return [];
  }

  try {
    // Query all team members who have a Fireflies User ID set
    const response = await notion.databases.query({
      database_id: databases.teamMembers,
      filter: {
        property: 'Fireflies User ID',
        rich_text: {
          is_not_empty: true,
        },
      },
    });

    const linkedUsers: Array<{
      id: string;
      name: string;
      email: string;
      firefliesUserId: string;
      firefliesUserName: string;
      firefliesLinkedAt: string;
    }> = [];

    for (const page of response.results) {
      const p = page as any;
      const firefliesUserId = getRichText(p.properties['Fireflies User ID']?.rich_text || []);
      const firefliesLinkedAt = p.properties['Fireflies Linked At']?.date?.start;

      // Only include if they have both a user ID and link date
      if (firefliesUserId && firefliesLinkedAt) {
        linkedUsers.push({
          id: page.id,
          name: p.properties['Name']?.title?.[0]?.plain_text || 'Unknown',
          email: p.properties['Email']?.email || '',
          firefliesUserId,
          firefliesUserName: getRichText(p.properties['Fireflies User Name']?.rich_text || []) || '',
          firefliesLinkedAt,
        });
      }
    }

    return linkedUsers;
  } catch (error) {
    console.error('[Fireflies Cron] Error fetching linked users:', error);
    return [];
  }
}
