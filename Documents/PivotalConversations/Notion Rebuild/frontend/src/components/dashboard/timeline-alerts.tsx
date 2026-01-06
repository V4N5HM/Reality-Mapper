'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, AlertCircle, Clock, Video, Youtube, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimelineAlert } from '@/lib/timeline-utils';

interface TimelineAlertsProps {
  alerts: TimelineAlert[];
}

const alertTypeConfig = {
  overdue: {
    icon: AlertCircle,
    label: 'Overdue',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
  },
  at_risk: {
    icon: AlertTriangle,
    label: 'At Risk',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
  },
  approaching: {
    icon: Clock,
    label: 'Approaching',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
};

const contentTypeIcons = {
  'Short Form': Video,
  'YouTube': Youtube,
  'Podcast': Mic,
};

export function TimelineAlerts({ alerts }: TimelineAlertsProps) {
  if (alerts.length === 0) {
    return null; // Don't render if no alerts
  }

  const overdueCount = alerts.filter(a => a.alertType === 'overdue').length;
  const atRiskCount = alerts.filter(a => a.alertType === 'at_risk').length;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Timeline Alerts
          </CardTitle>
          <div className="flex items-center gap-2">
            {overdueCount > 0 && (
              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                {overdueCount} overdue
              </Badge>
            )}
            {atRiskCount > 0 && (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                {atRiskCount} at risk
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {alerts.map((alert) => {
              const config = alertTypeConfig[alert.alertType];
              const AlertIcon = config.icon;
              const ContentIcon = contentTypeIcons[alert.contentType];

              return (
                <div
                  key={alert.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border',
                    config.bgColor,
                    config.borderColor
                  )}
                >
                  <AlertIcon className={cn('w-5 h-5 shrink-0', config.color)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">
                        {alert.title}
                      </p>
                      <Badge variant="outline" className={cn('text-xs shrink-0', config.color, config.borderColor)}>
                        {config.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={cn('p-1 rounded',
                        alert.contentType === 'Short Form' ? 'bg-blue-500/20' :
                        alert.contentType === 'YouTube' ? 'bg-red-500/20' : 'bg-purple-500/20'
                      )}>
                        <ContentIcon className={cn('w-3 h-3',
                          alert.contentType === 'Short Form' ? 'text-blue-500' :
                          alert.contentType === 'YouTube' ? 'text-red-500' : 'text-purple-500'
                        )} />
                      </div>
                      <span className="text-xs text-zinc-500">
                        {alert.clientName || 'Unknown client'}
                      </span>
                      <span className="text-xs text-zinc-600">•</span>
                      <span className="text-xs text-zinc-500">
                        {alert.status}
                      </span>
                      <span className="text-xs text-zinc-600">•</span>
                      <span className={cn('text-xs', config.color)}>
                        {alert.daysUntilDue === 0
                          ? 'Due today'
                          : alert.daysUntilDue < 0
                          ? `${Math.abs(alert.daysUntilDue)} days overdue`
                          : `${alert.daysUntilDue} days until due`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
