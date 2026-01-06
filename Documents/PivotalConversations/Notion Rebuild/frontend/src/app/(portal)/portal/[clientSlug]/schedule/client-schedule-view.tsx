'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
    ChevronLeft,
    ChevronRight,
    Video,
    Youtube,
    Mic,
    ExternalLink,
    Calendar,
    Clock,
    CheckCircle2,
    Film,
} from 'lucide-react';
import { Content, ContentType, ScheduleStatus } from '@/types';

// Helper to format date as YYYY-MM-DD in local timezone (avoids UTC conversion issues)
function formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

interface ClientScheduleViewProps {
    content: Content[];
    clientId: string;
}

const contentTypeIcons: Record<ContentType, typeof Video> = {
    'Short Form': Video,
    'YouTube': Youtube,
    'Podcast': Mic,
};

const contentTypeColors: Record<ContentType, string> = {
    'Short Form': 'bg-blue-500/20 border-blue-500/50 text-blue-400',
    'YouTube': 'bg-red-500/20 border-red-500/50 text-red-400',
    'Podcast': 'bg-purple-500/20 border-purple-500/50 text-purple-400',
};

// Map content statuses to schedule statuses (simplified to 4 statuses)
// Filmed = content is in Filmed stage
// In Progress = any stage between Filmed and Scheduled
// Scheduled = content is scheduled
// Live = content is live/posted/complete
function mapToScheduleStatus(contentStatus: string): ScheduleStatus {
    // Live/Posted/Complete statuses
    if (['Live', 'Posted', 'Complete', 'Live: 24 Hour Review', 'Live: 48 Hour Review', 'Live: 5 Day Review'].includes(contentStatus)) {
        return 'Live';
    }
    // Scheduled statuses
    if (['Scheduled', 'To Schedule', 'Schedule'].includes(contentStatus)) {
        return 'Scheduled';
    }
    // Filmed stage only
    if (['Filmed'].includes(contentStatus)) {
        return 'Filmed';
    }
    // Everything else between Filmed and Scheduled is "In Progress"
    if (['In Progress', 'Edit', 'PC Feedback', 'Client Feedback', 'PC Review', 'Client Review',
         'Final Review', 'Thumbnail Design', 'Approved', 'Not Approved', 'To Shoot',
         'Research', 'Brief', 'Guest Booked'].includes(contentStatus)) {
        return 'In Progress';
    }
    return 'Nil';
}

const statusColors: Record<ScheduleStatus, string> = {
    'Nil': 'bg-zinc-800 text-zinc-500 border-zinc-700',
    'In Progress': 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
    'Filmed': 'bg-cyan-900/50 text-cyan-400 border-cyan-700',
    'Edited': 'bg-blue-900/50 text-blue-400 border-blue-700',
    'Scheduled': 'bg-orange-900/50 text-orange-400 border-orange-700',
    'Live': 'bg-green-800 text-green-300 border-green-600',
};

const statusLabels: Record<ScheduleStatus, string> = {
    'Nil': 'Not Started',
    'In Progress': 'In Progress',
    'Filmed': 'Filmed',
    'Edited': 'Being Edited',
    'Scheduled': 'Ready to Post',
    'Live': 'Posted',
};

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

// Content Detail Modal
interface ContentDetailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    content: Content | null;
}

function ContentDetailModal({ open, onOpenChange, content }: ContentDetailModalProps) {
    if (!content) return null;

    const Icon = contentTypeIcons[content.contentType];
    const status = mapToScheduleStatus(content.status);
    const scheduledDate = content.scheduledDate
        ? new Date(content.scheduledDate).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        })
        : 'Not scheduled';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Icon className={cn(
                            'w-5 h-5',
                            content.contentType === 'Short Form' ? 'text-blue-400' :
                            content.contentType === 'YouTube' ? 'text-red-400' : 'text-purple-400'
                        )} />
                        Content Details
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Title */}
                    <div>
                        <label className="text-xs text-zinc-500 uppercase tracking-wide">Title</label>
                        <p className="text-white font-medium mt-1">{content.title}</p>
                    </div>

                    {/* Content Type */}
                    <div>
                        <label className="text-xs text-zinc-500 uppercase tracking-wide">Type</label>
                        <div className="mt-1">
                            <Badge variant="outline" className={contentTypeColors[content.contentType]}>
                                {content.contentType}
                            </Badge>
                        </div>
                    </div>

                    {/* Scheduled Date */}
                    <div>
                        <label className="text-xs text-zinc-500 uppercase tracking-wide">Scheduled For</label>
                        <p className="text-white mt-1 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-zinc-400" />
                            {scheduledDate}
                        </p>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="text-xs text-zinc-500 uppercase tracking-wide">Production Status</label>
                        <div className="mt-2">
                            <Badge className={cn('border', statusColors[status])}>
                                {statusLabels[status]}
                            </Badge>
                        </div>
                    </div>

                    {/* Progress Indicator */}
                    <div>
                        <label className="text-xs text-zinc-500 uppercase tracking-wide">Progress</label>
                        <div className="flex items-center gap-2 mt-2">
                            {(['Filmed', 'In Progress', 'Scheduled', 'Live'] as ScheduleStatus[]).map((s, i) => {
                                const currentIndex = ['Filmed', 'In Progress', 'Scheduled', 'Live'].indexOf(status);
                                const isComplete = i <= currentIndex;
                                return (
                                    <div key={s} className="flex items-center">
                                        <div className={cn(
                                            'w-6 h-6 rounded-full flex items-center justify-center text-xs',
                                            isComplete
                                                ? 'bg-green-500 text-white'
                                                : 'bg-zinc-700 text-zinc-400'
                                        )}>
                                            {isComplete ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                                        </div>
                                        {i < 3 && (
                                            <div className={cn(
                                                'w-8 h-0.5',
                                                i < currentIndex ? 'bg-green-500' : 'bg-zinc-700'
                                            )} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[10px] text-zinc-500">
                            <span>Filmed</span>
                            <span>In Progress</span>
                            <span>Scheduled</span>
                            <span>Live</span>
                        </div>
                    </div>

                    {/* Links */}
                    {content.driveLink && (
                        <div>
                            <label className="text-xs text-zinc-500 uppercase tracking-wide">Content Link</label>
                            <a
                                href={content.driveLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mt-1"
                            >
                                <ExternalLink className="w-4 h-4" />
                                <span>View Content</span>
                            </a>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function ClientScheduleView({ content }: ClientScheduleViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedContent, setSelectedContent] = useState<Content | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);

    const weeks = useMemo(() => {
        return getWeeksInMonth(currentDate.getFullYear(), currentDate.getMonth());
    }, [currentDate]);

    // Map content by date
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

    const handleContentClick = (item: Content) => {
        setSelectedContent(item);
        setDetailModalOpen(true);
    };

    const monthYear = currentDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <>
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-4">
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
                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {/* Day Headers */}
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                            <div
                                key={day}
                                className="text-center text-sm font-medium text-zinc-400 py-2"
                            >
                                {day}
                            </div>
                        ))}

                        {/* Calendar Days */}
                        {weeks.flat().map((date, index) => {
                            const dateKey = formatDateKey(date);
                            const dayContent = contentByDate[dateKey] || [];
                            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                            const isToday = date.getTime() === today.getTime();

                            return (
                                <div
                                    key={index}
                                    className={cn(
                                        'min-h-[100px] p-2 rounded-lg border transition-all',
                                        isCurrentMonth
                                            ? 'bg-zinc-800/50 border-zinc-700'
                                            : 'bg-zinc-900/50 border-zinc-800 opacity-50',
                                        isToday && 'ring-2 ring-blue-500'
                                    )}
                                >
                                    <div className={cn(
                                        'text-sm font-medium mb-1',
                                        isToday ? 'text-blue-400' : 'text-zinc-400'
                                    )}>
                                        {date.getDate()}
                                    </div>

                                    <div className="space-y-1">
                                        {dayContent.slice(0, 3).map((item) => {
                                            const Icon = contentTypeIcons[item.contentType];
                                            const status = mapToScheduleStatus(item.status);
                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => handleContentClick(item)}
                                                    className={cn(
                                                        'p-1.5 rounded text-xs cursor-pointer transition-all hover:brightness-110',
                                                        statusColors[status]
                                                    )}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        <Icon className="w-3 h-3 flex-shrink-0" />
                                                        <span className="truncate">{item.title}</span>
                                                    </div>
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
                    <div className="flex items-center gap-4 mt-6 pt-4 border-t border-zinc-800 flex-wrap">
                        <span className="text-xs text-zinc-500">Status:</span>
                        {(['Filmed', 'In Progress', 'Scheduled', 'Live'] as ScheduleStatus[]).map((status) => (
                            <div key={status} className="flex items-center gap-1">
                                <div className={cn('w-3 h-3 rounded', statusColors[status])} />
                                <span className="text-xs text-zinc-400">{statusLabels[status]}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Upcoming Content List */}
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Upcoming Content
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {content.filter((c) => {
                        if (!c.scheduledDate) return false;
                        const schedDate = new Date(c.scheduledDate);
                        return schedDate >= today;
                    }).length === 0 ? (
                        <p className="text-zinc-500 text-center py-8">
                            No upcoming content scheduled.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {content
                                .filter((c) => {
                                    if (!c.scheduledDate) return false;
                                    const schedDate = new Date(c.scheduledDate);
                                    return schedDate >= today;
                                })
                                .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())
                                .slice(0, 10)
                                .map((item) => {
                                    const Icon = contentTypeIcons[item.contentType];
                                    const status = mapToScheduleStatus(item.status);
                                    const schedDate = new Date(item.scheduledDate!);
                                    const isThisWeek = schedDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => handleContentClick(item)}
                                            className={cn(
                                                'p-3 rounded-lg border cursor-pointer transition-all hover:brightness-110',
                                                contentTypeColors[item.contentType]
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded bg-black/20">
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-white truncate">
                                                        {item.title}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs text-zinc-400">
                                                            {schedDate.toLocaleDateString('en-US', {
                                                                weekday: 'short',
                                                                month: 'short',
                                                                day: 'numeric',
                                                            })}
                                                        </span>
                                                        {isThisWeek && (
                                                            <Badge className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                                                This Week
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <Badge className={cn('border', statusColors[status])}>
                                                    {statusLabels[status]}
                                                </Badge>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <ContentDetailModal
                open={detailModalOpen}
                onOpenChange={setDetailModalOpen}
                content={selectedContent}
            />
        </>
    );
}
