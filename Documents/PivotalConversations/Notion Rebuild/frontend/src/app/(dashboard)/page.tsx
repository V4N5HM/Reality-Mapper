import { getClients, getClientStats } from '@/lib/notion/clients';
import { getUpcomingContent, getContent } from '@/lib/notion/content';
import { getPendingTasks, getUrgentTasks, getTaskStats, getTasksByAssignee } from '@/lib/notion/tasks';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { TaskList } from '@/components/dashboard/task-list';
import { PipelineHealth } from '@/components/dashboard/pipeline-health';
import { UpcomingContent } from '@/components/dashboard/upcoming-content';
import { TimelineAlerts } from '@/components/dashboard/timeline-alerts';
import { calculateTimelineAlerts } from '@/lib/timeline-utils';
import { unstable_cache } from 'next/cache';
import { getSession } from '@/lib/auth/auth';

// Use ISR with 30 second revalidation for faster dashboard loads
export const revalidate = 30;

// Cache dashboard data for 30 seconds
const getCachedDashboardData = unstable_cache(
  async () => {
    // Fetch all data in parallel
    const [clientStats, taskStats, pendingTasks, upcomingContent, clients, allContent] = await Promise.all([
      getClientStats(),
      getTaskStats(),
      getPendingTasks(),
      getUpcomingContent(7),
      getClients('Active'),
      getContent({ limit: 200 }), // Single query for all content
    ]);

    // Calculate pipeline health using the content we already fetched
    const today = new Date();
    const fiveDaysLater = new Date(today);
    fiveDaysLater.setDate(today.getDate() + 5);

    const pipelineHealth = clients.slice(0, 5).map((client) => {
      // Filter content for this client from already-fetched data
      const clientContent = allContent.filter(
        (c) => c.clientId === client.id && c.contentType === 'Short Form'
      );

      const scheduledCount = clientContent.filter((c) => {
        if (!c.scheduledDate) return false;
        const date = new Date(c.scheduledDate);
        return date >= today && date <= fiveDaysLater &&
          ['Scheduled', 'Approved', 'To Schedule'].includes(c.status);
      }).length;

      return {
        id: client.id,
        name: client.name,
        scheduledCount,
        requiredCount: 5,
      };
    });

    // Get content count this month
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();
    const contentThisMonth = allContent.filter((c) => {
      if (!c.scheduledDate) return false;
      const date = new Date(c.scheduledDate);
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    }).length;

    // Calculate timeline alerts
    const timelineAlerts = calculateTimelineAlerts(allContent);

    return {
      stats: {
        activeClients: clientStats.active,
        contentThisMonth,
        pendingTasks: taskStats.pending,
        urgentTasks: taskStats.urgent,
      },
      tasks: pendingTasks.slice(0, 10),
      upcomingContent: upcomingContent.slice(0, 10),
      pipelineHealth,
      timelineAlerts,
    };
  },
  ['dashboard-data'],
  { revalidate: 30, tags: ['dashboard'] }
);

async function getDashboardData() {
  return getCachedDashboardData();
}

// Get personalized tasks for the current user
async function getMyTasks() {
  const session = await getSession();

  // If user has a Notion user ID, get their assigned tasks
  if (session.isLoggedIn && session.notionUserId) {
    const myTasks = await getTasksByAssignee(session.notionUserId);
    return {
      tasks: myTasks.slice(0, 10),
      userName: session.name?.split(' ')[0] || 'Your',
    };
  }

  // Fallback to all pending tasks if no user ID
  const pendingTasks = await getPendingTasks();
  return {
    tasks: pendingTasks.slice(0, 10),
    userName: 'My',
  };
}

export default async function DashboardPage() {
  // Fetch cached data and personalized tasks in parallel
  const [data, myTasksData] = await Promise.all([
    getDashboardData(),
    getMyTasks(),
  ]);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-400">Welcome back. Here&apos;s what&apos;s happening today.</p>
      </div>

      {/* Timeline Alerts - Only shows when there are alerts */}
      <TimelineAlerts alerts={data.timelineAlerts} />

      {/* Stats Cards */}
      <StatsCards stats={data.stats} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks - Personalized for logged-in user */}
        <TaskList tasks={myTasksData.tasks} title={`${myTasksData.userName}'s Tasks`} />

        {/* Pipeline Health */}
        <PipelineHealth clients={data.pipelineHealth} />
      </div>

      {/* Upcoming Content */}
      <UpcomingContent content={data.upcomingContent} />
    </div>
  );
}
