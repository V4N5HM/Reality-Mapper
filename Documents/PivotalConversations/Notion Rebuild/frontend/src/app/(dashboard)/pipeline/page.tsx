import { unstable_cache } from 'next/cache';
import { getAllPipelineData } from '@/lib/notion/content';
import { getClients } from '@/lib/notion/clients';
import { getTeamMembers } from '@/lib/notion/team';
import { PipelineView } from '@/components/content/pipeline-view';
import { parseDateRangeFromParams } from '@/lib/date-range-utils';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Cache pipeline data for 5 seconds - ensures near-instant updates
// Uses unstable_cache with short TTL for responsiveness
const getCachedPipelineData = unstable_cache(
  async (dateFrom?: string | null, dateTo?: string | null) => {
    const dateOptions = {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };

    // Single batched query for all content + parallel fetch for clients/team
    const [pipelineData, clients, teamMembers] = await Promise.all([
      getAllPipelineData(dateOptions),
      getClients('Active'),
      getTeamMembers(),
    ]);

    return { ...pipelineData, clients, teamMembers };
  },
  ['pipeline-data'],
  { revalidate: 5, tags: ['pipeline', 'content', 'clients'] }
);

export default async function PipelinePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const urlParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'string') urlParams.set(key, value);
  });
  const { dateFrom, dateTo } = parseDateRangeFromParams(urlParams);

  const data = await getCachedPipelineData(dateFrom, dateTo);

  return (
    <PipelineView
      shortForm={data.shortForm}
      youtube={data.youtube}
      podcast={data.podcast}
      clients={data.clients}
      teamMembers={data.teamMembers}
    />
  );
}
