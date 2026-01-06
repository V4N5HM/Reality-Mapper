import { NextRequest, NextResponse } from 'next/server';
import { notion, DATABASES } from '@/lib/notion/client';
import { getTasks, calculateDueDateFromUrgency, getTasksPaginated, deleteTasks } from '@/lib/notion/tasks';
import { TaskStatus, TaskUrgency } from '@/types';

// GET - Retrieve all tasks with optional filters
// Supports pagination via ?paginated=true&pageSize=100&cursor=xxx
// Supports date range filtering via ?dueDateFrom=YYYY-MM-DD&dueDateTo=YYYY-MM-DD
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId') || undefined;
    const status = searchParams.get('status') as TaskStatus | undefined;
    const urgency = searchParams.get('urgency') as TaskUrgency | undefined;
    const paginated = searchParams.get('paginated') === 'true';
    const pageSize = searchParams.get('pageSize');
    const cursor = searchParams.get('cursor') || undefined;
    const dueDateFrom = searchParams.get('dueDateFrom') || undefined;
    const dueDateTo = searchParams.get('dueDateTo') || undefined;

    // Return paginated response if requested
    if (paginated) {
      const result = await getTasksPaginated({
        clientId,
        status,
        urgency,
        pageSize: pageSize ? parseInt(pageSize) : 100,
        cursor,
      });
      const response = NextResponse.json(result);
      response.headers.set('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
      return response;
    }

    const tasks = await getTasks({ clientId, status, urgency, dueDateFrom, dueDateTo });
    const response = NextResponse.json(tasks);
    response.headers.set('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    return response;
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST - Create new task (also used when converting case note to task)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      clientId,
      urgency,
      dueDate,
      description,
      caseNoteId, // If converting from case note
      assignee, // Team member name to assign to
      assigneeId, // Or directly pass the Notion user ID
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const taskUrgency: TaskUrgency = urgency || 'This Week';
    // Auto-calculate due date if not provided
    const taskDueDate = dueDate || calculateDueDateFromUrgency(taskUrgency);

    // Use correct property names matching the Notion Tasks database schema
    const properties: Record<string, unknown> = {
      'Task': { title: [{ text: { content: title } }] },
      'Status': { select: { name: 'To Do' } },
      'Urgency': { select: { name: taskUrgency } },
      'Due Date': { date: { start: taskDueDate } },
    };

    if (clientId) {
      properties['Client'] = { relation: [{ id: clientId }] };
    }

    if (description) {
      properties['Notes'] = {
        rich_text: [{ text: { content: description } }]
      };
    }

    if (caseNoteId) {
      properties['Source Case Note'] = { relation: [{ id: caseNoteId }] };
    }

    // Handle assignee - either by ID directly or by looking up the team member
    let assignedToId = assigneeId;
    if (!assignedToId && assignee) {
      // Look up team member by name to get their Notion ID
      const { getTeamMembers } = await import('@/lib/notion/team');
      const members = await getTeamMembers();
      const member = members.find(m => m.name === assignee);
      if (member && member.id && !member.id.startsWith('team-member-')) {
        assignedToId = member.id;
      }
    }

    if (assignedToId) {
      properties['Assigned To'] = { people: [{ id: assignedToId }] };
    }

    const response = await notion.pages.create({
      parent: { database_id: DATABASES.tasks },
      properties: properties as any,
    });

    // Transform the response to match our Task type
    const task = {
      id: response.id,
      task: title,
      clientId: clientId || undefined,
      status: 'To Do' as TaskStatus,
      urgency: taskUrgency,
      dueDate: taskDueDate,
      notes: description || undefined,
      assignedTo: assignee || undefined,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    // Return more detailed error info for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create task', details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Bulk delete tasks
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Array of task IDs is required' },
        { status: 400 }
      );
    }

    const result = await deleteTasks(ids);

    return NextResponse.json({
      success: true,
      deleted: result.deleted,
      failed: result.failed,
    });
  } catch (error) {
    console.error('Error deleting tasks:', error);
    return NextResponse.json(
      { error: 'Failed to delete tasks' },
      { status: 500 }
    );
  }
}
