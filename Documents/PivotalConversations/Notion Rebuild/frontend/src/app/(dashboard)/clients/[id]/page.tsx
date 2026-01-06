import { notFound } from 'next/navigation';
import { getClient } from '@/lib/notion/clients';
import { getContent } from '@/lib/notion/content';
import { getTasks } from '@/lib/notion/tasks';
import { getClientCaseNotes } from '@/lib/notion/case-notes';
import { getClientIdeasByName } from '@/lib/notion/ideas';
import { getClientBrainDocuments } from '@/lib/notion/brain';
import { getPackage } from '@/lib/notion/packages';
import { ClientDetailView } from '@/components/clients/client-detail-view';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

// Cache client data for 30 seconds
const getCachedClientData = unstable_cache(
  async (id: string) => {
    const client = await getClient(id);
    if (!client) return null;

    // Skip client name enrichment since we already know the client
    const [content, tasks, caseNotes, ideas, brainDocs, clientPackage] = await Promise.all([
      getContent({ clientId: id, limit: 100, includeClientNames: false }),
      getTasks({ clientId: id, limit: 100 }),
      getClientCaseNotes(id),
      getClientIdeasByName(client.name, 100),
      getClientBrainDocuments(id),
      client.packageId ? getPackage(client.packageId) : Promise.resolve(null),
    ]);

    return { client, content, tasks, caseNotes, ideas, brainDocs, clientPackage };
  },
  ['client-detail-data'],
  { revalidate: 30, tags: ['clients', 'content', 'tasks'] }
);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getCachedClientData(id);

  if (!data) {
    notFound();
  }

  const { client, content, tasks, caseNotes, ideas, brainDocs, clientPackage } = data;

  return (
    <ClientDetailView
      client={client}
      content={content}
      tasks={tasks}
      caseNotes={caseNotes}
      ideas={ideas}
      brainDocs={brainDocs}
      clientPackage={clientPackage}
    />
  );
}
