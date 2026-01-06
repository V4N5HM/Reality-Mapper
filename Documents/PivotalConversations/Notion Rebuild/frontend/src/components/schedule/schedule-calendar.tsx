'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Video, Youtube, Mic, Plus, Calendar, Loader2 } from 'lucide-react';
import { Content, Client, ContentType } from '@/types';
import { toast } from 'sonner';
import { ContentDetailModal } from '@/components/content/content-detail-modal';

// Helper to format date as YYYY-MM-DD in local timezone (avoids UTC conversion issues)
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  roles?: string[];
  teamRole?: string;
  isAdmin?: boolean;
}

interface ScheduleCalendarProps {
  content: Content[];
  clients: Client[];
  teamMembers?: TeamMember[];
}

const contentTypeColors = {
  'Short Form': 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  'YouTube': 'bg-red-500/20 border-red-500/30 text-red-400',
  'Podcast': 'bg-purple-500/20 border-purple-500/30 text-purple-400',
};

const contentTypeIcons = {
  'Short Form': Video,
  'YouTube': Youtube,
  'Podcast': Mic,
};

const statusBadgeColors: Record<string, string> = {
  'Approved': 'bg-green-500/10 text-green-500 border-green-500/20',
  'Scheduled': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  'To Schedule': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'Live': 'bg-green-500/10 text-green-500 border-green-500/20',
  'Posted': 'bg-green-500/10 text-green-500 border-green-500/20',
};

interface DayDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  content: Content[];
  clients: Client[];
  onContentClick: (content: Content) => void;
}

function DayDetailDialog({ open, onOpenChange, date, content, clients, onContentClick }: DayDetailDialogProps) {
  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.name || 'Unknown';
  };

  if (!date) return null;

  const dateString = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {dateString}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3 py-2">
            {content.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-4">No content scheduled</p>
            ) : (
              content.map((item) => {
                const Icon = contentTypeIcons[item.contentType];
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      onContentClick(item);
                      onOpenChange(false);
                    }}
                    className="p-3 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('p-2 rounded-lg',
                        item.contentType === 'Short Form' ? 'bg-blue-500/10' :
                        item.contentType === 'YouTube' ? 'bg-red-500/10' : 'bg-purple-500/10'
                      )}>
                        <Icon className={cn('w-4 h-4',
                          item.contentType === 'Short Form' ? 'text-blue-500' :
                          item.contentType === 'YouTube' ? 'text-red-500' : 'text-purple-500'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        <p className="text-xs text-zinc-500">{getClientName(item.clientId)}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className={cn('text-xs', statusBadgeColors[item.status] || 'bg-zinc-500/10 text-zinc-400')}>
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
        <p className="text-xs text-zinc-500 text-center">Click on content to view details</p>
      </DialogContent>
    </Dialog>
  );
}

interface AddContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  clients: Client[];
  onContentCreated: (content: Content) => void;
}

function AddContentDialog({ open, onOpenChange, date, clients, onContentCreated }: AddContentDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [contentType, setContentType] = useState<ContentType>('Short Form');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !clientId || !date) return;

    setIsCreating(true);
    try {
      const scheduledDate = formatDateKey(date);
      const response = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          clientId,
          contentType,
          status: 'Filmed',
          scheduledDate,
        }),
      });

      if (!response.ok) throw new Error('Failed to create content');

      const newContent = await response.json();
      toast.success('Content scheduled successfully');
      router.refresh();
      onContentCreated(newContent);
      onOpenChange(false);
      setTitle('');
      setClientId('');
    } catch (error) {
      toast.error('Failed to create content');
      console.error('Error creating content:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!date) return null;

  const dateString = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white">Schedule Content for {dateString}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-zinc-300">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Content title..."
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Select a client..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Content Type</Label>
            <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="Short Form">Short Form</SelectItem>
                <SelectItem value="YouTube">YouTube</SelectItem>
                <SelectItem value="Podcast">Podcast</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-zinc-700 text-zinc-300">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!title.trim() || !clientId || isCreating} className="gap-2">
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isCreating ? 'Scheduling...' : 'Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ScheduleCalendar({ content: initialContent, clients, teamMembers = [] }: ScheduleCalendarProps) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [addContentOpen, setAddContentOpen] = useState(false);
  const [addContentDate, setAddContentDate] = useState<Date | null>(null);

  // Content detail modal state
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [contentDetailOpen, setContentDetailOpen] = useState(false);

  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.name || 'Unknown';
  };

  const handleContentClick = (contentItem: Content) => {
    setSelectedContent(contentItem);
    setContentDetailOpen(true);
  };

  const handleContentUpdate = (updatedContent: Content) => {
    setContent((prev) =>
      prev.map((c) => (c.id === updatedContent.id ? updatedContent : c))
    );
    router.refresh();
  };

  const handleContentDelete = (contentId: string) => {
    setContent((prev) => prev.filter((c) => c.id !== contentId));
    router.refresh();
  };

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDay = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  const contentByDate = useMemo(() => {
    const map: Record<string, Content[]> = {};
    content.forEach((item) => {
      if (item.scheduledDate) {
        const dateKey = item.scheduledDate.split('T')[0];
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(item);
      }
    });
    return map;
  }, [content]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (date: Date, dayContent: Content[]) => {
    setSelectedDate(date);
    if (dayContent.length > 0) {
      setDayDetailOpen(true);
    } else {
      setAddContentDate(date);
      setAddContentOpen(true);
    }
  };

  const handleAddClick = (date: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    setAddContentDate(date);
    setAddContentOpen(true);
  };

  const handleContentCreated = (newContent: Content) => {
    setContent((prev) => [...prev, newContent]);
    router.refresh();
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthYear = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const selectedDateContent = selectedDate
    ? contentByDate[formatDateKey(selectedDate)] || []
    : [];

  return (
    <>
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-white">{monthYear}</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-zinc-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(({ date, isCurrentMonth }, index) => {
              const dateKey = formatDateKey(date);
              const dayContent = contentByDate[dateKey] || [];
              const isToday = date.getTime() === today.getTime();
              const isPast = date < today;

              return (
                <div
                  key={index}
                  onClick={() => handleDayClick(date, dayContent)}
                  className={cn(
                    'min-h-[100px] p-1 border border-zinc-800 rounded-lg cursor-pointer transition-colors group',
                    !isCurrentMonth && 'opacity-40',
                    isToday && 'border-blue-500 bg-blue-500/5',
                    isPast && isCurrentMonth && 'bg-zinc-800/30',
                    isCurrentMonth && 'hover:bg-zinc-800/50'
                  )}
                >
                  <div className="flex items-center justify-between mb-1 px-1">
                    <span
                      className={cn(
                        'text-xs font-medium',
                        isToday ? 'text-blue-500' : isCurrentMonth ? 'text-white' : 'text-zinc-600'
                      )}
                    >
                      {date.getDate()}
                    </span>
                    {isCurrentMonth && !isPast && (
                      <button
                        onClick={(e) => handleAddClick(date, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-zinc-700"
                      >
                        <Plus className="w-3 h-3 text-zinc-400" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 max-h-[80px] overflow-y-auto">
                    {dayContent.slice(0, 3).map((item) => {
                      const Icon = contentTypeIcons[item.contentType];
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            'text-xs p-1 rounded border truncate flex items-center gap-1',
                            contentTypeColors[item.contentType]
                          )}
                          title={`${item.title} - ${getClientName(item.clientId)}`}
                        >
                          <Icon className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{getClientName(item.clientId)}</span>
                        </div>
                      );
                    })}
                    {dayContent.length > 3 && (
                      <div className="text-xs text-zinc-500 text-center">
                        +{dayContent.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-800">
            <span className="text-xs text-zinc-500">Legend:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/30" />
              <span className="text-xs text-zinc-400">Short Form</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30" />
              <span className="text-xs text-zinc-400">YouTube</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-purple-500/20 border border-purple-500/30" />
              <span className="text-xs text-zinc-400">Podcast</span>
            </div>
            <span className="text-xs text-zinc-600 ml-auto">Click day to view/add content</span>
          </div>
        </CardContent>
      </Card>

      <DayDetailDialog
        open={dayDetailOpen}
        onOpenChange={setDayDetailOpen}
        date={selectedDate}
        content={selectedDateContent}
        clients={clients}
        onContentClick={handleContentClick}
      />

      <AddContentDialog
        open={addContentOpen}
        onOpenChange={setAddContentOpen}
        date={addContentDate}
        clients={clients}
        onContentCreated={handleContentCreated}
      />

      <ContentDetailModal
        content={selectedContent}
        open={contentDetailOpen}
        onOpenChange={setContentDetailOpen}
        onUpdate={handleContentUpdate}
        onDelete={handleContentDelete}
        clients={clients}
        teamMembers={teamMembers}
      />
    </>
  );
}
