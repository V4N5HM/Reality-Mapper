import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { unstable_cache } from 'next/cache';
import { sessionOptions, SessionData } from '@/lib/auth/session';
import { getTasks, getTaskStats } from '@/lib/notion/tasks';
import { getClients } from '@/lib/notion/clients';
import { getTeamMembers } from '@/lib/notion/team';
import { TasksView } from '@/components/tasks/tasks-view';
import { Button } from '@/components/ui/button';
import { Plus, AlertTriangle, Clock, CalendarDays, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { parseDateRangeFromParams } from '@/lib/date-range-utils';

async function getSession() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session;
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Cache tasks data for 30 seconds
// Reduced limit from 500 to 100 for faster first load
const getCachedTasksData = unstable_cache(
  async (dueDateFrom?: string | null, dueDateTo?: string | null) => {
    const [allTasksRaw, stats, clients, teamMembers] = await Promise.all([
      getTasks({
        limit: 100,
        dueDateFrom: dueDateFrom || undefined,
        dueDateTo: dueDateTo || undefined,
      }),
      getTaskStats(),
      getClients('Active'),
      getTeamMembers(),
    ]);

    return { allTasksRaw, stats, clients, teamMembers };
  },
  ['tasks-data'],
  { revalidate: 30 }
);

function processTasksData(
  allTasksRaw: any[],
  stats: any,
  clients: any[],
  teamMembers: any[],
  isAdmin: boolean,
  currentUserId?: string,
  currentUserName?: string
) {
  // Filter tasks: admins see all, others see only their tasks or unassigned
  let allTasks = allTasksRaw;
  if (!isAdmin && currentUserId) {
    allTasks = allTasksRaw.filter(task => {
      if (task.assignedTo === currentUserId) return true;
      if (!task.assignedTo) return true;
      if (currentUserName && task.assignedTo === currentUserName) return true;
      return false;
    });
  }

  // Build client ID to name map for quick lookup
  const clientIdToName = new Map(clients.map(c => [c.id, c.name]));

  // Enrich tasks with client names
  const enrichedTasks = allTasks.map(task => ({
    ...task,
    clientName: task.clientId ? clientIdToName.get(task.clientId) : undefined,
  }));

  // Sort helper - earliest due date first, nulls last
  const sortByDueDate = (a: typeof enrichedTasks[0], b: typeof enrichedTasks[0]) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  };

  // Group by urgency and sort by due date
  const urgent = enrichedTasks
    .filter((t) => t.urgency === 'Urgent' && t.status !== 'Complete')
    .sort(sortByDueDate);
  const thisWeek = enrichedTasks
    .filter((t) => t.urgency === 'This Week' && t.status !== 'Complete')
    .sort(sortByDueDate);
  const thisMonth = enrichedTasks
    .filter((t) => t.urgency === 'This Month' && t.status !== 'Complete')
    .sort(sortByDueDate);
  const completed = enrichedTasks
    .filter((t) => t.status === 'Complete')
    .sort((a, b) => {
      if (!a.completedDate && !b.completedDate) return 0;
      if (!a.completedDate) return 1;
      if (!b.completedDate) return -1;
      return new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime();
    })
    .slice(0, 20);

  return {
    all: enrichedTasks,
    urgent,
    thisWeek,
    thisMonth,
    completed,
    stats,
    clients,
    teamMembers,
  };
}

export default async function TasksPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const urlParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'string') urlParams.set(key, value);
  });
  const { dateFrom, dateTo } = parseDateRangeFromParams(urlParams);

  // Get session to determine user access level
  const session = await getSession();
  const isAdmin = session.isAdmin || false;
  const currentUserId = session.notionUserId || session.userId;
  const currentUserName = session.name;

  // Get cached data
  const cachedData = await getCachedTasksData(dateFrom, dateTo);

  // Process with user-specific filtering (not cached since it depends on user)
  const data = processTasksData(
    cachedData.allTasksRaw,
    cachedData.stats,
    cachedData.clients,
    cachedData.teamMembers,
    isAdmin,
    currentUserId,
    currentUserName
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-zinc-400">
            {data.stats.pending} pending tasks • {data.stats.urgent} urgent
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Task
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{data.stats.urgent}</p>
              <p className="text-sm text-zinc-400">Urgent (48hrs)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{data.stats.thisWeek}</p>
              <p className="text-sm text-zinc-400">This Week</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-500/10">
              <CalendarDays className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{data.all.filter(t => t.urgency === 'This Month' && t.status !== 'Complete').length}</p>
              <p className="text-sm text-zinc-400">This Month</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{data.stats.completed}</p>
              <p className="text-sm text-zinc-400">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Lists */}
      <TasksView
        urgent={data.urgent}
        thisWeek={data.thisWeek}
        thisMonth={data.thisMonth}
        completed={data.completed}
        clients={data.clients}
        teamMembers={data.teamMembers}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
      />
    </div>
  );
}
