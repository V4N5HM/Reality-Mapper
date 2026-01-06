'use client';

import { useState, useMemo } from 'react';
import { Alert, Client, AlertType, AlertPriority } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { cn } from '@/lib/utils';
import {
  Bell,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb,
  ListTodo,
  Mail,
  Trash2,
  CheckSquare,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';

interface AlertsViewProps {
  alerts: Alert[];
  clients: Client[];
}

// Map alert types to icons and colors
const alertTypeConfig: Record<AlertType, { icon: typeof Bell; color: string; bgColor: string }> = {
  task_overdue: { icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  task_reminder: { icon: Clock, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
  urgent_idea: { icon: Lightbulb, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  daily_summary: { icon: ListTodo, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  general: { icon: Bell, color: 'text-zinc-400', bgColor: 'bg-zinc-500/10' },
  error: { icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
  info: { icon: Info, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
};

const priorityConfig: Record<AlertPriority, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  high: { label: 'High', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  normal: { label: 'Normal', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
  low: { label: 'Low', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
};

export function AlertsView({ alerts: initialAlerts, clients }: AlertsViewProps) {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<string>('all');

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (clientFilter !== 'all' && alert.clientId !== clientFilter) return false;
      if (typeFilter !== 'all' && alert.type !== typeFilter) return false;
      if (readFilter === 'read' && !alert.read) return false;
      if (readFilter === 'unread' && alert.read) return false;
      return true;
    });
  }, [alerts, clientFilter, typeFilter, readFilter]);

  // Toggle selection for an item
  const toggleSelection = (alertId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(alertId)) {
        newSet.delete(alertId);
      } else {
        newSet.add(alertId);
      }
      return newSet;
    });
  };

  // Select all filtered items
  const selectAll = () => {
    const allIds = filteredAlerts.map(alert => alert.id);
    setSelectedIds(new Set(allIds));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Mark single alert as read/unread
  const handleToggleRead = async (alertId: string, currentRead: boolean) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: !currentRead }),
      });

      if (!response.ok) throw new Error('Failed to update alert');

      setAlerts(prev =>
        prev.map(a => a.id === alertId ? { ...a, read: !currentRead } : a)
      );

      toast.success(currentRead ? 'Marked as unread' : 'Marked as read');
    } catch (error) {
      toast.error('Failed to update alert');
      console.error(error);
    }
  };

  // Bulk mark as read
  const handleBulkMarkAsRead = async () => {
    if (selectedIds.size === 0) return;

    setIsMarkingRead(true);
    try {
      const response = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), action: 'markAsRead' }),
      });

      if (!response.ok) throw new Error('Failed to mark alerts as read');

      const result = await response.json();
      setAlerts(prev =>
        prev.map(a => selectedIds.has(a.id) ? { ...a, read: true } : a)
      );

      toast.success(`Marked ${result.updated} alert${result.updated !== 1 ? 's' : ''} as read`);
      setSelectedIds(new Set());
      setSelectMode(false);
    } catch (error) {
      toast.error('Failed to mark alerts as read');
      console.error(error);
    } finally {
      setIsMarkingRead(false);
    }
  };

  // Bulk delete selected items
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/alerts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (!response.ok) throw new Error('Failed to delete alerts');

      const result = await response.json();

      // Remove deleted alerts from state
      setAlerts(prev => prev.filter(a => !selectedIds.has(a.id)));

      toast.success(`Deleted ${result.success} alert${result.success !== 1 ? 's' : ''}`);
      if (result.failed > 0) {
        toast.warning(`${result.failed} alert${result.failed !== 1 ? 's' : ''} failed to delete`);
      }
    } catch (error) {
      toast.error('Failed to delete alerts');
      console.error(error);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setSelectedIds(new Set());
      setSelectMode(false);
    }
  };

  // Delete single alert
  const handleDeleteAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete alert');

      setAlerts(prev => prev.filter(a => a.id !== alertId));
      toast.success('Alert deleted');
    } catch (error) {
      toast.error('Failed to delete alert');
      console.error(error);
    }
  };

  // Get unique alert types for filter
  const alertTypes = Array.from(new Set(alerts.map(a => a.type)));

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Client Filter */}
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-700">
              <SelectValue placeholder="Filter by client" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-700">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="all">All Types</SelectItem>
              {alertTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Read/Unread Filter */}
          <Select value={readFilter} onValueChange={setReadFilter}>
            <SelectTrigger className="w-[140px] bg-zinc-900 border-zinc-700">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="read">Read</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Selection Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant={selectMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectMode(!selectMode);
              if (selectMode) setSelectedIds(new Set());
            }}
            className={cn(
              "gap-2",
              selectMode ? "bg-blue-600 hover:bg-blue-700" : "border-zinc-700 text-zinc-300"
            )}
          >
            <CheckSquare className="w-4 h-4" />
            {selectMode ? "Exit Select" : "Select"}
          </Button>
          {selectMode && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                className="border-zinc-700 text-zinc-300"
              >
                Select All ({filteredAlerts.length})
              </Button>
              {selectedIds.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  className="border-zinc-700 text-zinc-300"
                >
                  Clear
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectMode && selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
          <span className="text-sm text-zinc-400">
            {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkMarkAsRead}
              disabled={isMarkingRead}
              className="gap-2 border-zinc-700 text-zinc-300"
            >
              {isMarkingRead ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              Mark as Read
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteConfirmOpen(true)}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div className="space-y-2">
        {filteredAlerts.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-8 text-center">
              <Bell className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">No alerts to display</p>
              <p className="text-sm text-zinc-500 mt-1">
                Alerts from Slack notifications will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              selectMode={selectMode}
              isSelected={selectedIds.has(alert.id)}
              onToggleSelect={() => toggleSelection(alert.id)}
              onToggleRead={() => handleToggleRead(alert.id, alert.read)}
              onDelete={() => handleDeleteAlert(alert.id)}
            />
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Delete {selectedIds.size} alert{selectedIds.size !== 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected alerts will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-zinc-700 text-zinc-300"
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface AlertCardProps {
  alert: Alert;
  selectMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onToggleRead: () => void;
  onDelete: () => void;
}

function AlertCard({
  alert,
  selectMode,
  isSelected,
  onToggleSelect,
  onToggleRead,
  onDelete,
}: AlertCardProps) {
  const typeConfig = alertTypeConfig[alert.type] || alertTypeConfig.general;
  const prioConfig = priorityConfig[alert.priority] || priorityConfig.normal;
  const Icon = typeConfig.icon;

  const formattedDate = new Date(alert.createdAt).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card
      className={cn(
        'bg-zinc-900 border-zinc-800 transition-all',
        !alert.read && 'border-l-4 border-l-blue-500',
        isSelected && 'ring-2 ring-blue-500 bg-blue-500/5',
        selectMode && 'cursor-pointer'
      )}
      onClick={() => selectMode && onToggleSelect()}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {selectMode ? (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              className="mt-1 border-zinc-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className={cn('p-2 rounded-lg', typeConfig.bgColor)}>
              <Icon className={cn('w-5 h-5', typeConfig.color)} />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={cn(
                    'font-medium',
                    alert.read ? 'text-zinc-300' : 'text-white'
                  )}>
                    {alert.title}
                  </h3>
                  <Badge variant="outline" className={cn('text-xs', prioConfig.color)}>
                    {prioConfig.label}
                  </Badge>
                  {alert.sentToSlack && (
                    <Badge variant="outline" className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
                      Slack
                    </Badge>
                  )}
                </div>
                <p className={cn(
                  'text-sm',
                  alert.read ? 'text-zinc-500' : 'text-zinc-400'
                )}>
                  {alert.message}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  {alert.clientName && (
                    <span className="text-xs text-zinc-500">{alert.clientName}</span>
                  )}
                  <span className="text-xs text-zinc-600">{formattedDate}</span>
                </div>
              </div>

              {!selectMode && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleRead();
                    }}
                    className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                    title={alert.read ? 'Mark as unread' : 'Mark as read'}
                  >
                    {alert.read ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400"
                    title="Delete alert"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
