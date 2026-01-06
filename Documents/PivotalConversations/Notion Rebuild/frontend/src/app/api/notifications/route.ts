import { NextResponse } from 'next/server';
import { getContent } from '@/lib/notion/content';
import { getTasks } from '@/lib/notion/tasks';

export interface Notification {
  id: string;
  type: 'content_due' | 'content_overdue' | 'task_due' | 'task_overdue' | 'content_ready' | 'feedback_needed';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  url?: string;
  priority: 'high' | 'medium' | 'low';
}

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [allContent, allTasks] = await Promise.all([
      getContent(),
      getTasks(),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const notifications: Notification[] = [];

    // In-progress statuses that indicate work is needed
    const inProgressStatuses = [
      'To Shoot', 'In Progress', 'Research', 'Brief', 'Filmed',
      'Edit', 'Thumbnail Design', 'PC Feedback', 'PC Review',
      'Client Feedback', 'Client Review', 'Final Review', 'To Schedule'
    ];

    // Generate content-based notifications
    allContent.forEach((content) => {
      if (!content.scheduledDate) return;
      if (['Posted', 'Live', 'Complete'].includes(content.status)) return;

      const scheduledDate = new Date(content.scheduledDate);
      scheduledDate.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.ceil((scheduledDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Overdue content
      if (daysUntilDue < 0 && inProgressStatuses.includes(content.status)) {
        notifications.push({
          id: `content-overdue-${content.id}`,
          type: 'content_overdue',
          title: 'Content Overdue',
          message: `"${content.title}" is ${Math.abs(daysUntilDue)} days past scheduled date`,
          timestamp: new Date().toISOString(),
          read: false,
          url: `/pipeline`,
          priority: 'high',
        });
      }
      // Due today
      else if (daysUntilDue === 0 && inProgressStatuses.includes(content.status)) {
        notifications.push({
          id: `content-due-${content.id}`,
          type: 'content_due',
          title: 'Content Due Today',
          message: `"${content.title}" is scheduled for today`,
          timestamp: new Date().toISOString(),
          read: false,
          url: `/pipeline`,
          priority: 'high',
        });
      }
      // Due tomorrow
      else if (daysUntilDue === 1 && inProgressStatuses.includes(content.status)) {
        notifications.push({
          id: `content-due-tomorrow-${content.id}`,
          type: 'content_due',
          title: 'Content Due Tomorrow',
          message: `"${content.title}" is scheduled for tomorrow`,
          timestamp: new Date().toISOString(),
          read: false,
          url: `/pipeline`,
          priority: 'medium',
        });
      }

      // Feedback needed notifications
      if (content.status === 'PC Review' || content.status === 'PC Feedback') {
        notifications.push({
          id: `feedback-pc-${content.id}`,
          type: 'feedback_needed',
          title: 'Review Needed',
          message: `"${content.title}" is ready for your review`,
          timestamp: new Date().toISOString(),
          read: false,
          url: `/pipeline`,
          priority: 'medium',
        });
      }

      if (content.status === 'Client Feedback' || content.status === 'Client Review') {
        notifications.push({
          id: `feedback-client-${content.id}`,
          type: 'feedback_needed',
          title: 'Awaiting Client Feedback',
          message: `"${content.title}" is waiting for client feedback`,
          timestamp: new Date().toISOString(),
          read: false,
          url: `/pipeline`,
          priority: 'low',
        });
      }

      // Content ready for scheduling
      if (content.status === 'Approved' && !content.scheduledDate) {
        notifications.push({
          id: `content-ready-${content.id}`,
          type: 'content_ready',
          title: 'Ready to Schedule',
          message: `"${content.title}" is approved and ready to be scheduled`,
          timestamp: new Date().toISOString(),
          read: false,
          url: `/pipeline`,
          priority: 'low',
        });
      }
    });

    // Generate task-based notifications
    allTasks.forEach((task) => {
      if (task.status === 'Complete') return;
      if (!task.dueDate) return;

      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Overdue tasks
      if (daysUntilDue < 0) {
        notifications.push({
          id: `task-overdue-${task.id}`,
          type: 'task_overdue',
          title: 'Task Overdue',
          message: `"${task.task}" is ${Math.abs(daysUntilDue)} days overdue`,
          timestamp: new Date().toISOString(),
          read: false,
          url: `/tasks`,
          priority: 'high',
        });
      }
      // Due today
      else if (daysUntilDue === 0) {
        notifications.push({
          id: `task-due-${task.id}`,
          type: 'task_due',
          title: 'Task Due Today',
          message: `"${task.task}" is due today`,
          timestamp: new Date().toISOString(),
          read: false,
          url: `/tasks`,
          priority: 'high',
        });
      }
      // Due tomorrow
      else if (daysUntilDue === 1) {
        notifications.push({
          id: `task-due-tomorrow-${task.id}`,
          type: 'task_due',
          title: 'Task Due Tomorrow',
          message: `"${task.task}" is due tomorrow`,
          timestamp: new Date().toISOString(),
          read: false,
          url: `/tasks`,
          priority: 'medium',
        });
      }
    });

    // Sort by priority (high first) then by type
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    notifications.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Limit to most important notifications
    const limitedNotifications = notifications.slice(0, 20);

    return NextResponse.json({
      notifications: limitedNotifications,
      unreadCount: limitedNotifications.filter(n => !n.read).length,
      totalCount: notifications.length,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
