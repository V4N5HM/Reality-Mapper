import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getClients } from '@/lib/notion/clients';
import { AcuityBookingsList } from '@/components/acuity/acuity-bookings-list';

interface PageProps {
    params: Promise<{ clientSlug: string }>;
}

// Cache clients for 60 seconds
const getCachedClients = unstable_cache(
    async () => getClients('Active'),
    ['portal-bookings-clients'],
    { revalidate: 60, tags: ['clients'] }
);

// Find client by slug (using client name lowercased and hyphenated)
async function getClientBySlug(slug: string) {
    const clients = await getCachedClients();
    const normalizedSlug = slug.toLowerCase();

    return clients.find((client) => {
        const clientSlug = client.name.toLowerCase().replace(/\s+/g, '-');
        return clientSlug === normalizedSlug;
    });
}

export default async function ClientBookingsPage({ params }: PageProps) {
    const { clientSlug } = await params;
    const client = await getClientBySlug(clientSlug);

    if (!client) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white mb-2">Bookings</h1>
                <p className="text-zinc-400">
                    View and manage your upcoming and past appointments
                </p>
            </div>

            <AcuityBookingsList clientId={client.id} />
        </div>
    );
}
