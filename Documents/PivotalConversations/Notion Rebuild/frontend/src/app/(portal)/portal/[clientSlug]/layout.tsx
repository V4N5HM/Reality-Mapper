import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getAllClients as getReportClients } from '@/lib/report-dashboard/report-clients';
import { PortalHeader } from '@/components/portal/portal-header';
import { PortalProvider } from '@/contexts/portal-context';
import {
    getPortalClientBySlug,
    getCachedPortalContent,
    getCachedPortalIdeas,
    getCachedContentBankClientId,
    getCachedPortalPackage,
} from '@/lib/portal-cache';

interface LayoutProps {
    children: React.ReactNode;
    params: Promise<{ clientSlug: string }>;
}

// Cache report clients for 5 minutes (rarely changes)
const getCachedReportClients = unstable_cache(
    async () => getReportClients(),
    ['portal-layout-report-clients'],
    { revalidate: 300, tags: ['report-clients'] }
);

export default async function ClientPortalLayout({ children, params }: LayoutProps) {
    const { clientSlug } = await params;
    const client = await getPortalClientBySlug(clientSlug);

    if (!client) {
        notFound();
    }

    // Prefetch ALL portal data in parallel at layout level for instant tab switching
    const [reportClients, content, ideas, contentBankClientId, clientPackage] = await Promise.all([
        getCachedReportClients(),
        getCachedPortalContent(client.id),
        getCachedPortalIdeas(client.name),
        getCachedContentBankClientId(client.name),
        client.packageId ? getCachedPortalPackage(client.packageId) : Promise.resolve(null),
    ]);

    // Check if this client has a report dashboard configured
    const hasReport = reportClients.some(
        (rc) => rc.name.toLowerCase() === client.name.toLowerCase()
    );

    const portalData = {
        client,
        content,
        ideas,
        contentBankClientId,
        clientPackage,
    };

    return (
        <div className="min-h-screen bg-zinc-950">
            <PortalHeader clientSlug={clientSlug} clientName={client.name} hasReport={hasReport} />
            <PortalProvider initialData={portalData}>
                <main className="container px-4 py-6 mx-auto max-w-6xl">
                    {children}
                </main>
            </PortalProvider>
        </div>
    );
}
