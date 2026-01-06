'use client';

import { Task } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Clock, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { syncTaskToHubstaff } from '@/lib/notion/tasks';

interface HubstaffSyncBadgeProps {
    task: Task;
    onSyncComplete?: () => void;
    showTimeTracked?: boolean;
}

export function HubstaffSyncBadge({
    task,
    onSyncComplete,
    showTimeTracked = true
}: HubstaffSyncBadgeProps) {
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);

    const handleSync = async () => {
        setIsSyncing(true);
        setSyncError(null);

        const result = await syncTaskToHubstaff(task.id);

        setIsSyncing(false);

        if (result.success) {
            onSyncComplete?.();
        } else {
            setSyncError(result.error || 'Failed to sync');
        }
    };

    const getSyncStatusInfo = () => {
        if (isSyncing) {
            return {
                variant: 'secondary' as const,
                icon: <Loader2 className="h-3 w-3 animate-spin" />,
                text: 'Syncing...',
                description: 'Syncing with Hubstaff',
            };
        }

        switch (task.syncStatus) {
            case 'Synced':
                return {
                    variant: 'default' as const,
                    icon: <CheckCircle2 className="h-3 w-3" />,
                    text: 'Synced',
                    description: task.lastSynced
                        ? `Last synced: ${new Date(task.lastSynced).toLocaleString()}`
                        : 'Synced with Hubstaff',
                };
            case 'Failed':
                return {
                    variant: 'destructive' as const,
                    icon: <XCircle className="h-3 w-3" />,
                    text: 'Failed',
                    description: syncError || 'Sync failed. Click to retry.',
                };
            case 'Pending':
                return {
                    variant: 'secondary' as const,
                    icon: <Clock className="h-3 w-3" />,
                    text: 'Pending',
                    description: 'Waiting to sync with Hubstaff',
                };
            default:
                return {
                    variant: 'outline' as const,
                    icon: <Clock className="h-3 w-3" />,
                    text: 'Not Synced',
                    description: 'Click to sync with Hubstaff',
                };
        }
    };

    const statusInfo = getSyncStatusInfo();

    // Format time tracked
    const formatTime = (seconds?: number) => {
        if (!seconds) return '0h';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    return (
        <div className="flex items-center gap-2">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge
                            variant={statusInfo.variant}
                            className="flex items-center gap-1 cursor-pointer"
                            onClick={task.syncStatus !== 'Synced' ? handleSync : undefined}
                        >
                            {statusInfo.icon}
                            <span className="text-xs">{statusInfo.text}</span>
                            {task.syncStatus !== 'Synced' && !isSyncing && (
                                <RefreshCw className="h-3 w-3 ml-1 opacity-60" />
                            )}
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{statusInfo.description}</p>
                        {task.hubstaffTaskId && (
                            <p className="text-xs mt-1 opacity-70">
                                Hubstaff ID: {task.hubstaffTaskId}
                            </p>
                        )}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {showTimeTracked && task.timeTracked !== undefined && task.timeTracked > 0 && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge variant="secondary" className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span className="text-xs">{formatTime(task.timeTracked)}</span>
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Time tracked in Hubstaff</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            {task.hubstaffTaskId && (
                <a
                    href={`https://app.hubstaff.com/tasks/${task.hubstaffTaskId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                >
                    Open in Hubstaff
                </a>
            )}
        </div>
    );
}
