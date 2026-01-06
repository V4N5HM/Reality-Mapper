'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface ClientHealth {
  id: string;
  name: string;
  daysAhead: number;
  contentNext5Days: number;
  totalScheduled: number;
  isHealthy: boolean;
}

interface ScheduleStatsProps {
  clientHealth: ClientHealth[];
}

export function ScheduleStats({ clientHealth }: ScheduleStatsProps) {
  const healthyClients = clientHealth.filter((c) => c.daysAhead >= 5);
  const warningClients = clientHealth.filter((c) => c.daysAhead >= 2 && c.daysAhead < 5);
  const criticalClients = clientHealth.filter((c) => c.daysAhead < 2);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{healthyClients.length}</p>
              <p className="text-sm text-zinc-400">Healthy (5+ days)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{warningClients.length}</p>
              <p className="text-sm text-zinc-400">Warning (2-4 days)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{criticalClients.length}</p>
              <p className="text-sm text-zinc-400">Critical (&lt;2 days)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Health List */}
      {(criticalClients.length > 0 || warningClients.length > 0) && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400">Clients Needing Attention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/20"
                >
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-white">{client.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500">
                      {client.contentNext5Days} scheduled next 5 days
                    </span>
                    <Badge
                      variant="outline"
                      className="text-xs bg-red-500/10 text-red-500 border-red-500/20"
                    >
                      {client.daysAhead} days ahead
                    </Badge>
                  </div>
                </div>
              ))}
              {warningClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-white">{client.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500">
                      {client.contentNext5Days} scheduled next 5 days
                    </span>
                    <Badge
                      variant="outline"
                      className="text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                    >
                      {client.daysAhead} days ahead
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
