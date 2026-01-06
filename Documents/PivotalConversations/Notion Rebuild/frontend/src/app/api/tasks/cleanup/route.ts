import { NextRequest, NextResponse } from 'next/server';
import { getTasks, deleteTask } from '@/lib/notion/tasks';

// Known team member names and patterns that should not be tasks
const BAD_TASK_PATTERNS = [
  // Name patterns with asterisks
  /^\*\*[^*]+\*\*$/,
  // Just names (1-3 capitalized words)
  /^[A-Z][a-z]+$/,
  /^[A-Z][a-z]+\s+[A-Z][a-z]+$/,
  /^[A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+$/,
];

// Known team member first names
const KNOWN_FIRST_NAMES = [
  'natasha', 'kyle', 'justin', 'olivia', 'louise', 'laura',
  'xandrino', 'lottie', 'vansh', 'eddie', 'christian',
  'mark', 'ella', 'geido', 'luke', 'dale', 'safaeid',
];

/**
 * GET /api/tasks/cleanup
 *
 * Preview tasks that would be deleted (dry run)
 */
export async function GET(request: NextRequest) {
  try {
    const allTasks = await getTasks();

    const badTasks = allTasks.filter(task => {
      const taskText = task.task.trim();

      // Check if it matches bad patterns
      if (BAD_TASK_PATTERNS.some(pattern => pattern.test(taskText))) {
        return true;
      }

      // Check if it's just a known name
      const lowerTask = taskText.toLowerCase().replace(/\*/g, '').trim();
      if (KNOWN_FIRST_NAMES.includes(lowerTask)) {
        return true;
      }

      // Check if it's a name with asterisks like **Kyle**
      const withoutAsterisks = taskText.replace(/\*/g, '').trim();
      if (KNOWN_FIRST_NAMES.includes(withoutAsterisks.toLowerCase())) {
        return true;
      }

      // Check for very short tasks that are likely names
      if (taskText.length < 15 && !taskText.toLowerCase().includes(' ')) {
        const words = taskText.split(/\s+/);
        if (words.length <= 2 && words.every(w => w[0] === w[0].toUpperCase())) {
          return true;
        }
      }

      return false;
    });

    return NextResponse.json({
      totalTasks: allTasks.length,
      badTasksFound: badTasks.length,
      preview: badTasks.map(t => ({
        id: t.id,
        task: t.task,
        clientName: t.clientName,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error('[Tasks Cleanup] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get tasks' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/cleanup
 *
 * Delete all bad tasks (the ones that are just names)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify with a confirm parameter
    const { searchParams } = new URL(request.url);
    const confirm = searchParams.get('confirm');

    if (confirm !== 'true') {
      return NextResponse.json(
        { error: 'Add ?confirm=true to actually delete tasks. Use GET first to preview.' },
        { status: 400 }
      );
    }

    const allTasks = await getTasks();

    const badTasks = allTasks.filter(task => {
      const taskText = task.task.trim();

      // Check if it matches bad patterns
      if (BAD_TASK_PATTERNS.some(pattern => pattern.test(taskText))) {
        return true;
      }

      // Check if it's just a known name
      const lowerTask = taskText.toLowerCase().replace(/\*/g, '').trim();
      if (KNOWN_FIRST_NAMES.includes(lowerTask)) {
        return true;
      }

      // Check if it's a name with asterisks like **Kyle**
      const withoutAsterisks = taskText.replace(/\*/g, '').trim();
      if (KNOWN_FIRST_NAMES.includes(withoutAsterisks.toLowerCase())) {
        return true;
      }

      // Check for very short tasks that are likely names
      if (taskText.length < 15 && !taskText.toLowerCase().includes(' ')) {
        const words = taskText.split(/\s+/);
        if (words.length <= 2 && words.every(w => w[0] === w[0].toUpperCase())) {
          return true;
        }
      }

      return false;
    });

    const deletedTasks: string[] = [];
    const errors: string[] = [];

    for (const task of badTasks) {
      try {
        await deleteTask(task.id);
        deletedTasks.push(task.task);
      } catch (error) {
        errors.push(`Failed to delete "${task.task}": ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount: deletedTasks.length,
      deletedTasks,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[Tasks Cleanup] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cleanup tasks' },
      { status: 500 }
    );
  }
}
