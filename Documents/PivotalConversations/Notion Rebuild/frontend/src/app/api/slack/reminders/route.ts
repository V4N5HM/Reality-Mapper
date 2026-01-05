import { NextRequest, NextResponse } from 'next/server';
import { getTasks } from '@/lib/notion/tasks';
import { getTeamMembers } from '@/lib/notion/team';
import { getClients } from '@/lib/notion/clients';
import { sendTaskReminder, sendChannelNotification } from '@/lib/slack/client';

// POST - Send reminder alerts (3-day and 24-hour before due date)
// This endpoint should be called by a cron job at 8am Melbourne time
// It will send reminders for tasks due in 3 days and tasks due in 24 hours
// NOTE: Only sends reminders for weekly/monthly tasks (not urgent/daily tasks)
export async function POST(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all pending tasks
    const [tasks, teamMembers, clients] = await Promise.all([
      getTasks({ status: 'To Do' }),
      getTeamMembers(),
      getClients('Active'),
    ]);

    // Add "In Progress" tasks as well
    const inProgressTasks = await getTasks({ status: 'In Progress' });
    const allPendingTasks = [...tasks, ...inProgressTasks];

    const clientMap = new Map(clients.map(c => [c.id, c.name]));
    const memberMap = new Map(teamMembers.map(m => [m.id, m.name]));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate target dates
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    const oneDayFromNow = new Date(today);
    oneDayFromNow.setDate(today.getDate() + 1);

    const results: Array<{
      task: string;
      member: string;
      reminderType: '3-day' | '24-hour';
      success: boolean;
      error?: string;
    }> = [];

    // Process each task
    for (const task of allPendingTasks) {
      if (!task.dueDate) continue;

      // Skip urgent/daily tasks - only send reminders for weekly/monthly tasks
      if (task.urgency === 'Urgent') continue;

      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      // Skip if no assignee (we'll handle unassigned separately)
      if (!task.assignedTo) continue;

      const memberName = memberMap.get(task.assignedTo) || task.assignedTo;
      const clientName = task.clientId ? clientMap.get(task.clientId) : undefined;

      // Check if due in exactly 3 days
      if (dueDate.getTime() === threeDaysFromNow.getTime()) {
        const result = await sendTaskReminder(
          memberName,
          {
            task: task.task,
            dueDate: task.dueDate,
            clientName,
          },
          '3-day'
        );

        results.push({
          task: task.task,
          member: memberName,
          reminderType: '3-day',
          success: result.success,
          error: result.error,
        });
      }

      // Check if due in exactly 1 day (24 hours)
      if (dueDate.getTime() === oneDayFromNow.getTime()) {
        const result = await sendTaskReminder(
          memberName,
          {
            task: task.task,
            dueDate: task.dueDate,
            clientName,
          },
          '24-hour'
        );

        results.push({
          task: task.task,
          member: memberName,
          reminderType: '24-hour',
          success: result.success,
          error: result.error,
        });
      }
    }

    // Handle unassigned tasks with upcoming due dates (excluding urgent/daily tasks)
    const unassignedTasks = allPendingTasks.filter(t => !t.assignedTo && t.dueDate && t.urgency !== 'Urgent');
    const unassigned3Day = unassignedTasks.filter(t => {
      const dueDate = new Date(t.dueDate!);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === threeDaysFromNow.getTime();
    });
    const unassigned24Hour = unassignedTasks.filter(t => {
      const dueDate = new Date(t.dueDate!);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === oneDayFromNow.getTime();
    });

    // Send warning for unassigned tasks due soon
    if (unassigned3Day.length > 0 || unassigned24Hour.length > 0) {
      const messages: string[] = [];
      if (unassigned24Hour.length > 0) {
        messages.push(`*Due tomorrow (${unassigned24Hour.length}):*\n${unassigned24Hour.map(t => `• ${t.task}`).join('\n')}`);
      }
      if (unassigned3Day.length > 0) {
        messages.push(`*Due in 3 days (${unassigned3Day.length}):*\n${unassigned3Day.map(t => `• ${t.task}`).join('\n')}`);
      }

      await sendChannelNotification(
        'Unassigned Tasks Need Attention',
        `The following unassigned tasks have upcoming due dates:\n\n${messages.join('\n\n')}`,
        'warning'
      );
    }

    return NextResponse.json({
      success: true,
      summary: {
        threeDayReminders: results.filter(r => r.reminderType === '3-day').length,
        twentyFourHourReminders: results.filter(r => r.reminderType === '24-hour').length,
        successfulReminders: results.filter(r => r.success).length,
        failedReminders: results.filter(r => !r.success).length,
      },
      results,
      unassignedAlerts: {
        dueIn3Days: unassigned3Day.length,
        dueTomorrow: unassigned24Hour.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error sending reminder alerts:', error);
    return NextResponse.json(
      { error: 'Failed to send reminder alerts' },
      { status: 500 }
    );
  }
}

// GET - Send reminders (used by Vercel cron) or preview with ?preview=true
export async function GET(request: NextRequest) {
  const isPreview = request.nextUrl.searchParams.get('preview') === 'true';

  // If not preview, this is a cron call - delegate to POST logic
  if (!isPreview) {
    return POST(request);
  }

  // Preview mode
  try {
    const [tasks, teamMembers, clients] = await Promise.all([
      getTasks({ status: 'To Do' }),
      getTeamMembers(),
      getClients('Active'),
    ]);

    const inProgressTasks = await getTasks({ status: 'In Progress' });
    const allPendingTasks = [...tasks, ...inProgressTasks];

    const clientMap = new Map(clients.map(c => [c.id, c.name]));
    const memberMap = new Map(teamMembers.map(m => [m.id, m.name]));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    const oneDayFromNow = new Date(today);
    oneDayFromNow.setDate(today.getDate() + 1);

    const preview = {
      threeDayReminders: [] as Array<{ task: string; member: string; dueDate: string; client?: string }>,
      twentyFourHourReminders: [] as Array<{ task: string; member: string; dueDate: string; client?: string }>,
      unassigned: {
        dueIn3Days: [] as Array<{ task: string; dueDate: string; client?: string }>,
        dueTomorrow: [] as Array<{ task: string; dueDate: string; client?: string }>,
      },
    };

    for (const task of allPendingTasks) {
      if (!task.dueDate) continue;

      // Skip urgent/daily tasks - only send reminders for weekly/monthly tasks
      if (task.urgency === 'Urgent') continue;

      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      const clientName = task.clientId ? clientMap.get(task.clientId) : undefined;

      if (!task.assignedTo) {
        // Unassigned
        if (dueDate.getTime() === threeDaysFromNow.getTime()) {
          preview.unassigned.dueIn3Days.push({
            task: task.task,
            dueDate: task.dueDate,
            client: clientName,
          });
        }
        if (dueDate.getTime() === oneDayFromNow.getTime()) {
          preview.unassigned.dueTomorrow.push({
            task: task.task,
            dueDate: task.dueDate,
            client: clientName,
          });
        }
      } else {
        const memberName = memberMap.get(task.assignedTo) || task.assignedTo;

        if (dueDate.getTime() === threeDaysFromNow.getTime()) {
          preview.threeDayReminders.push({
            task: task.task,
            member: memberName,
            dueDate: task.dueDate,
            client: clientName,
          });
        }
        if (dueDate.getTime() === oneDayFromNow.getTime()) {
          preview.twentyFourHourReminders.push({
            task: task.task,
            member: memberName,
            dueDate: task.dueDate,
            client: clientName,
          });
        }
      }
    }

    return NextResponse.json({
      preview: true,
      targetDates: {
        threeDaysFromNow: threeDaysFromNow.toISOString().split('T')[0],
        oneDayFromNow: oneDayFromNow.toISOString().split('T')[0],
      },
      ...preview,
      totals: {
        threeDayReminders: preview.threeDayReminders.length,
        twentyFourHourReminders: preview.twentyFourHourReminders.length,
        unassignedDueIn3Days: preview.unassigned.dueIn3Days.length,
        unassignedDueTomorrow: preview.unassigned.dueTomorrow.length,
      },
    });
  } catch (error) {
    console.error('Error previewing reminders:', error);
    return NextResponse.json(
      { error: 'Failed to preview reminders' },
      { status: 500 }
    );
  }
}
