import { NextRequest, NextResponse } from 'next/server';
import { getTasks } from '@/lib/notion/tasks';
import { getTeamMembers, TeamMember } from '@/lib/notion/team';
import { notion } from '@/lib/notion/client';

/**
 * Extract assignee from task text by analyzing who should DO the task
 *
 * Key insight: Just because a name appears in a task doesn't mean that person should do it.
 * - "Provide Natasha with guidance" → Someone ELSE provides TO Natasha (she's the recipient)
 * - "Natasha to provide guidance" → Natasha provides (she's the doer)
 * - "[Name] will [action]" → Name is the doer
 * - "[Name] to [action]" at start → Name is the doer
 *
 * This function is CONSERVATIVE - it only assigns when there's clear indication
 * the person IS the doer, not just mentioned in the task.
 */
function extractAssigneeFromTaskText(taskText: string, teamMembers: TeamMember[]): TeamMember | undefined {
  const lowerText = taskText.toLowerCase().trim();

  for (const member of teamMembers) {
    const firstName = member.name.toLowerCase().split(/\s+/)[0];
    const fullName = member.name.toLowerCase();

    // Patterns where the person IS the doer (they need to perform the action)
    const doerPatterns = [
      // Task starts with "[Name] to [verb]" - Name is the doer
      new RegExp(`^${firstName}\\s+to\\s+\\w+`, 'i'),
      new RegExp(`^${fullName}\\s+to\\s+\\w+`, 'i'),
      // "[Name] will [verb]" - Name is the doer
      new RegExp(`\\b${firstName}\\s+will\\s+\\w+`, 'i'),
      new RegExp(`\\b${fullName}\\s+will\\s+\\w+`, 'i'),
      // "[Name] should [verb]" - Name is the doer
      new RegExp(`\\b${firstName}\\s+should\\s+\\w+`, 'i'),
      // "[Name] needs to [verb]" - Name is the doer
      new RegExp(`\\b${firstName}\\s+needs?\\s+to\\s+\\w+`, 'i'),
      // "Ask [Name] to" or "Have [Name]" - Name is the doer
      new RegExp(`\\bask\\s+${firstName}\\s+to\\b`, 'i'),
      new RegExp(`\\bhave\\s+${firstName}\\s+\\w+`, 'i'),
    ];

    // Patterns where the person is the RECIPIENT (they should NOT be assigned)
    const recipientPatterns = [
      // "Provide [Name] with" - Name receives something
      new RegExp(`\\bprovide\\s+${firstName}\\s+with\\b`, 'i'),
      // "Update [Name] on" - Name receives update
      new RegExp(`\\bupdate\\s+${firstName}\\s+(on|about|with)\\b`, 'i'),
      // "Inform/Notify [Name]" - Name receives info
      new RegExp(`\\b(inform|notify|advise|tell)\\s+${firstName}\\b`, 'i'),
      // "Send to [Name]" - Name receives something
      new RegExp(`\\bsend\\s+(to\\s+)?${firstName}\\b`, 'i'),
      // "for [Name]'s review" - Name reviews but task is preparation
      new RegExp(`\\bfor\\s+${firstName}'s\\s+(review|approval|feedback)\\b`, 'i'),
      // "with [Name]" in middle of sentence - typically collaboration, not assignment
      new RegExp(`\\s+with\\s+${firstName}\\b`, 'i'),
    ];

    // First check if person is clearly a recipient - if so, skip them
    const isRecipient = recipientPatterns.some(pattern => pattern.test(lowerText));
    if (isRecipient) {
      continue;
    }

    // Check if person is clearly the doer
    const isDoer = doerPatterns.some(pattern => pattern.test(lowerText));
    if (isDoer) {
      return member;
    }
  }

  return undefined;
}

/**
 * GET /api/tasks/assign-from-text
 *
 * Preview which tasks would be assigned based on their text
 */
export async function GET() {
  try {
    const [tasks, teamMembers] = await Promise.all([
      getTasks(),
      getTeamMembers(),
    ]);

    // Find tasks without assignees that could be assigned
    const unassignedTasks = tasks.filter(t => !t.assignedTo && t.status !== 'Complete');

    const assignments: Array<{
      id: string;
      task: string;
      detectedAssignee: string;
      memberId: string;
    }> = [];

    for (const task of unassignedTasks) {
      const member = extractAssigneeFromTaskText(task.task, teamMembers);
      if (member) {
        assignments.push({
          id: task.id,
          task: task.task,
          detectedAssignee: member.name,
          memberId: member.id,
        });
      }
    }

    return NextResponse.json({
      totalUnassigned: unassignedTasks.length,
      canAssign: assignments.length,
      assignments,
    });
  } catch (error) {
    console.error('[Tasks Assign] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze tasks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks/assign-from-text
 *
 * Actually assign tasks based on their text content
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

    const [tasks, teamMembers] = await Promise.all([
      getTasks(),
      getTeamMembers(),
    ]);

    // Find tasks without assignees
    const unassignedTasks = tasks.filter(t => !t.assignedTo && t.status !== 'Complete');

    const assigned: string[] = [];
    const errors: string[] = [];

    for (const task of unassignedTasks) {
      const member = extractAssigneeFromTaskText(task.task, teamMembers);
      if (member && member.id && !member.id.startsWith('team-member-')) {
        try {
          // Update directly via Notion API
          await notion.pages.update({
            page_id: task.id,
            properties: {
              'Assigned To': { people: [{ id: member.id }] },
            },
          });

          assigned.push(`${task.task} -> ${member.name}`);
        } catch (error) {
          errors.push(`Failed to assign "${task.task}": ${error instanceof Error ? error.message : 'Unknown'}`);
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
    console.error('[Tasks Assign] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to assign tasks' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/assign-from-text
 *
 * Unassign tasks that were incorrectly auto-assigned
 * This removes assignees from tasks where the person is mentioned as a RECIPIENT
 * not as the person who should DO the task.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const confirm = searchParams.get('confirm');

    const [tasks, teamMembers] = await Promise.all([
      getTasks(),
      getTeamMembers(),
    ]);

    // Find tasks WITH assignees that might be incorrectly assigned
    const assignedTasks = tasks.filter(t => t.assignedTo && t.status !== 'Complete');

    const toUnassign: Array<{
      id: string;
      task: string;
      currentAssignee: string;
      reason: string;
    }> = [];

    for (const task of assignedTasks) {
      const lowerText = task.task.toLowerCase().trim();

      // Find the assigned member
      const assignedMember = teamMembers.find(m => m.name === task.assignedTo);
      if (!assignedMember) continue;

      const firstName = assignedMember.name.toLowerCase().split(/\s+/)[0];

      // Check if this person is mentioned as a RECIPIENT (incorrectly assigned)
      const recipientPatterns = [
        { pattern: new RegExp(`\\bprovide\\s+${firstName}\\s+with\\b`, 'i'), reason: 'Recipient of "provide X with"' },
        { pattern: new RegExp(`\\bupdate\\s+${firstName}\\s+(on|about|with)\\b`, 'i'), reason: 'Recipient of update' },
        { pattern: new RegExp(`\\b(inform|notify|advise|tell)\\s+${firstName}\\b`, 'i'), reason: 'Recipient of notification' },
        { pattern: new RegExp(`\\bsend\\s+(to\\s+)?${firstName}\\b`, 'i'), reason: 'Recipient of send' },
        { pattern: new RegExp(`\\bfor\\s+${firstName}'s\\s+(review|approval|feedback)\\b`, 'i'), reason: 'Recipient for review' },
        { pattern: new RegExp(`\\bconsult\\s+with\\s+${firstName}\\b`, 'i'), reason: 'Person to consult (not doer)' },
        { pattern: new RegExp(`\\bwork\\s+with\\s+${firstName}\\b`, 'i'), reason: 'Collaborator mention' },
      ];

      for (const { pattern, reason } of recipientPatterns) {
        if (pattern.test(lowerText)) {
          toUnassign.push({
            id: task.id,
            task: task.task,
            currentAssignee: task.assignedTo!, // We filtered for tasks with assignedTo above
            reason,
          });
          break;
        }
      }
    }

    // Preview mode
    if (confirm !== 'true') {
      return NextResponse.json({
        preview: true,
        totalAssigned: assignedTasks.length,
        toUnassign: toUnassign.length,
        tasks: toUnassign,
        message: 'Add ?confirm=true to actually unassign these tasks',
      });
    }

    // Actually unassign
    const unassigned: string[] = [];
    const errors: string[] = [];

    for (const task of toUnassign) {
      try {
        await notion.pages.update({
          page_id: task.id,
          properties: {
            'Assigned To': { people: [] },
          },
        });
        unassigned.push(`${task.task} (was: ${task.currentAssignee}, reason: ${task.reason})`);
      } catch (error) {
        errors.push(`Failed to unassign "${task.task}": ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    return NextResponse.json({
      success: true,
      unassignedCount: unassigned.length,
      unassigned,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[Tasks Unassign] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to unassign tasks' },
      { status: 500 }
    );
  }
}
