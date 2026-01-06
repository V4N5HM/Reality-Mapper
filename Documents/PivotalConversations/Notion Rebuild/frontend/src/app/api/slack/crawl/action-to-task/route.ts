import { NextRequest, NextResponse } from 'next/server';
import { createTask, calculateDueDateFromUrgency } from '@/lib/notion/tasks';
import { TaskUrgency } from '@/types';

// POST /api/slack/crawl/action-to-task - Convert an action item to a task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      task,
      urgency = 'This Week',
      clientId,
      assignee,
      notes,
      sourceCaseNoteId,
    } = body;

    if (!task) {
      return NextResponse.json(
        { error: 'Task description is required' },
        { status: 400 }
      );
    }

    // Calculate due date based on urgency
    const dueDate = calculateDueDateFromUrgency(urgency as TaskUrgency);

    const createdTask = await createTask({
      task,
      urgency: urgency as TaskUrgency,
      dueDate,
      clientId,
      notes: notes || `Created from Slack channel crawl${assignee ? ` (assigned to ${assignee})` : ''}`,
      sourceCaseNoteId,
      status: 'To Do',
    });

    return NextResponse.json({
      success: true,
      task: createdTask,
    });
  } catch (error) {
    console.error('Error creating task from action item:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

// POST /api/slack/crawl/action-to-task/bulk - Convert multiple action items to tasks
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { actionItems, clientId } = body;

    if (!actionItems || !Array.isArray(actionItems) || actionItems.length === 0) {
      return NextResponse.json(
        { error: 'actionItems array is required' },
        { status: 400 }
      );
    }

    const results = await Promise.all(
      actionItems.map(async (item: {
        task: string;
        urgency?: TaskUrgency;
        assignee?: string;
        notes?: string;
      }) => {
        try {
          const urgency = item.urgency || 'This Week';
          const dueDate = calculateDueDateFromUrgency(urgency);

          const createdTask = await createTask({
            task: item.task,
            urgency,
            dueDate,
            clientId,
            notes: item.notes || `Created from Slack channel crawl${item.assignee ? ` (assigned to ${item.assignee})` : ''}`,
            status: 'To Do',
          });

          return { success: true, task: createdTask };
        } catch (error) {
          return { success: false, error: String(error), originalItem: item };
        }
      })
    );

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return NextResponse.json({
      success: failed.length === 0,
      created: successful.length,
      failed: failed.length,
      tasks: successful.map(r => r.task),
      errors: failed.map(r => ({ item: r.originalItem, error: r.error })),
    });
  } catch (error) {
    console.error('Error creating tasks from action items:', error);
    return NextResponse.json(
      { error: 'Failed to create tasks' },
      { status: 500 }
    );
  }
}
