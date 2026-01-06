import { NextRequest, NextResponse } from 'next/server';
import { getTaskAlerts, getOverdueTasks, getTasksDueToday, getTasksDueThisWeek } from '@/lib/notion/tasks';
import { getTeamMembers } from '@/lib/notion/team';
import { getClients } from '@/lib/notion/clients';
import {
  sendDailyTaskSummary,
  sendOverdueAlert,
  sendChannelNotification,
} from '@/lib/slack/client';

// POST - Send daily morning alerts to #pivotal-alerts
// This endpoint should be called by a cron job at 8am Melbourne time (AEST/AEDT)
// Cron schedule: 0 8 * * * (in Melbourne timezone, or 21 * * * * in UTC during AEST, 22 * * * * during AEDT)
export async function POST(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all task data
    const [overdueTasks, dueTodayTasks, dueThisWeekTasks, teamMembers, clients] = await Promise.all([
      getOverdueTasks(),
      getTasksDueToday(),
      getTasksDueThisWeek(),
      getTeamMembers(),
      getClients('Active'),
    ]);

    // Create a map for client names
    const clientMap = new Map(clients.map(c => [c.id, c.name]));

    // Create a map for team member names
    const memberMap = new Map(teamMembers.map(m => [m.id, m.name]));

    // Group tasks by assignee
    const tasksByAssignee: Record<string, {
      name: string;
      overdue: Array<{ task: string; dueDate?: string | null; clientName?: string; daysOverdue: number }>;
      dueToday: Array<{ task: string; dueDate?: string | null; clientName?: string }>;
      dueThisWeek: Array<{ task: string; dueDate?: string | null; clientName?: string }>;
    }> = {};

    // Helper to get or create assignee entry
    const getAssigneeEntry = (assigneeId: string) => {
      if (!tasksByAssignee[assigneeId]) {
        tasksByAssignee[assigneeId] = {
          name: memberMap.get(assigneeId) || assigneeId,
          overdue: [],
          dueToday: [],
          dueThisWeek: [],
        };
      }
      return tasksByAssignee[assigneeId];
    };

    // Process overdue tasks
    const today = new Date();
    for (const task of overdueTasks) {
      const assigneeId = task.assignedTo || 'Unassigned';
      const entry = getAssigneeEntry(assigneeId);
      const daysOverdue = task.dueDate
        ? Math.floor((today.getTime() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      entry.overdue.push({
        task: task.task,
        dueDate: task.dueDate,
        clientName: task.clientId ? clientMap.get(task.clientId) : undefined,
        daysOverdue,
      });
    }

    // Process tasks due today
    for (const task of dueTodayTasks) {
      const assigneeId = task.assignedTo || 'Unassigned';
      const entry = getAssigneeEntry(assigneeId);

      entry.dueToday.push({
        task: task.task,
        dueDate: task.dueDate,
        clientName: task.clientId ? clientMap.get(task.clientId) : undefined,
      });
    }

    // Process tasks due this week (excluding today)
    for (const task of dueThisWeekTasks) {
      // Skip if already in dueToday
      if (dueTodayTasks.some(t => t.id === task.id)) continue;

      const assigneeId = task.assignedTo || 'Unassigned';
      const entry = getAssigneeEntry(assigneeId);

      entry.dueThisWeek.push({
        task: task.task,
        dueDate: task.dueDate,
        clientName: task.clientId ? clientMap.get(task.clientId) : undefined,
      });
    }

    // Send alerts for each team member
    const results: Array<{ member: string; success: boolean; error?: string }> = [];

    for (const [assigneeId, data] of Object.entries(tasksByAssignee)) {
      // Skip unassigned tasks from individual alerts
      if (assigneeId === 'Unassigned') continue;

      const result = await sendDailyTaskSummary(data.name, {
        overdue: data.overdue,
        dueToday: data.dueToday,
        dueThisWeek: data.dueThisWeek,
      });

      results.push({
        member: data.name,
        success: result.success,
        error: result.error,
      });
    }

    // Send a detailed summary of unassigned tasks if any
    const unassigned = tasksByAssignee['Unassigned'];
    if (unassigned && (unassigned.overdue.length > 0 || unassigned.dueToday.length > 0 || unassigned.dueThisWeek.length > 0)) {
      const sections: string[] = [];

      if (unassigned.overdue.length > 0) {
        sections.push(`*:warning: OVERDUE (${unassigned.overdue.length}):*\n${unassigned.overdue.map((t, i) =>
          `${i + 1}. ${t.task}${t.clientName ? ` _(${t.clientName})_` : ''} - _${t.daysOverdue} day${t.daysOverdue > 1 ? 's' : ''} overdue_`
        ).join('\n')}`);
      }

      if (unassigned.dueToday.length > 0) {
        sections.push(`*:calendar: DUE TODAY (${unassigned.dueToday.length}):*\n${unassigned.dueToday.map((t, i) =>
          `${i + 1}. ${t.task}${t.clientName ? ` _(${t.clientName})_` : ''}`
        ).join('\n')}`);
      }

      if (unassigned.dueThisWeek.length > 0) {
        sections.push(`*:clock3: DUE THIS WEEK (${unassigned.dueThisWeek.length}):*\n${unassigned.dueThisWeek.map((t, i) =>
          `${i + 1}. ${t.task}${t.clientName ? ` _(${t.clientName})_` : ''} - Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-AU') : 'N/A'}`
        ).join('\n')}`);
      }

      await sendChannelNotification(
        'Unassigned Tasks Need Attention',
        `The following tasks have no assignee and need to be assigned:\n\n${sections.join('\n\n')}`,
        'warning'
      );
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalOverdue: overdueTasks.length,
        totalDueToday: dueTodayTasks.length,
        totalDueThisWeek: dueThisWeekTasks.length,
        teamMembersNotified: results.filter(r => r.success).length,
      },
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error sending daily Slack alerts:', error);
    return NextResponse.json(
      { error: 'Failed to send daily alerts' },
      { status: 500 }
    );
  }
}

// GET - Send daily alerts (used by Vercel cron) or preview with ?preview=true
export async function GET(request: NextRequest) {
  const isPreview = request.nextUrl.searchParams.get('preview') === 'true';

  // If not preview, this is a cron call - delegate to POST logic
  if (!isPreview) {
    return POST(request);
  }

  // Preview mode - just return what would be sent without actually sending
  try {
    const [overdueTasks, dueTodayTasks, dueThisWeekTasks, teamMembers, clients] = await Promise.all([
      getOverdueTasks(),
      getTasksDueToday(),
      getTasksDueThisWeek(),
      getTeamMembers(),
      getClients('Active'),
    ]);

    const clientMap = new Map(clients.map(c => [c.id, c.name]));
    const memberMap = new Map(teamMembers.map(m => [m.id, m.name]));

    // Group by assignee for preview
    const tasksByAssignee: Record<string, {
      name: string;
      overdue: number;
      dueToday: number;
      dueThisWeek: number;
      tasks: Array<{ task: string; status: string; dueDate?: string }>;
    }> = {};

    const processTask = (task: any, status: string) => {
      const assigneeId = task.assignedTo || 'Unassigned';
      if (!tasksByAssignee[assigneeId]) {
        tasksByAssignee[assigneeId] = {
          name: memberMap.get(assigneeId) || assigneeId,
          overdue: 0,
          dueToday: 0,
          dueThisWeek: 0,
          tasks: [],
        };
      }
      tasksByAssignee[assigneeId][status as 'overdue' | 'dueToday' | 'dueThisWeek']++;
      tasksByAssignee[assigneeId].tasks.push({
        task: task.task,
        status,
        dueDate: task.dueDate,
      });
    };

    overdueTasks.forEach(t => processTask(t, 'overdue'));
    dueTodayTasks.forEach(t => processTask(t, 'dueToday'));
    dueThisWeekTasks.filter(t => !dueTodayTasks.some(dt => dt.id === t.id))
      .forEach(t => processTask(t, 'dueThisWeek'));

    return NextResponse.json({
      preview: true,
      wouldSendTo: Object.entries(tasksByAssignee)
        .filter(([id]) => id !== 'Unassigned')
        .map(([id, data]) => ({
          member: data.name,
          overdue: data.overdue,
          dueToday: data.dueToday,
          dueThisWeek: data.dueThisWeek,
          tasks: data.tasks,
        })),
      unassigned: tasksByAssignee['Unassigned'] || null,
      totals: {
        overdue: overdueTasks.length,
        dueToday: dueTodayTasks.length,
        dueThisWeek: dueThisWeekTasks.length,
      },
    });
  } catch (error) {
    console.error('Error previewing daily alerts:', error);
    return NextResponse.json(
      { error: 'Failed to preview daily alerts' },
      { status: 500 }
    );
  }
}
