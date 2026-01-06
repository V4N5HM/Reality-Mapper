import { Content } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { contentTypeIcons, contentTypeColors, getStatusColor } from '@/lib/ui-constants';

interface UpcomingContentProps {
  content: Content[];
}

export function UpcomingContent({ content }: UpcomingContentProps) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-white">
          Upcoming Content
        </CardTitle>
        <p className="text-sm text-zinc-500">Next 7 days</p>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="space-y-1 p-4 pt-0">
            {content.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-4">No upcoming content</p>
            ) : (
              content.map((item) => {
                const Icon = contentTypeIcons[item.contentType];

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className={cn('p-2 rounded-lg', contentTypeColors[item.contentType])}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {item.clientName && (
                          <span className="text-xs text-zinc-500">{item.clientName}</span>
                        )}
                        {item.scheduledDate && (
                          <span className="text-xs text-zinc-500">
                            {new Date(item.scheduledDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', getStatusColor(item.status))}
                    >
                      {item.status}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
