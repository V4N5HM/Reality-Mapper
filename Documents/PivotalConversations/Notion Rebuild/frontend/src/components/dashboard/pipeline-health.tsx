import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ClientPipelineHealth {
  id: string;
  name: string;
  scheduledCount: number;
  requiredCount: number;
}

interface PipelineHealthProps {
  clients: ClientPipelineHealth[];
}

export function PipelineHealth({ clients }: PipelineHealthProps) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-white">
          Pipeline Health
        </CardTitle>
        <p className="text-sm text-zinc-500">Short Form content scheduled (min 5 days ahead)</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {clients.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-4">No active clients</p>
          ) : (
            clients.map((client) => {
              const isHealthy = client.scheduledCount >= client.requiredCount;
              const isWarning = client.scheduledCount >= client.requiredCount * 0.6;

              return (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50"
                >
                  <span className="text-sm font-medium text-white truncate">
                    {client.name}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs',
                      isHealthy
                        ? 'bg-green-500/10 text-green-500 border-green-500/20'
                        : isWarning
                        ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                    )}
                  >
                    {isHealthy ? '✓' : isWarning ? '⚠' : '✗'} {client.scheduledCount}/{client.requiredCount}
                  </Badge>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
