import { getClients } from '@/lib/notion/clients';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { AddClientDialog } from '@/components/clients/add-client-dialog';
import { ClientsListView } from '@/components/clients/clients-list-view';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

// Cache clients data for 2 minutes (clients change infrequently)
const getCachedClients = unstable_cache(
  async () => getClients(),
  ['clients-page-data'],
  { revalidate: 120, tags: ['clients'] }
);

export default async function ClientsPage() {
  const clients = await getCachedClients();

  const activeClients = clients.filter((c) => c.status === 'Active');
  const otherClients = clients.filter((c) => c.status !== 'Active');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clients</h1>
          <p className="text-zinc-400">Manage your client roster</p>
        </div>
        <AddClientDialog />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Total</p>
                <p className="text-2xl font-bold text-white">{clients.length}</p>
              </div>
              <Users className="w-8 h-8 text-zinc-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Active</p>
                <p className="text-2xl font-bold text-green-500">{activeClients.length}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Onboarding</p>
                <p className="text-2xl font-bold text-blue-500">
                  {clients.filter((c) => c.status === 'Onboarding').length}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Paused</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {clients.filter((c) => c.status === 'Paused').length}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients List with Multi-Select */}
      <ClientsListView
        activeClients={activeClients}
        otherClients={otherClients}
      />
    </div>
  );
}
