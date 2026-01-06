import { getAlerts, getAlertStats } from '@/lib/notion/alerts';
import { getClients } from '@/lib/notion/clients';
import { AlertsView } from '@/components/alerts/alerts-view';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getAlertsData() {
  const [alerts, stats, clients] = await Promise.all([
    getAlerts({ dismissed: false }),
    getAlertStats(),
    getClients('Active'),
  ]);

  // Build client ID to name map for quick lookup
  const clientIdToName = new Map(clients.map(c => [c.id, c.name]));

  // Enrich alerts with client names
  const enrichedAlerts = alerts.map(alert => ({
    ...alert,
    clientName: alert.clientId ? clientIdToName.get(alert.clientId) : undefined,
  }));

  return {
    alerts: enrichedAlerts,
    stats,
    clients,
  };
}

export default async function AlertsPage() {
  const data = await getAlertsData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Alerts</h1>
          <p className="text-zinc-400">
            {data.stats.total} total • {data.stats.unread} unread
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Bell className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{data.stats.total}</p>
              <p className="text-sm text-zinc-400">Total Alerts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{data.stats.unread}</p>
              <p className="text-sm text-zinc-400">Unread</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{data.stats.urgent}</p>
              <p className="text-sm text-zinc-400">Urgent</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{data.stats.total - data.stats.unread}</p>
              <p className="text-sm text-zinc-400">Read</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts View */}
      <AlertsView
        alerts={data.alerts}
        clients={data.clients}
      />
    </div>
  );
}
