import { NextRequest, NextResponse } from 'next/server';
import { getTaskAlerts, getOverdueTasks, getTasksDueToday } from '@/lib/notion/tasks';
import { getTeamMembers } from '@/lib/notion/team';

// GET - Get task alerts summary (overdue, due today, due this week)
export async function GET(request: NextRequest) {
  try {
    const alerts = await getTaskAlerts();
    const teamMembers = await getTeamMembers();

    // Map assignee IDs to names
    const memberMap = new Map(teamMembers.map(m => [m.id, m.name]));

    // Transform byAssignee to use names instead of IDs
    const alertsByMember: Record<string, {
      name: string;
      overdue: number;
      dueToday: number;
      dueThisWeek: number;
      totalPending: number;
    }> = {};

    for (const [assigneeId, counts] of Object.entries(alerts.byAssignee)) {
      const name = memberMap.get(assigneeId) || assigneeId;
      alertsByMember[assigneeId] = {
        name,
        ...counts,
        totalPending: counts.overdue + counts.dueToday + counts.dueThisWeek,
      };
    }

    // Build alert messages
    const alertMessages: string[] = [];

    if (alerts.overdue.length > 0) {
      alertMessages.push(`⚠️ ${alerts.overdue.length} overdue task(s) need immediate attention`);
    }
    if (alerts.dueToday.length > 0) {
      alertMessages.push(`📅 ${alerts.dueToday.length} task(s) due today`);
    }
    if (alerts.dueThisWeek.length > 0) {
      alertMessages.push(`📆 ${alerts.dueThisWeek.length} task(s) due this week`);
    }

    return NextResponse.json({
      success: true,
      summary: {
        overdue: alerts.overdue.length,
        dueToday: alerts.dueToday.length,
        dueThisWeek: alerts.dueThisWeek.length,
        total: alerts.overdue.length + alerts.dueToday.length + alerts.dueThisWeek.length,
      },
      alertMessages,
      byMember: alertsByMember,
      tasks: {
        overdue: alerts.overdue.map(t => ({
          id: t.id,
          task: t.task,
          dueDate: t.dueDate,
          assignedTo: t.assignedTo ? memberMap.get(t.assignedTo) || t.assignedTo : 'Unassigned',
          daysOverdue: t.dueDate ? Math.floor((new Date().getTime() - new Date(t.dueDate).getTime()) / (1000 * 60 * 60 * 24)) : 0,
        })),
        dueToday: alerts.dueToday.map(t => ({
          id: t.id,
          task: t.task,
          dueDate: t.dueDate,
          assignedTo: t.assignedTo ? memberMap.get(t.assignedTo) || t.assignedTo : 'Unassigned',
        })),
        dueThisWeek: alerts.dueThisWeek.map(t => ({
          id: t.id,
          task: t.task,
          dueDate: t.dueDate,
          assignedTo: t.assignedTo ? memberMap.get(t.assignedTo) || t.assignedTo : 'Unassigned',
        })),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching task alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task alerts' },
      { status: 500 }
    );
  }
}

// POST - Send alert notifications (can be extended to send emails, Slack, etc.)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationType } = body; // 'email', 'slack', 'summary'

    const [overdue, dueToday] = await Promise.all([
      getOverdueTasks(),
      getTasksDueToday(),
    ]);

    const teamMembers = await getTeamMembers();
    const memberMap = new Map(teamMembers.map(m => [m.id, { name: m.name, email: m.email }]));

    // Group tasks by assignee for notifications
    const notificationsByAssignee: Record<string, {
      name: string;
      email: string;
      overdueTasks: Array<{ task: string; dueDate: string | null; daysOverdue: number }>;
      dueTodayTasks: Array<{ task: string }>;
    }> = {};

    for (const task of overdue) {
      const assigneeId = task.assignedTo || 'Unassigned';
      const member = memberMap.get(assigneeId);

      if (!notificationsByAssignee[assigneeId]) {
        notificationsByAssignee[assigneeId] = {
          name: member?.name || 'Unassigned',
          email: member?.email || '',
          overdueTasks: [],
          dueTodayTasks: [],
        };
      }

      notificationsByAssignee[assigneeId].overdueTasks.push({
        task: task.task,
        dueDate: task.dueDate || null,
        daysOverdue: task.dueDate ? Math.floor((new Date().getTime() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24)) : 0,
      });
    }

    for (const task of dueToday) {
      const assigneeId = task.assignedTo || 'Unassigned';
      const member = memberMap.get(assigneeId);

      if (!notificationsByAssignee[assigneeId]) {
        notificationsByAssignee[assigneeId] = {
          name: member?.name || 'Unassigned',
          email: member?.email || '',
          overdueTasks: [],
          dueTodayTasks: [],
        };
      }

      notificationsByAssignee[assigneeId].dueTodayTasks.push({
        task: task.task,
      });
    }

    // For now, return the notification data (can be extended to actually send notifications)
    // In production, you would integrate with email service (SendGrid, Resend, etc.) or Slack API
    return NextResponse.json({
      success: true,
      notificationType,
      wouldNotify: Object.keys(notificationsByAssignee).length,
      notifications: notificationsByAssignee,
      message: `Would send ${notificationType || 'summary'} notifications to ${Object.keys(notificationsByAssignee).length} team members`,
    });
  } catch (error) {
    console.error('Error sending task alerts:', error);
    return NextResponse.json(
      { error: 'Failed to send task alerts' },
      { status: 500 }
    );
  }
}
