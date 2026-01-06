'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, AlertCircle, Clock, CheckSquare, MessageSquare, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'content_due' | 'content_overdue' | 'task_due' | 'task_overdue' | 'content_ready' | 'feedback_needed';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  url?: string;
  priority: 'high' | 'medium' | 'low';
}

const typeConfig = {
  content_due: {
    icon: Calendar,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  content_overdue: {
    icon: AlertCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  task_due: {
    icon: CheckSquare,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  task_overdue: {
    icon: AlertCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  content_ready: {
    icon: Clock,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  feedback_needed: {
    icon: MessageSquare,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
};

const priorityColors = {
  high: 'border-l-red-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-blue-500',
};

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on mount and periodically
  useEffect(() => {
    fetchNotifications();

    // Refresh every 2 minutes
    const interval = setInterval(fetchNotifications, 120000);
    return () => clearInterval(interval);
  }, []);

  // Fetch when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleNotificationClick = (notification: Notification) => {
    if (notification.url) {
      router.push(notification.url);
    }
    setIsOpen(false);
  };

  const highPriorityCount = notifications.filter(n => n.priority === 'high').length;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-zinc-400 hover:text-white">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className={cn(
              "absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] text-xs font-medium rounded-full px-1",
              highPriorityCount > 0
                ? "bg-red-500 text-white"
                : "bg-blue-500 text-white"
            )}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 bg-zinc-900 border-zinc-800">
        <DropdownMenuLabel className="flex items-center justify-between py-3">
          <span className="text-white">Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="outline" className="bg-zinc-800 text-zinc-400 border-zinc-700">
              {unreadCount} new
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800" />

        <ScrollArea className="h-[400px]">
          {isLoading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
              <Bell className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((notification) => {
                const config = typeConfig[notification.type];
                const Icon = config.icon;

                return (
                  <DropdownMenuItem
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      'flex items-start gap-3 p-3 cursor-pointer border-l-2 mx-1 my-1 rounded-r-lg',
                      priorityColors[notification.priority],
                      'hover:bg-zinc-800 focus:bg-zinc-800'
                    )}
                  >
                    <div className={cn('p-2 rounded-lg shrink-0', config.bgColor)}>
                      <Icon className={cn('w-4 h-4', config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">
                          {notification.title}
                        </p>
                        {notification.priority === 'high' && (
                          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs px-1.5">
                            Urgent
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-zinc-400 hover:text-white hover:bg-zinc-800"
                onClick={() => {
                  setIsOpen(false);
                  // Could navigate to a dedicated notifications page
                }}
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
