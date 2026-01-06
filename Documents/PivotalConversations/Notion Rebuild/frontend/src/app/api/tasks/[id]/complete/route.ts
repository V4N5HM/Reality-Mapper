import { NextRequest, NextResponse } from 'next/server';
import { completeTask, uncompleteTask, getTask } from '@/lib/notion/tasks';

// POST - Toggle task completion (checkbox-like)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { complete } = body;

    // Get current task state
    const task = await getTask(id);

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // If `complete` is explicitly provided, use it; otherwise toggle
    const shouldComplete = complete !== undefined ? complete : task.status !== 'Complete';

    let updatedTask;
    if (shouldComplete) {
      updatedTask = await completeTask(id);
    } else {
      updatedTask = await uncompleteTask(id);
    }

    return NextResponse.json({
      success: true,
      task: updatedTask,
      completed: updatedTask.status === 'Complete',
      message: updatedTask.status === 'Complete'
        ? `Task "${updatedTask.task}" marked as complete`
        : `Task "${updatedTask.task}" marked as incomplete`,
    });
  } catch (error) {
    console.error('Error toggling task completion:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}
