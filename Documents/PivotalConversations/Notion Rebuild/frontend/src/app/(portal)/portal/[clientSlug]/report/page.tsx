import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getClients } from '@/lib/notion/clients';
import { ClientPortalReport } from './client-portal-report';

interface PageProps {
  params: Promise<{ clientSlug: string }>;
}

// Cache clients for 60 seconds
const getCachedClients = unstable_cache(
  async () => getClients('Active'),
  ['portal-report-clients'],
  { revalidate: 60, tags: ['clients'] }
);

async function getClientBySlug(slug: string) {
  const clients = await getCachedClients();
  const normalizedSlug = slug.toLowerCase();

  const found = clients.find((client) => {
    const clientSlug = client.name.toLowerCase().replace(/\s+/g, '-');
    return clientSlug === normalizedSlug;
  });

  return found;
}

export default async function ReportPage({ params }: PageProps) {
  const { clientSlug } = await params;
  const client = await getClientBySlug(clientSlug);

  if (!client) {
    notFound();
  }

  return <ClientPortalReport clientName={client.name} />;
}
