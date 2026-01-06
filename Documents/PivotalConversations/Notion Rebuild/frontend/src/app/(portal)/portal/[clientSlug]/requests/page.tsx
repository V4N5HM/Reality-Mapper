import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getClients } from '@/lib/notion/clients';
import { RequestForm } from '@/components/portal/request-form';

interface PageProps {
    params: Promise<{ clientSlug: string }>;
}

// Cache clients for 60 seconds
const getCachedClients = unstable_cache(
    async () => getClients('Active'),
    ['portal-requests-clients'],
    { revalidate: 60, tags: ['clients'] }
);

// Find client by slug
async function getClientBySlug(slug: string) {
    const clients = await getCachedClients();
    const normalizedSlug = slug.toLowerCase();

    return clients.find((client) => {
        const clientSlug = client.name.toLowerCase().replace(/\s+/g, '-');
        return clientSlug === normalizedSlug;
    });
}

export default async function RequestsPage({ params }: PageProps) {
    const { clientSlug } = await params;
    const client = await getClientBySlug(clientSlug);

    if (!client) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Submit Request</h1>
                <p className="text-zinc-400">
                    Submit a new idea, edit request, or strategy question.
                </p>
            </div>

            <div className="max-w-2xl">
                <RequestForm clientId={client.id} />
            </div>
        </div>
    );
}
