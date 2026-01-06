import { NextRequest, NextResponse } from 'next/server';
import { notion } from '@/lib/notion/client';
import { getTask } from '@/lib/notion/tasks';

// GET - Fetch a single task by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = await getTask(id);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

// PATCH - Update task (title, status, urgency, due date, notes, client)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { task, status, urgency, dueDate, notes, clientId, completed, assignedTo, assigneeId } = body;

    const properties: Record<string, unknown> = {};

    // Task title
    if (task) {
      properties['Task'] = { title: [{ text: { content: task } }] };
    }

    // Status - use correct values: To Do, In Progress, Complete
    if (status) {
      properties['Status'] = { select: { name: status } };
      // If marking as complete, set completed date
      if (status === 'Complete') {
        properties['Completed Date'] = { date: { start: new Date().toISOString().split('T')[0] } };
      }
    }

    // Urgency - correct property name
    if (urgency) {
      properties['Urgency'] = { select: { name: urgency } };
    }

    // Due Date
    if (dueDate !== undefined) {
      properties['Due Date'] = dueDate ? { date: { start: dueDate } } : { date: null };
    }

    // Notes
    if (notes !== undefined) {
      properties['Notes'] = notes
        ? { rich_text: [{ text: { content: notes } }] }
        : { rich_text: [] };
    }

    // Client relation
    if (clientId !== undefined) {
      properties['Client'] = clientId
        ? { relation: [{ id: clientId }] }
        : { relation: [] };
    }

    // Assignee relation (new method - preferred, works for all team members)
    if (assigneeId !== undefined) {
      properties['Assignee'] = assigneeId
        ? { relation: [{ id: assigneeId }] }
        : { relation: [] };
    }

    // Assigned To (people) - legacy, only works for Notion workspace members
    if (assignedTo !== undefined) {
      properties['Assigned To'] = assignedTo
        ? { people: [{ id: assignedTo }] }
        : { people: [] };
    }

    // Legacy: completed boolean
    if (completed !== undefined) {
      properties['Status'] = { select: { name: completed ? 'Complete' : 'To Do' } };
      if (completed) {
        properties['Completed Date'] = { date: { start: new Date().toISOString().split('T')[0] } };
      } else {
        properties['Completed Date'] = { date: null };
      }
    }

    const response = await notion.pages.update({
      page_id: id,
      properties: properties as any,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const response = await notion.pages.update({
      page_id: id,
      archived: true,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
