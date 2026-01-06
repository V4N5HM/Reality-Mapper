'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Video, Youtube, Mic, ExternalLink, GripVertical, Loader2, LayoutGrid, Trash2, Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Content, Client, ContentType, ScheduleStatus } from '@/types';
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

interface ScheduleGridProps {
  content: Content[];
  clients: Client[];
  teamMembers?: TeamMember[];
}

type ContentTypeFilter = ContentType | 'All';

// Schedule status options - simplified to 4 main statuses
const SCHEDULE_STATUSES: ScheduleStatus[] = ['Filmed', 'In Progress', 'Scheduled', 'Live'];

const statusColors: Record<ScheduleStatus, string> = {
  'Nil': 'bg-zinc-800 text-zinc-500 border-zinc-700',
  'In Progress': 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
  'Filmed': 'bg-cyan-900/50 text-cyan-400 border-cyan-700',
  'Edited': 'bg-blue-900/50 text-blue-400 border-blue-700',
  'Scheduled': 'bg-orange-900/50 text-orange-400 border-orange-700',
  'Live': 'bg-green-800 text-green-300 border-green-600',
};

const contentTypeColors: Record<ContentType, string> = {
  'Short Form': 'bg-blue-500/20 border-blue-500/50 text-blue-400',
  'YouTube': 'bg-red-500/20 border-red-500/50 text-red-400',
  'Podcast': 'bg-purple-500/20 border-purple-500/50 text-purple-400',
};

const contentTypeIcons: Record<ContentType, typeof Video> = {
  'Short Form': Video,
  'YouTube': Youtube,
  'Podcast': Mic,
};

// Platform abbreviations for compact cell display
const platformAbbreviations: Record<ContentType, string> = {
  'Short Form': 'SF',
  'YouTube': 'YT',
  'Podcast': 'POD',
};

// Platform text colors
const platformTextColors: Record<ContentType, string> = {
  'Short Form': 'text-blue-400',
  'YouTube': 'text-red-400',
  'Podcast': 'text-purple-400',
};

// Status abbreviations for compact cell display
const statusAbbreviations: Record<ScheduleStatus, string> = {
  'Nil': '—',
  'In Progress': 'WIP',
  'Filmed': 'Film',
  'Edited': 'Edit',
  'Scheduled': 'Sched',
  'Live': 'Live',
};

// Status text colors for cell display
const statusTextColors: Record<ScheduleStatus, string> = {
  'Nil': 'text-zinc-500',
  'In Progress': 'text-yellow-400',
  'Filmed': 'text-cyan-400',
  'Edited': 'text-blue-400',
  'Scheduled': 'text-orange-400',
  'Live': 'text-green-400',
};

// Short Form pipeline stages that map to "In Progress" in schedule view
// (everything between In Progress and Not Approved, inclusive)
const shortFormInProgressStages = ['In Progress', 'PC Feedback', 'Client Feedback', 'Approved', 'To Schedule', 'Not Approved'];

// YouTube/Podcast pipeline stages that map to "In Progress" in schedule view
// (everything between Edit and To Schedule, inclusive)
const ytPodcastInProgressStages = ['Edit', 'Thumbnail Design', 'PC Review', 'Client Review', 'Approved', 'To Schedule'];

// YouTube/Podcast pipeline stages that map to "Live" in schedule view
// (Live and everything after)
const ytPodcastLiveStages = ['Live', 'Live: 24 Hour Review', 'Live: 48 Hour Review', 'Live: 5 Day Review', 'Complete'];

// Map content statuses to schedule statuses (simplified to 4 statuses)
// The mapping depends on content type:
//
// Short Form:
//   Filmed = Filmed
//   In Progress = In Progress through Not Approved (inclusive)
//   Posted with future date = Scheduled
//   Posted with past/no date = Live
//
// YouTube/Podcast:
//   Filmed = Filmed
//   In Progress = Edit through To Schedule (inclusive)
//   Scheduled = Scheduled
//   Live = Live and after
function mapToScheduleStatus(contentStatus: string, contentType: ContentType, scheduledDate?: string | null): ScheduleStatus {
  // Filmed stage - same for all content types
  if (contentStatus === 'Filmed') {
    return 'Filmed';
  }

  if (contentType === 'Short Form') {
    // Short Form: In Progress through Not Approved = "In Progress"
    if (shortFormInProgressStages.includes(contentStatus)) {
      return 'In Progress';
    }
    // Short Form: Posted = "Scheduled" if date is in future, "Live" if date has passed
    if (contentStatus === 'Posted') {
      if (scheduledDate && typeof scheduledDate === 'string' && scheduledDate.trim()) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const schedDate = new Date(scheduledDate);
        // Only compare if we have a valid date
        if (!isNaN(schedDate.getTime())) {
          schedDate.setHours(0, 0, 0, 0);
          // If scheduled date is in the future or today, show as "Scheduled"
          if (schedDate >= today) {
            return 'Scheduled';
          }
        }
      }
      // Date has passed or no date - show as "Live"
      return 'Live';
    }
  } else {
    // YouTube/Podcast: Edit through To Schedule = "In Progress"
    if (ytPodcastInProgressStages.includes(contentStatus)) {
      return 'In Progress';
    }
    // YouTube/Podcast: Scheduled = "Scheduled"
    if (contentStatus === 'Scheduled') {
      return 'Scheduled';
    }
    // YouTube/Podcast: Live and after = "Live"
    if (ytPodcastLiveStages.includes(contentStatus)) {
      return 'Live';
    }
  }

  // Fallback for unmapped statuses
  return 'In Progress';
}

// Get all weeks in a month
function getWeeksInMonth(year: number, month: number): Date[][] {
  const weeks: Date[][] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let currentDate = new Date(firstDay);
  const dayOfWeek = currentDate.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  currentDate.setDate(currentDate.getDate() + diff);

  while (currentDate <= lastDay || weeks.length < 5) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeks.push(week);
    if (currentDate > lastDay && weeks.length >= 4) break;
  }

  return weeks;
}


// Day Detail Modal - shows all content for a day with scheduling options (Admin/Team view)
interface DayDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  content: Content[];
  allContent: Content[]; // All content to allow scheduling unscheduled items
  onContentClick: (content: Content) => void;
  onScheduleContent: (contentId: string, date: string) => Promise<void>;
  onStatusChange: (contentId: string, newStatus: ScheduleStatus) => Promise<void>;
  onDeleteContent: (contentId: string) => Promise<void>;
}

function DayDetailModal({
  open,
  onOpenChange,
  date,
  content,
  allContent,
  onContentClick,
  onScheduleContent,
  onStatusChange,
  onDeleteContent,
}: DayDetailModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'scheduled' | 'schedule'>('scheduled');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Get unscheduled content that could be scheduled to this date (handle null/undefined safely)
  const unscheduledContent = useMemo(() => {
    if (!allContent) return [];
    return allContent.filter(c => !c.scheduledDate);
  }, [allContent]);

  if (!date) return null;

  const dateString = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const dateKey = formatDateKey(date);

  const handleSchedule = async (contentId: string) => {
    setIsSubmitting(true);
    try {
      await onScheduleContent(contentId, dateKey);
      toast.success('Content scheduled');
      router.refresh();
    } catch (error) {
      toast.error('Failed to schedule content');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (contentId: string, status: ScheduleStatus) => {
    setIsSubmitting(true);
    try {
      await onStatusChange(contentId, status);
      toast.success(`Status updated to ${status}`);
      router.refresh();
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    setIsSubmitting(true);
    try {
      await onDeleteContent(deleteConfirmId);
      toast.success('Content deleted');
      router.refresh();
      setDeleteConfirmId(null);
    } catch (error) {
      toast.error('Failed to delete content');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">{dateString}</DialogTitle>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex gap-1 border-b border-zinc-800 pb-2">
          <button
            onClick={() => setActiveTab('scheduled')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-t transition-colors',
              activeTab === 'scheduled'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            Scheduled ({content.length})
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-t transition-colors',
              activeTab === 'schedule'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            Schedule Content
          </button>
        </div>

        <ScrollArea className="max-h-[400px]">
          {/* Tab: Scheduled Content */}
          {activeTab === 'scheduled' && (
            <div className="space-y-3 py-2">
              {content.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-4">No content scheduled for this day</p>
              ) : (
                content.map((item) => {
                  const Icon = contentTypeIcons[item.contentType];
                  const status = mapToScheduleStatus(item.status, item.contentType, item.scheduledDate);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'p-3 rounded-lg border',
                        contentTypeColors[item.contentType]
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="w-4 h-4 mt-1" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <button
                              onClick={() => onContentClick(item)}
                              className="text-sm font-medium text-white text-left hover:text-blue-400 transition-colors cursor-pointer"
                            >
                              {item.title}
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(item.id)}
                              className="text-zinc-500 hover:text-red-400 transition-colors p-1 -mt-1 -mr-1"
                              title="Delete content"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5">Click title to view full details</p>
                          {item.driveLink && (
                            <a
                              href={item.driveLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Dropbox/Drive Link
                            </a>
                          )}

                          {/* Status Buttons */}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {SCHEDULE_STATUSES.filter(s => s !== 'Nil').map((s) => (
                              <button
                                key={s}
                                onClick={() => handleStatusUpdate(item.id, s)}
                                disabled={isSubmitting}
                                className={cn(
                                  'px-2 py-0.5 text-xs rounded border transition-all',
                                  statusColors[s],
                                  status === s && 'ring-1 ring-white/50',
                                  isSubmitting && 'opacity-50 cursor-wait'
                                )}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab: Schedule Unscheduled Content */}
          {activeTab === 'schedule' && (
            <div className="space-y-2 py-2">
              {unscheduledContent.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-4">No unscheduled content available</p>
              ) : (
                <>
                  <p className="text-xs text-zinc-500 mb-2">Click to schedule content to {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  {unscheduledContent.map((item) => {
                    const Icon = contentTypeIcons[item.contentType];
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSchedule(item.id)}
                        className={cn(
                          'p-3 rounded-lg border cursor-pointer transition-all hover:brightness-110',
                          contentTypeColors[item.contentType],
                          isSubmitting && 'opacity-50 cursor-wait'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{item.title}</p>
                            <p className="text-xs text-zinc-400">{item.clientName || 'Unknown Client'}</p>
                          </div>
                          <Button size="sm" variant="outline" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Schedule'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open: boolean) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Content</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete this content? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isSubmitting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

// Add Content Modal - for manually adding new content to the calendar
interface AddContentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  clients: Client[];
  onAddContent: (content: {
    title: string;
    clientId: string;
    contentType: ContentType;
    scheduledDate: string;
  }) => Promise<void>;
}

function AddContentModal({
  open,
  onOpenChange,
  date,
  clients,
  onAddContent,
  existingContent,
}: AddContentModalProps & { existingContent?: Content[] }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [contentType, setContentType] = useState<ContentType>('Short Form');
  const [selectedDate, setSelectedDate] = useState<Date | null>(date);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Find the next available date for the selected client (date with no content for that client)
  const findNextAvailableDate = (forClientId: string, forContentType: ContentType): Date => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start from today and find first date without content for this client+type combo
    const checkDate = new Date(today);
    for (let i = 0; i < 60; i++) { // Check next 60 days
      const dateKey = formatDateKey(checkDate);
      const hasContentForClientAndType = existingContent?.some(c =>
        c.scheduledDate?.split('T')[0] === dateKey &&
        c.clientId === forClientId &&
        c.contentType === forContentType
      );

      if (!hasContentForClientAndType) {
        return new Date(checkDate);
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }
    return today; // Fallback to today if no gaps found
  };

  // Reset form when modal opens and auto-find next available date when client/type changes
  useEffect(() => {
    if (open) {
      setTitle('');
      setClientId('');
      setContentType('Short Form');
      setSelectedDate(date);
    }
  }, [open, date]);

  // Auto-update date when client or content type changes
  useEffect(() => {
    if (clientId && existingContent) {
      const nextDate = findNextAvailableDate(clientId, contentType);
      setSelectedDate(nextDate);
    }
  }, [clientId, contentType, existingContent]);

  if (!selectedDate) return null;

  const dateString = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const dateKey = formatDateKey(selectedDate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddContent({
        title: title.trim(),
        clientId,
        contentType,
        scheduledDate: dateKey,
      });
      toast.success('Content added to calendar');
      router.refresh();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to add content');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-400" />
            Add Content for {dateString}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-zinc-400">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter content title..."
              className="bg-zinc-800 border-zinc-700 text-white"
              disabled={isSubmitting}
            />
          </div>

          {/* Client */}
          <div className="space-y-2">
            <Label htmlFor="client" className="text-zinc-400">Client *</Label>
            <Select value={clientId} onValueChange={setClientId} disabled={isSubmitting}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Select a client..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content Type */}
          <div className="space-y-2">
            <Label className="text-zinc-400">Content Type *</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['Short Form', 'YouTube', 'Podcast'] as ContentType[]).map((type) => {
                const Icon = contentTypeIcons[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setContentType(type)}
                    disabled={isSubmitting}
                    className={cn(
                      'px-3 py-2 rounded border text-sm font-medium transition-all flex items-center justify-center gap-1',
                      contentTypeColors[type],
                      contentType === type && 'ring-2 ring-white/50',
                      isSubmitting && 'opacity-50 cursor-wait',
                      'hover:brightness-110'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {type === 'Short Form' ? 'SF' : type === 'YouTube' ? 'YT' : 'Pod'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scheduled Date */}
          <div className="space-y-2">
            <Label htmlFor="scheduledDate" className="text-zinc-400">
              Scheduled Date {clientId && <span className="text-green-400 text-xs">(auto-selected next available)</span>}
            </Label>
            <Input
              id="scheduledDate"
              type="date"
              value={dateKey}
              onChange={(e) => setSelectedDate(new Date(e.target.value + 'T00:00:00'))}
              className="bg-zinc-800 border-zinc-700 text-white"
              disabled={isSubmitting}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim() || !clientId}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Content
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ScheduleCellProps {
  date: Date;
  content: Content[];
  isCurrentMonth: boolean;
  onCellClick: (date: Date, content: Content[]) => void;
  onDragStart: (e: React.DragEvent, content: Content) => void;
  onDragOver: (e: React.DragEvent, date: Date) => void;
  onDrop: (e: React.DragEvent, date: Date) => void;
  onDragEnd: () => void;
  isDragTarget: boolean;
}

function ScheduleCell({
  date,
  content,
  isCurrentMonth,
  onCellClick,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragTarget
}: ScheduleCellProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = date.getTime() === today.getTime();

  // Get primary status (most common or first)
  const primaryStatus = content.length > 0 ? mapToScheduleStatus(content[0].status, content[0].contentType, content[0].scheduledDate) : 'Nil';

  return (
    <div
      onClick={() => onCellClick(date, content)}
      onDragOver={(e) => onDragOver(e, date)}
      onDrop={(e) => onDrop(e, date)}
      onDragLeave={() => onDragEnd()}
      className={cn(
        'w-full h-[80px] p-1 rounded border text-sm transition-all cursor-pointer overflow-hidden',
        content.length === 0 ? 'bg-zinc-800/50 border-zinc-700' : statusColors[primaryStatus],
        !isCurrentMonth && 'opacity-40',
        isToday && 'ring-2 ring-blue-500',
        isDragTarget && 'ring-2 ring-green-500 bg-green-900/20',
        'hover:brightness-110'
      )}
    >
      {content.length > 0 && (
        <div className="space-y-1 h-full overflow-hidden">
          {content.slice(0, 2).map((item) => {
            const Icon = contentTypeIcons[item.contentType];
            const itemStatus = mapToScheduleStatus(item.status, item.contentType, item.scheduledDate);
            const platformAbbr = platformAbbreviations[item.contentType];
            const statusAbbr = statusAbbreviations[itemStatus];
            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  onDragStart(e, item);
                }}
                onDragEnd={onDragEnd}
                className="cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center gap-1 text-xs">
                  <Icon className="w-3 h-3 flex-shrink-0" />
                  <span className={cn('font-medium', platformTextColors[item.contentType])}>
                    {platformAbbr}
                  </span>
                  <span className="text-zinc-500">•</span>
                  <span className={cn('font-medium', statusTextColors[itemStatus])}>
                    {statusAbbr}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-300 truncate leading-tight mt-0.5">
                  {item.title}
                </p>
              </div>
            );
          })}
          {content.length > 2 && (
            <div className="text-xs text-zinc-400">+{content.length - 2} more</div>
          )}
        </div>
      )}
    </div>
  );
}

export function ScheduleGrid({ content: initialContent, clients, teamMembers = [] }: ScheduleGridProps) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedClientName, setSelectedClientName] = useState<string>('all');
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>('All');
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [dayContent, setDayContent] = useState<Content[]>([]);
  const [draggedContent, setDraggedContent] = useState<Content | null>(null);
  const [dragTargetDate, setDragTargetDate] = useState<string | null>(null);
  const [addContentModalOpen, setAddContentModalOpen] = useState(false);

  // Sync state with props when initialContent changes (e.g., after page refresh)
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  // Use the clients prop for the dropdown (all Active clients from Notion)
  const clientOptions = useMemo(() => {
    return clients.map((c) => c.name).sort();
  }, [clients]);

  // Auto-update Scheduled to Live when date passes
  useEffect(() => {
    const checkAndUpdateStatuses = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const scheduledPastContent = content.filter(c => {
        if (!c.scheduledDate) return false;
        const schedDate = new Date(c.scheduledDate);
        schedDate.setHours(0, 0, 0, 0);
        const isPast = schedDate < today;
        const isScheduled = mapToScheduleStatus(c.status, c.contentType, c.scheduledDate) === 'Scheduled';
        return isPast && isScheduled;
      });

      for (const item of scheduledPastContent) {
        try {
          const newStatus = item.contentType === 'Short Form' ? 'Posted' : 'Live';
          await fetch(`/api/content/${item.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
          });

          setContent(prev => prev.map(c =>
            c.id === item.id ? { ...c, status: newStatus as any } : c
          ));
        } catch (error) {
          console.error('Failed to auto-update status:', error);
        }
      }
    };

    checkAndUpdateStatuses();
  }, []);

  const weeks = useMemo(() => {
    return getWeeksInMonth(currentDate.getFullYear(), currentDate.getMonth());
  }, [currentDate]);

  // Filter content by client name and type
  const filteredContent = useMemo(() => {
    return content.filter(c => {
      if (!c.scheduledDate) return false;
      if (selectedClientName !== 'all' && c.clientName !== selectedClientName) return false;
      if (contentTypeFilter !== 'All' && c.contentType !== contentTypeFilter) return false;
      return true;
    });
  }, [content, selectedClientName, contentTypeFilter]);

  // Map content by date (array of content per date)
  const contentByDate = useMemo(() => {
    const map: Record<string, Content[]> = {};
    filteredContent.forEach(item => {
      if (item.scheduledDate) {
        const dateKey = item.scheduledDate.split('T')[0];
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(item);
      }
    });
    return map;
  }, [filteredContent]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleCellClick = (date: Date, cellContent: Content[]) => {
    setSelectedDate(date);
    if (cellContent.length === 0) {
      // Empty cell - open day modal to allow scheduling
      setDayContent([]);
      setDayModalOpen(true);
    } else if (cellContent.length === 1) {
      // Single content - open detail modal directly
      setSelectedContent(cellContent[0]);
      setDetailModalOpen(true);
    } else {
      // Multiple content - open day modal to pick one
      setDayContent(cellContent);
      setDayModalOpen(true);
    }
  };

  const handleContentClick = (contentItem: Content) => {
    setSelectedContent(contentItem);
    setDayModalOpen(false);
    setDetailModalOpen(true);
  };

  const handleStatusChange = async (contentId: string, newStatus: ScheduleStatus) => {
    const contentItem = content.find(c => c.id === contentId);
    if (!contentItem) return;

    // Map simplified schedule statuses to pipeline statuses based on content type
    // Short Form:
    //   Filmed -> Filmed
    //   In Progress -> In Progress (first stage in the in-progress range)
    //   Scheduled -> Posted (Short Form uses Posted as scheduled state)
    //   Live -> Posted (same as scheduled for Short Form)
    // YouTube/Podcast:
    //   Filmed -> Filmed
    //   In Progress -> Edit (first stage in the in-progress range)
    //   Scheduled -> Scheduled
    //   Live -> Live
    const contentStatusMap: Record<ScheduleStatus, string> = {
      'Nil': 'Nil',
      'Filmed': 'Filmed',
      'In Progress': contentItem.contentType === 'Short Form' ? 'In Progress' : 'Edit',
      'Edited': contentItem.contentType === 'Short Form' ? 'PC Feedback' : 'PC Review',
      'Scheduled': contentItem.contentType === 'Short Form' ? 'Posted' : 'Scheduled',
      'Live': contentItem.contentType === 'Short Form' ? 'Posted' : 'Live',
    };

    const newContentStatus = contentStatusMap[newStatus];
    console.log(`[Schedule] Updating content ${contentId} status from schedule: ${newStatus} -> ${newContentStatus}`);

    const response = await fetch(`/api/content/${contentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newContentStatus }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Schedule] Status update failed:', errorData);
      throw new Error(errorData.error || 'Failed to update');
    }

    setContent(prev => prev.map(c =>
      c.id === contentId ? { ...c, status: newContentStatus as any } : c
    ));

    if (selectedContent?.id === contentId) {
      setSelectedContent(prev => prev ? { ...prev, status: newContentStatus as any } : null);
    }
  };

  const handleDateChange = async (contentId: string, newDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(newDate);
    const isPastDate = targetDate < today;

    // Find the content to check its current status
    const contentItem = content.find(c => c.id === contentId);
    const isScheduledStatus = contentItem && ['Scheduled', 'To Schedule', 'Approved'].includes(contentItem.status);

    // If moving scheduled content to a past date, also update status to Live/Posted
    const updatePayload: { scheduledDate: string; status?: string } = { scheduledDate: newDate };
    if (isPastDate && isScheduledStatus) {
      // Use "Posted" for Short Form, "Live" for YouTube/Podcast
      updatePayload.status = contentItem.contentType === 'Short Form' ? 'Posted' : 'Live';
    }

    const response = await fetch(`/api/content/${contentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload),
    });

    if (!response.ok) throw new Error('Failed to update');

    setContent(prev => prev.map(c =>
      c.id === contentId ? {
        ...c,
        scheduledDate: newDate,
        ...(updatePayload.status ? { status: updatePayload.status as any } : {})
      } : c
    ));

    if (selectedContent?.id === contentId) {
      setSelectedContent(prev => prev ? {
        ...prev,
        scheduledDate: newDate,
        ...(updatePayload.status ? { status: updatePayload.status as any } : {})
      } : null);
    }
  };

  const handleDragStart = (e: React.DragEvent, dragContent: Content) => {
    e.dataTransfer.setData('text/plain', dragContent.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedContent(dragContent);
  };

  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const dateKey = formatDateKey(date);
    setDragTargetDate(dateKey);
  };

  const handleDragEnd = () => {
    setDraggedContent(null);
    setDragTargetDate(null);
  };

  const handleDrop = async (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    setDragTargetDate(null);

    const contentId = e.dataTransfer.getData('text/plain');
    const dragContent = contentId ? content.find(c => c.id === contentId) : draggedContent;

    if (!dragContent) return;

    const newDateStr = formatDateKey(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPastDate = date < today;
    const isScheduledStatus = ['Scheduled', 'To Schedule', 'Approved'].includes(dragContent.status);

    try {
      await handleDateChange(dragContent.id, newDateStr);
      if (isPastDate && isScheduledStatus) {
        const newStatus = dragContent.contentType === 'Short Form' ? 'Posted' : 'Live';
        toast.success(`Content moved and status updated to ${newStatus}`);
      } else {
        toast.success('Content moved to new date');
      }
      router.refresh();
    } catch (error) {
      toast.error('Failed to move content');
    }

    setDraggedContent(null);
  };

  // Handler for scheduling content to a specific date
  const handleScheduleContent = async (contentId: string, date: string) => {
    await handleDateChange(contentId, date);
  };

  // Handler for deleting content
  const handleDeleteContent = async (contentId: string) => {
    const response = await fetch(`/api/content/${contentId}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error('Failed to delete');

    setContent(prev => prev.filter(c => c.id !== contentId));
    setDayContent(prev => prev.filter(c => c.id !== contentId));
  };

  // Handler for adding new content manually
  const handleAddContent = async (newContent: {
    title: string;
    clientId: string;
    contentType: ContentType;
    scheduledDate: string;
  }) => {
    const response = await fetch('/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newContent.title,
        clientId: newContent.clientId,
        contentType: newContent.contentType,
        scheduledDate: newContent.scheduledDate,
        status: 'Filmed', // Default status
      }),
    });

    if (!response.ok) throw new Error('Failed to create content');

    const createdPage = await response.json();

    // Find the client name for display
    const client = clients.find(c => c.id === newContent.clientId);

    // Add to local state
    const now = new Date().toISOString();
    const newContentItem: Content = {
      id: createdPage.id,
      title: newContent.title,
      clientId: newContent.clientId,
      clientName: client?.name || 'Unknown Client',
      contentType: newContent.contentType,
      status: 'Filmed',
      scheduledDate: newContent.scheduledDate,
      createdAt: now,
      updatedAt: now,
    };

    setContent(prev => [...prev, newContentItem]);
  };

  // Open add content modal for a specific date
  const openAddContentModal = (date: Date) => {
    setSelectedDate(date);
    setAddContentModalOpen(true);
  };

  const monthYear = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const formatDayHeader = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            {/* Top row: Month navigation */}
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white">{monthYear}</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openAddContentModal(new Date())}
                  className="bg-green-600/20 border-green-600 text-green-400 hover:bg-green-600/30"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New Entry
                </Button>
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

            {/* Second row: Filters */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Client Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400">Client:</span>
                <Select value={selectedClientName} onValueChange={setSelectedClientName}>
                  <SelectTrigger className="w-48 bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Select client..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="all">All Clients</SelectItem>
                    {clientOptions.map(name => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Content Type Tabs with All option */}
              <Tabs value={contentTypeFilter} onValueChange={(v) => setContentTypeFilter(v as ContentTypeFilter)}>
                <TabsList className="bg-zinc-800 border border-zinc-700">
                  <TabsTrigger value="All" className="gap-1 data-[state=active]:bg-zinc-600">
                    <LayoutGrid className="w-3 h-3" />
                    All
                  </TabsTrigger>
                  <TabsTrigger value="Short Form" className="gap-1 data-[state=active]:bg-blue-600">
                    <Video className="w-3 h-3" />
                    Short Form
                  </TabsTrigger>
                  <TabsTrigger value="YouTube" className="gap-1 data-[state=active]:bg-red-600">
                    <Youtube className="w-3 h-3" />
                    YouTube
                  </TabsTrigger>
                  <TabsTrigger value="Podcast" className="gap-1 data-[state=active]:bg-purple-600">
                    <Mic className="w-3 h-3" />
                    Podcast
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Schedule Grid Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th className="text-left text-sm font-medium text-zinc-400 p-2 w-20 border-b border-zinc-800">
                    Week
                  </th>
                  <th className="text-center text-sm font-medium text-zinc-400 p-2 border-b border-zinc-800">MON</th>
                  <th className="text-center text-sm font-medium text-zinc-400 p-2 border-b border-zinc-800">TUE</th>
                  <th className="text-center text-sm font-medium text-zinc-400 p-2 border-b border-zinc-800">WED</th>
                  <th className="text-center text-sm font-medium text-zinc-400 p-2 border-b border-zinc-800">THU</th>
                  <th className="text-center text-sm font-medium text-zinc-400 p-2 border-b border-zinc-800">FRI</th>
                  <th className="text-center text-sm font-medium text-zinc-400 p-2 border-b border-zinc-800">SAT</th>
                  <th className="text-center text-sm font-medium text-zinc-400 p-2 border-b border-zinc-800">SUN</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, weekIndex) => {
                  const weekStart = week[0];

                  return (
                    <tr key={weekIndex} style={{ height: '100px' }}>
                      <td className="p-2 border-b border-zinc-800 align-top overflow-hidden" style={{ height: '100px', maxHeight: '100px' }}>
                        <div className="text-sm font-medium text-white">W{weekIndex + 1}</div>
                        <div className="text-xs text-zinc-500">
                          {formatDayHeader(weekStart)}
                        </div>
                      </td>

                      {week.map((date, dayIndex) => {
                        const dateKey = formatDateKey(date);
                        const dayContentList = contentByDate[dateKey] || [];
                        const isCurrentMonth = date.getMonth() === currentDate.getMonth();

                        return (
                          <td key={dayIndex} className="p-1 border-b border-zinc-800 h-[100px] align-top overflow-hidden" style={{ height: '100px', maxHeight: '100px' }}>
                            <div className="text-xs text-zinc-500 mb-1 text-center">
                              {date.getDate()}
                            </div>
                            <ScheduleCell
                              date={date}
                              content={dayContentList}
                              isCurrentMonth={isCurrentMonth}
                              onCellClick={handleCellClick}
                              onDragStart={handleDragStart}
                              onDragOver={handleDragOver}
                              onDrop={handleDrop}
                              onDragEnd={handleDragEnd}
                              isDragTarget={dragTargetDate === dateKey}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-800 flex-wrap">
            <span className="text-xs text-zinc-500">Status:</span>
            {SCHEDULE_STATUSES.filter(s => s !== 'Nil').map(status => (
              <div key={status} className="flex items-center gap-1">
                <div className={cn('w-3 h-3 rounded', statusColors[status])} />
                <span className="text-xs text-zinc-400">{status}</span>
              </div>
            ))}
            <span className="text-xs text-zinc-600 ml-auto">Click cell to edit • Drag to move</span>
          </div>
        </CardContent>
      </Card>

      <DayDetailModal
        open={dayModalOpen}
        onOpenChange={setDayModalOpen}
        date={selectedDate}
        content={dayContent}
        allContent={content}
        onContentClick={handleContentClick}
        onScheduleContent={handleScheduleContent}
        onStatusChange={handleStatusChange}
        onDeleteContent={handleDeleteContent}
      />

      <ContentDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        content={selectedContent}
        clients={clients}
        teamMembers={teamMembers}
        simplifiedStatuses={true}
        onUpdate={(updatedContent) => {
          // Update local state when content is updated
          setContent(prev => prev.map(c =>
            c.id === updatedContent.id ? updatedContent : c
          ));
          // Also update dayContent if it contains this item
          setDayContent(prev => prev.map(c =>
            c.id === updatedContent.id ? updatedContent : c
          ));
          setSelectedContent(updatedContent);
        }}
        onDelete={(contentId) => {
          // Remove from local state when deleted
          setContent(prev => prev.filter(c => c.id !== contentId));
          setDayContent(prev => prev.filter(c => c.id !== contentId));
          setDetailModalOpen(false);
        }}
      />

      <AddContentModal
        open={addContentModalOpen}
        onOpenChange={setAddContentModalOpen}
        date={selectedDate}
        clients={clients}
        onAddContent={handleAddContent}
        existingContent={content}
      />
    </>
  );
}
