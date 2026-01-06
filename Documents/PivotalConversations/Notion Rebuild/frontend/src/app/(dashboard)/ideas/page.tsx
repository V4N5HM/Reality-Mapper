import { unstable_cache } from 'next/cache';
import { getIdeasWithClientNames } from '@/lib/notion/ideas';
import { getClients } from '@/lib/notion/clients';
import { IdeasTable } from '@/components/ideas/ideas-table';
import { IdeasPageHeader } from '@/components/ideas/ideas-page-header';
import { Video, Youtube, Mic, LayoutGrid } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { parseDateRangeFromParams } from '@/lib/date-range-utils';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Cache ideas data for 30 seconds
// Reduced limit from 500 to 100 for faster first load
const getCachedIdeasData = unstable_cache(
  async (dateFrom?: string | null, dateTo?: string | null) => {
    const [allIdeas, clients] = await Promise.all([
      getIdeasWithClientNames({
        limit: 100,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
      getClients('Active'),
    ]);

    // Group by content type
    const shortForm = allIdeas.filter((i) => i.contentType === 'Short Form');
    const youtube = allIdeas.filter((i) => i.contentType === 'YouTube');
    const podcast = allIdeas.filter((i) => i.contentType === 'Podcast');

    return {
      all: allIdeas,
      shortForm,
      youtube,
      podcast,
      clients,
    };
  },
  ['ideas-data'],
  { revalidate: 30, tags: ['ideas', 'clients'] }
);

export default async function IdeasPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const urlParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'string') urlParams.set(key, value);
  });
  const { dateFrom, dateTo } = parseDateRangeFromParams(urlParams);

  const data = await getCachedIdeasData(dateFrom, dateTo);

  const counts = {
    all: data.all.length,
    shortForm: data.shortForm.length,
    youtube: data.youtube.length,
    podcast: data.podcast.length,
  };

  // Count by status
  const statusCounts = {
    newIdeas: data.all.filter((i) => i.status === 'Not started' || i.status === 'Ideas').length,
    needsReview: data.all.filter((i) => i.status === 'Needs Review' || i.status === 'Reviewing').length,
    approved: data.all.filter((i) => i.status === 'Approved').length,
    done: data.all.filter((i) => i.status === 'Done' || i.status === 'Used').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <IdeasPageHeader clients={data.clients} statusCounts={statusCounts} />

      {/* Ideas Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="all" className="gap-2">
            <LayoutGrid className="w-4 h-4" />
            All Ideas
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
          <IdeasTable
            ideas={data.all}
            clients={data.clients}
          />
        </TabsContent>

        <TabsContent value="short-form" className="mt-4">
          <IdeasTable
            ideas={data.shortForm}
            clients={data.clients}
            contentTypeFilter="Short Form"
          />
        </TabsContent>

        <TabsContent value="youtube" className="mt-4">
          <IdeasTable
            ideas={data.youtube}
            clients={data.clients}
            contentTypeFilter="YouTube"
          />
        </TabsContent>

        <TabsContent value="podcast" className="mt-4">
          <IdeasTable
            ideas={data.podcast}
            clients={data.clients}
            contentTypeFilter="Podcast"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
