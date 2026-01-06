import { NextRequest, NextResponse } from 'next/server';
import { notion, DATABASE_IDS } from '@/lib/notion/client';
import { getTeamMembers } from '@/lib/notion/team';

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured');
    return true; // Allow in development
  }

  return authHeader === `Bearer ${cronSecret}`;
}

// GET - Create daily check-in tasks for all team members
// Should run at 8am Melbourne time daily
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const results: { created: string[]; skipped: string[] } = { created: [], skipped: [] };

    // Get all team members
    const teamMembers = await getTeamMembers();

    // Skip weekends (Saturday = 6, Sunday = 0)
    const dayOfWeek = today.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json({
        success: true,
        message: 'Skipped - weekend',
        date: todayStr,
      });
    }

    for (const member of teamMembers) {
      const taskTitle = `Daily Check-in - ${member.name}`;

      // Check if task already exists for today
      const existingTask = await checkExistingCheckinTask(member.id, todayStr);
      if (existingTask) {
        results.skipped.push(`${member.name} (task already exists)`);
        continue;
      }

      // Create the task
      await createCheckinTask({
        title: taskTitle,
        teamMemberId: member.id,
        teamMemberName: member.name,
        dueDate: todayStr,
        notionUserId: member.id,
      });

      results.created.push(member.name);
    }

    return NextResponse.json({
      success: true,
      date: todayStr,
      tasksCreated: results.created.length,
      tasksSkipped: results.skipped.length,
      details: results,
    });
  } catch (error) {
    console.error('[Cron] Check-in tasks error:', error);
    return NextResponse.json(
      { error: 'Failed to create check-in tasks' },
      { status: 500 }
    );
  }
}

// Check if a check-in task already exists for this team member today
async function checkExistingCheckinTask(teamMemberId: string, date: string): Promise<boolean> {
  if (!DATABASE_IDS.tasks) return false;

  try {
    const response = await notion.databases.query({
      database_id: DATABASE_IDS.tasks,
      filter: {
        and: [
          {
            property: 'Task',
            title: {
              contains: 'Daily Check-in',
            },
          },
          {
            property: 'Due Date',
            date: {
              equals: date,
            },
          },
          {
            property: 'Notes',
            rich_text: {
              contains: teamMemberId,
            },
          },
        ],
      },
      page_size: 1,
    });

    return response.results.length > 0;
  } catch (error) {
    console.error('[Cron] Error checking existing task:', error);
    return false;
  }
}

// Check if a string is a valid UUID (Notion User IDs and Page IDs)
function isValidUUID(id: string): boolean {
  // UUIDs are 32 hex characters (with or without dashes)
  // Format: 8-4-4-4-12 hex characters
  const uuidPattern = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
  return uuidPattern.test(id);
}

// Create a check-in task for a team member
async function createCheckinTask(data: {
  title: string;
  teamMemberId: string;
  teamMemberName: string;
  dueDate: string;
  notionUserId?: string;
}) {
  if (!DATABASE_IDS.tasks) {
    throw new Error('NOTION_TASKS_DB not configured');
  }

  const properties: Record<string, unknown> = {
    'Task': {
      title: [{ text: { content: data.title } }],
    },
    'Status': {
      select: { name: 'To Do' },
    },
    'Urgency': {
      select: { name: 'Urgent' },
    },
    'Due Date': {
      date: { start: data.dueDate },
    },
    'Notes': {
      rich_text: [{
        text: {
          content: `Team Member: ${data.teamMemberName}\nTeam Member ID: ${data.teamMemberId}\n\nComplete your daily check-in at /checkin`,
        },
      }],
    },
  };

  // NEW: Always use Assignee relation (Team Members database) for assignment
  // This works for ALL team members, even those not in Notion workspace
  if (data.teamMemberId && isValidUUID(data.teamMemberId)) {
    properties['Assignee'] = {
      relation: [{ id: data.teamMemberId }],
    };
  }

  // LEGACY: Also set Assigned To people field if user is in Notion workspace
  // This maintains backward compatibility and allows Notion UI to show assignment
  if (data.notionUserId && isValidUUID(data.notionUserId)) {
    properties['Assigned To'] = {
      people: [{ id: data.notionUserId }],
    };
  }

  await notion.pages.create({
    parent: { database_id: DATABASE_IDS.tasks },
    properties: properties as any,
  });
}

// POST - Manual trigger with options
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { date, teamMemberId } = body;

    const targetDate = date || new Date().toISOString().split('T')[0];
    const teamMembers = await getTeamMembers();

    // Filter to specific team member if provided
    const targetMembers = teamMemberId
      ? teamMembers.filter(m => m.id === teamMemberId)
      : teamMembers;

    const results: string[] = [];

    for (const member of targetMembers) {
      const taskTitle = `Daily Check-in - ${member.name}`;

      await createCheckinTask({
        title: taskTitle,
        teamMemberId: member.id,
        teamMemberName: member.name,
        dueDate: targetDate,
        notionUserId: member.id,
      });

      results.push(member.name);
    }

    return NextResponse.json({
      success: true,
      date: targetDate,
      tasksCreated: results,
    });
  } catch (error) {
    console.error('[Cron] Manual check-in task trigger error:', error);
    return NextResponse.json(
      { error: 'Failed to create check-in tasks' },
      { status: 500 }
    );
  }
}
