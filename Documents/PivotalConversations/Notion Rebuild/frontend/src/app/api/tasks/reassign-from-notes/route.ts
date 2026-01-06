import { NextRequest, NextResponse } from 'next/server';
import { getTasks } from '@/lib/notion/tasks';
import { getCaseNotes } from '@/lib/notion/case-notes';
import { getTeamMembers, TeamMember } from '@/lib/notion/team';
import { notion } from '@/lib/notion/client';

/**
 * Find team member by name (fuzzy match)
 */
function findTeamMemberByName(name: string, teamMembers: TeamMember[]): TeamMember | undefined {
  const normalizedName = name.toLowerCase().trim();

  // Exact match
  const exactMatch = teamMembers.find(m => m.name.toLowerCase() === normalizedName);
  if (exactMatch) return exactMatch;

  // First name match
  const firstName = normalizedName.split(/\s+/)[0];
  const firstNameMatch = teamMembers.find(
    m => m.name.toLowerCase().split(/\s+/)[0] === firstName
  );
  if (firstNameMatch) return firstNameMatch;

  // Partial match
  const partialMatch = teamMembers.find(
    m => m.name.toLowerCase().includes(normalizedName) ||
         normalizedName.includes(m.name.toLowerCase().split(/\s+/)[0])
  );
  return partialMatch;
}

/**
 * Extract assignee for a task from case note content by finding
 * which speaker header section the task appears under
 */
function findAssigneeFromCaseNote(
  taskText: string,
  caseNoteContent: string,
  teamMembers: TeamMember[]
): TeamMember | undefined {
  // Normalize task text for matching (remove timestamps)
  const normalizedTask = taskText
    .toLowerCase()
    .replace(/\s*\(\d{1,2}:\d{2}(:\d{2})?\)\s*$/g, '')
    .trim();

  // Split content into lines
  const lines = caseNoteContent.split('\n');

  let currentSpeaker: string | undefined;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for speaker header (e.g., **Natasha Rofe** or **Kyle Traynor**)
    const speakerMatch = trimmed.match(/^\*\*([^*]+)\*\*$/);
    if (speakerMatch) {
      currentSpeaker = speakerMatch[1].trim();
      continue;
    }

    // Check if this line contains our task (fuzzy match)
    const normalizedLine = trimmed
      .toLowerCase()
      .replace(/^[-•*]\s*/, '')
      .replace(/\s*\(\d{1,2}:\d{2}(:\d{2})?\)\s*$/g, '')
      .trim();

    // Check for substantial overlap (at least 50 chars match or 80% of shorter string)
    const minLength = Math.min(normalizedLine.length, normalizedTask.length);
    if (minLength > 20) {
      // Check if one contains the other or if they start the same way
      if (normalizedLine.includes(normalizedTask.substring(0, 40)) ||
          normalizedTask.includes(normalizedLine.substring(0, 40))) {
        if (currentSpeaker) {
          return findTeamMemberByName(currentSpeaker, teamMembers);
        }
      }
    }
  }

  return undefined;
}

/**
 * GET /api/tasks/reassign-from-notes
 *
 * Preview which tasks can be reassigned based on their source case note
 */
export async function GET() {
  try {
    const [tasks, caseNotes, teamMembers] = await Promise.all([
      getTasks(),
      getCaseNotes({}),
      getTeamMembers(),
    ]);

    // Create a map of case note ID to content
    const caseNoteMap = new Map<string, string>();
    for (const note of caseNotes) {
      if (note.fullNote) {
        caseNoteMap.set(note.id, note.fullNote);
      }
    }

    // Find unassigned tasks that have a source case note
    const unassignedTasks = tasks.filter(
      t => !t.assignedTo && t.status !== 'Complete' && t.sourceCaseNoteId
    );

    const assignments: Array<{
      id: string;
      task: string;
      detectedAssignee: string;
      memberId: string;
      caseNoteTitle: string;
    }> = [];

    for (const task of unassignedTasks) {
      const caseNoteContent = caseNoteMap.get(task.sourceCaseNoteId!);
      if (!caseNoteContent) continue;

      const member = findAssigneeFromCaseNote(task.task, caseNoteContent, teamMembers);
      if (member && member.id && !member.id.startsWith('team-member-')) {
        const caseNote = caseNotes.find(n => n.id === task.sourceCaseNoteId);
        assignments.push({
          id: task.id,
          task: task.task,
          detectedAssignee: member.name,
          memberId: member.id,
          caseNoteTitle: caseNote?.title || 'Unknown',
        });
      }
    }

    return NextResponse.json({
      totalUnassigned: unassignedTasks.length,
      canAssign: assignments.length,
      assignments,
    });
  } catch (error) {
    console.error('[Tasks Reassign] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze tasks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks/reassign-from-notes
 *
 * Actually reassign tasks based on their source case note speaker headers
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const confirm = searchParams.get('confirm');

    if (confirm !== 'true') {
      return NextResponse.json(
        { error: 'Add ?confirm=true to actually assign tasks. Use GET first to preview.' },
        { status: 400 }
      );
    }

    const [tasks, caseNotes, teamMembers] = await Promise.all([
      getTasks(),
      getCaseNotes({}),
      getTeamMembers(),
    ]);

    // Create a map of case note ID to content
    const caseNoteMap = new Map<string, string>();
    for (const note of caseNotes) {
      if (note.fullNote) {
        caseNoteMap.set(note.id, note.fullNote);
      }
    }

    // Find unassigned tasks that have a source case note
    const unassignedTasks = tasks.filter(
      t => !t.assignedTo && t.status !== 'Complete' && t.sourceCaseNoteId
    );

    const assigned: string[] = [];
    const errors: string[] = [];

    for (const task of unassignedTasks) {
      const caseNoteContent = caseNoteMap.get(task.sourceCaseNoteId!);
      if (!caseNoteContent) continue;

      const member = findAssigneeFromCaseNote(task.task, caseNoteContent, teamMembers);
      if (member && member.id && !member.id.startsWith('team-member-')) {
        try {
          await notion.pages.update({
            page_id: task.id,
            properties: {
              'Assigned To': { people: [{ id: member.id }] },
            },
          });

          assigned.push(`${task.task.substring(0, 60)}... -> ${member.name}`);
        } catch (error) {
          errors.push(`Failed to assign "${task.task.substring(0, 40)}...": ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      assignedCount: assigned.length,
      assigned,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[Tasks Reassign] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to assign tasks' },
      { status: 500 }
    );
  }
}
