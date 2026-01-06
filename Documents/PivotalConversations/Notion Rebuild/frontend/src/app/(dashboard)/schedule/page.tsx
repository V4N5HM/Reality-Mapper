import { unstable_cache } from 'next/cache';
import { getContent } from '@/lib/notion/content';
import { getClients } from '@/lib/notion/clients';
import { getTeamMembers } from '@/lib/notion/team';
import { ScheduleCalendar } from '@/components/schedule/schedule-calendar';
import { ScheduleGrid } from '@/components/schedule/schedule-grid';
import { ScheduleStats } from '@/components/schedule/schedule-stats';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Video, Youtube, Mic, LayoutGrid, CalendarDays, Table2 } from 'lucide-react';
import { ContentType } from '@/types';
import { parseDateRangeFromParams } from '@/lib/date-range-utils';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Cache schedule data for 5 seconds - ensures near-instant updates
// Reduced limit from 300 to 150 for faster first load
const getCachedScheduleData = unstable_cache(
  async (dateFrom?: string | null, dateTo?: string | null) => {
    // Single content query for all data - filter on client side
    const [allContent, clients, teamMembers] = await Promise.all([
      getContent({ limit: 150, sortDirection: 'descending' }),
      getClients('Active'),
      getTeamMembers(),
    ]);

    // Filter scheduled content based on date range
    const scheduledContent = allContent.filter(c => {
      if (!c.scheduledDate) return false;
      if (dateFrom && c.scheduledDate < dateFrom) return false;
      if (dateTo && c.scheduledDate > dateTo) return false;
      return true;
    });

    // Filter unscheduled content
    const unscheduledContent = allContent.filter(c => !c.scheduledDate);

    // Combine for allContent (used by grid for scheduling unscheduled items)
    const combinedContent = [...scheduledContent, ...unscheduledContent];

    // Group by content type
    const shortForm = scheduledContent.filter((c) => c.contentType === 'Short Form');
    const youtube = scheduledContent.filter((c) => c.contentType === 'YouTube');
    const podcast = scheduledContent.filter((c) => c.contentType === 'Podcast');

    // Calculate stats per client - how many days ahead each client is scheduled
    const statsToday = new Date();
    statsToday.setHours(0, 0, 0, 0);

    const clientScheduleHealth = clients.map((client) => {
      const clientContent = scheduledContent.filter((c) => c.clientId === client.id);
      const approvedOrScheduled = clientContent.filter((c) =>
        ['Approved', 'Scheduled', 'To Schedule', 'Live', 'Posted'].includes(c.status)
      );

      // Find the furthest scheduled date
      let daysAhead = 0;
      if (approvedOrScheduled.length > 0) {
        const dates = approvedOrScheduled
          .map((c) => new Date(c.scheduledDate!))
          .filter((d) => d >= statsToday)
          .sort((a, b) => b.getTime() - a.getTime());

        if (dates.length > 0) {
          daysAhead = Math.ceil((dates[0].getTime() - statsToday.getTime()) / (1000 * 60 * 60 * 24));
        }
      }

      // Count content in next 5 days (minimum requirement)
      const fiveDaysLater = new Date(statsToday);
      fiveDaysLater.setDate(statsToday.getDate() + 5);

      const contentNext5Days = approvedOrScheduled.filter((c) => {
        const date = new Date(c.scheduledDate!);
        return date >= statsToday && date <= fiveDaysLater;
      }).length;

      return {
        id: client.id,
        name: client.name,
        daysAhead,
        contentNext5Days,
        totalScheduled: approvedOrScheduled.length,
        isHealthy: daysAhead >= 5, // Minimum 5 days ahead required
      };
    });

    return {
      all: combinedContent, // ALL content (including unscheduled) for the grid's "Schedule Content" feature
      scheduled: scheduledContent,
      shortForm,
      youtube,
      podcast,
      clients,
      teamMembers,
      clientScheduleHealth,
    };
  },
  ['schedule-data'],
  { revalidate: 5, tags: ['schedule', 'content', 'clients'] }
);

export default async function SchedulePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const urlParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'string') urlParams.set(key, value);
  });
  const { dateFrom, dateTo } = parseDateRangeFromParams(urlParams);

  const data = await getCachedScheduleData(dateFrom, dateTo);

  const counts = {
    all: data.scheduled.length,
    shortForm: data.shortForm.length,
    youtube: data.youtube.length,
    podcast: data.podcast.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Schedule Pipeline</h1>
        <p className="text-zinc-400">Manage content scheduling across all clients</p>
      </div>

      {/* Schedule Health Stats */}
      <ScheduleStats clientHealth={data.clientScheduleHealth} />

      {/* View Mode Tabs */}
      <Tabs defaultValue="grid" className="space-y-4">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="grid" className="gap-2">
            <Table2 className="w-4 h-4" />
            Schedule Grid
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarDays className="w-4 h-4" />
            Calendar View
          </TabsTrigger>
        </TabsList>

        {/* Grid View - Like Google Sheets */}
        <TabsContent value="grid" className="mt-4">
          <ScheduleGrid content={data.all} clients={data.clients} teamMembers={data.teamMembers} />
        </TabsContent>

        {/* Calendar View - Monthly overview */}
        <TabsContent value="calendar" className="mt-4">
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="bg-zinc-800 border border-zinc-700">
              <TabsTrigger value="all" className="gap-2">
                <LayoutGrid className="w-4 h-4" />
                All
                <span className="ml-1 text-xs text-zinc-500">({counts.all})</span>
              </TabsTrigger>
              <TabsTrigger value="short-form" className="gap-2">
                <Video className="w-4 h-4" />
                Short Form
                <span className="ml-1 text-xs text-zinc-500">({counts.shortForm})</span>
              </TabsTrigger>
              <TabsTrigger value="youtube" className="gap-2">
                <Youtube className="w-4 h-4" />
                YouTube
                <span className="ml-1 text-xs text-zinc-500">({counts.youtube})</span>
              </TabsTrigger>
              <TabsTrigger value="podcast" className="gap-2">
                <Mic className="w-4 h-4" />
                Podcast
                <span className="ml-1 text-xs text-zinc-500">({counts.podcast})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <ScheduleCalendar content={data.scheduled} clients={data.clients} teamMembers={data.teamMembers} />
            </TabsContent>

            <TabsContent value="short-form" className="mt-4">
              <ScheduleCalendar content={data.shortForm} clients={data.clients} teamMembers={data.teamMembers} />
            </TabsContent>

            <TabsContent value="youtube" className="mt-4">
              <ScheduleCalendar content={data.youtube} clients={data.clients} teamMembers={data.teamMembers} />
            </TabsContent>

            <TabsContent value="podcast" className="mt-4">
              <ScheduleCalendar content={data.podcast} clients={data.clients} teamMembers={data.teamMembers} />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
