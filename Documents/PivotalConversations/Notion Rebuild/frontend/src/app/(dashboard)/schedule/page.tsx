import { unstable_cache } from 'next/cache';
import { getAllPipelineData, getContent } from '@/lib/notion/content';
import { getClients } from '@/lib/notion/clients';
import { getTeamMembers } from '@/lib/notion/team';
import { ScheduleCalendar } from '@/components/schedule/schedule-calendar';
import { ScheduleGrid } from '@/components/schedule/schedule-grid';
import { ScheduleStats } from '@/components/schedule/schedule-stats';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Video, Youtube, Mic, LayoutGrid, CalendarDays, Table2 } from 'lucide-react';

// Cache schedule data for 5 seconds - ensures near-instant updates
// Uses getAllPipelineData() for the grid + getContent() for scheduled content
const getCachedScheduleData = unstable_cache(
  async () => {
    // Calculate date ranges for fetching scheduled content
    // Get content from 30 days ago to 60 days in the future to capture:
    // - Posted/Live content from recent past
    // - Scheduled content for upcoming days
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const sixtyDaysAhead = new Date(today);
    sixtyDaysAhead.setDate(today.getDate() + 60);

    const dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
    const dateTo = sixtyDaysAhead.toISOString().split('T')[0];

    // Fetch pipeline data for the grid (unscheduled content) AND
    // separately fetch ALL scheduled content within date range (including Posted/Live)
    const [pipelineData, scheduledContent, clients, teamMembers] = await Promise.all([
      getAllPipelineData(), // For grid view
      getContent({
        dateFrom,
        dateTo,
        limit: 1000,
        sortDirection: 'ascending'
      }), // Scheduled content within date range
      getClients('Active'),
      getTeamMembers(),
    ]);

    // Merge: use pipeline data for unscheduled, add scheduled content
    // This ensures Posted/Live content with old created dates still shows
    const pipelineContentIds = new Set(pipelineData.allContent.map(c => c.id));
    const additionalScheduled = scheduledContent.filter(c => !pipelineContentIds.has(c.id));
    const allContent = [...pipelineData.allContent, ...additionalScheduled];

    // Group by content type (for calendar view tabs)
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
      all: allContent, // ALL content (scheduled + unscheduled) for the grid
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

export default async function SchedulePage() {
  // Fetch all data - no date filtering
  const data = await getCachedScheduleData();

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
