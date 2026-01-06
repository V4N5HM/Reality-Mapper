'use client';

import { useState } from 'react';
import { OperatingCadence } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  Plus,
  Loader2,
  Calendar,
  Clock,
  CalendarDays,
  Users,
  Repeat,
  Trash2,
  PlayCircle,
  PauseCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface CadenceViewProps {
  items: OperatingCadence[];
}

const CADENCE_PHASES = [
  'Start of Week',
  'Mid-Week',
  'End of Week',
  'Start of Month',
  'Mid-Month',
  'End of Month',
  'Client Onboarding',
  'Content Production',
  'Review Cycle',
  'Reporting',
] as const;

// New team roles that match the team member roles
const TEAM_ROLES = [
  'Coordinator',
  'Short Form Manager',
  'YouTube Manager',
  'Editor',
] as const;

// Colors for each team role
const roleColors: Record<string, string> = {
  'Coordinator': 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  'Short Form Manager': 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  'YouTube Manager': 'bg-red-500/20 text-red-400 border-red-500/40',
  'Editor': 'bg-green-500/20 text-green-400 border-green-500/40',
};

const frequencyColors: Record<string, string> = {
  Daily: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Weekly: 'bg-green-500/10 text-green-500 border-green-500/20',
  Monthly: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

const frequencyIcons: Record<string, typeof Calendar> = {
  Daily: Clock,
  Weekly: CalendarDays,
  Monthly: Calendar,
};

const phaseColors: Record<string, string> = {
  'Start of Week': 'bg-green-500/10 text-green-500',
  'Mid-Week': 'bg-yellow-500/10 text-yellow-500',
  'End of Week': 'bg-orange-500/10 text-orange-500',
  'Start of Month': 'bg-blue-500/10 text-blue-500',
  'Mid-Month': 'bg-indigo-500/10 text-indigo-500',
  'End of Month': 'bg-purple-500/10 text-purple-500',
  'Client Onboarding': 'bg-cyan-500/10 text-cyan-500',
  'Content Production': 'bg-pink-500/10 text-pink-500',
  'Review Cycle': 'bg-red-500/10 text-red-500',
  'Reporting': 'bg-zinc-500/10 text-zinc-400',
};

interface CreateCadenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemCreated: (item: OperatingCadence) => void;
}

function CreateCadenceDialog({ open, onOpenChange, onItemCreated }: CreateCadenceDialogProps) {
  const [taskTemplate, setTaskTemplate] = useState('');
  const [frequency, setFrequency] = useState<'Daily' | 'Weekly' | 'Monthly'>('Weekly');
  const [cadencePhase, setCadencePhase] = useState<string>('');
  const [roles, setRoles] = useState<string[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState<string>('');
  const [weekOfMonth, setWeekOfMonth] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const toggleRole = (role: string) => {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleCreate = async () => {
    if (!taskTemplate.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/cadence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTemplate: taskTemplate.trim(),
          frequency,
          cadencePhase: cadencePhase || undefined,
          roles: roles.length > 0 ? roles : undefined,
          dayOfMonth: dayOfMonth ? parseInt(dayOfMonth) : undefined,
          weekOfMonth: weekOfMonth || undefined,
          description: description || undefined,
          active: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create cadence item');
      }

      const newItem = await response.json();
      toast.success('Cadence item created');
      onItemCreated(newItem);
      onOpenChange(false);

      // Reset form
      setTaskTemplate('');
      setCadencePhase('');
      setRoles([]);
      setDayOfMonth('');
      setWeekOfMonth('');
      setDescription('');
    } catch (error) {
      toast.error('Failed to create cadence item');
      console.error('Error creating cadence item:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Add Recurring Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="taskTemplate" className="text-zinc-300">Task Template</Label>
            <Input
              id="taskTemplate"
              value={taskTemplate}
              onChange={(e) => setTaskTemplate(e.target.value)}
              placeholder="e.g., Send weekly client reports"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Frequency</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="Daily">Daily</SelectItem>
                <SelectItem value="Weekly">Weekly</SelectItem>
                <SelectItem value="Monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Phase</Label>
            <Select value={cadencePhase} onValueChange={setCadencePhase}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Select phase..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {CADENCE_PHASES.map((phase) => (
                  <SelectItem key={phase} value={phase}>{phase}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {frequency === 'Monthly' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dayOfMonth" className="text-zinc-300">Day of Month</Label>
                <Input
                  id="dayOfMonth"
                  type="number"
                  min="1"
                  max="31"
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  placeholder="1-31"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Week of Month</Label>
                <Select value={weekOfMonth} onValueChange={setWeekOfMonth}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="First">First Week</SelectItem>
                    <SelectItem value="Second">Second Week</SelectItem>
                    <SelectItem value="Third">Third Week</SelectItem>
                    <SelectItem value="Fourth">Fourth Week</SelectItem>
                    <SelectItem value="Last">Last Week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-zinc-300">Assigned Roles</Label>
            <p className="text-xs text-zinc-500 mb-2">
              Tasks will be auto-assigned to team members with these roles
            </p>
            <div className="flex flex-wrap gap-2">
              {TEAM_ROLES.map((role) => (
                <Badge
                  key={role}
                  variant="outline"
                  className={cn(
                    'cursor-pointer transition-colors',
                    roles.includes(role)
                      ? roleColors[role] || 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600'
                  )}
                  onClick={() => toggleRole(role)}
                >
                  {role}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-zinc-300">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details..."
              className="bg-zinc-800 border-zinc-700 text-white min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-zinc-700 text-zinc-300">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!taskTemplate.trim() || isCreating} className="gap-2">
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isCreating ? 'Creating...' : 'Add Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CadenceView({ items: initialItems }: CadenceViewProps) {
  const [items, setItems] = useState(initialItems);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Group items by frequency
  const dailyItems = items.filter((i) => i.frequency === 'Daily');
  const weeklyItems = items.filter((i) => i.frequency === 'Weekly');
  const monthlyItems = items.filter((i) => i.frequency === 'Monthly');

  const handleItemCreated = (newItem: OperatingCadence) => {
    setItems((prev) => [newItem, ...prev]);
  };

  const handleToggleActive = async (item: OperatingCadence) => {
    setTogglingId(item.id);
    try {
      const response = await fetch(`/api/cadence/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !item.active }),
      });

      if (!response.ok) throw new Error('Failed to update');

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, active: !i.active } : i))
      );
      toast.success(item.active ? 'Task paused' : 'Task activated');
    } catch (error) {
      toast.error('Failed to update task');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/cadence/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success('Task removed');
    } catch (error) {
      toast.error('Failed to delete task');
    } finally {
      setDeletingId(null);
    }
  };

  const renderItemCard = (item: OperatingCadence) => {
    const FrequencyIcon = frequencyIcons[item.frequency] || Repeat;
    const isUpdating = togglingId === item.id || deletingId === item.id;

    return (
      <div
        key={item.id}
        className={cn(
          'flex items-start gap-4 p-4 rounded-lg border transition-all',
          item.active
            ? 'bg-zinc-800/50 border-zinc-700'
            : 'bg-zinc-900/50 border-zinc-800 opacity-60'
        )}
      >
        <div className={cn(
          'p-2 rounded-lg',
          frequencyColors[item.frequency]?.split(' ')[0] || 'bg-zinc-500/10'
        )}>
          <FrequencyIcon className={cn(
            'w-5 h-5',
            frequencyColors[item.frequency]?.split(' ')[1] || 'text-zinc-400'
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className={cn(
              'text-sm font-medium truncate',
              item.active ? 'text-white' : 'text-zinc-500'
            )}>
              {item.taskTemplate}
            </p>
            {item.cadencePhase && (
              <Badge variant="outline" className={cn(
                'text-xs border-transparent shrink-0',
                phaseColors[item.cadencePhase] || 'bg-zinc-500/10 text-zinc-400'
              )}>
                {item.cadencePhase}
              </Badge>
            )}
          </div>

          {item.description && (
            <p className="text-xs text-zinc-500 line-clamp-1 mb-2">{item.description}</p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {item.roles.map((role) => (
              <Badge
                key={role}
                variant="outline"
                className={cn(
                  'text-xs',
                  roleColors[role] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                )}
              >
                <Users className="w-3 h-3 mr-1" />
                {role}
              </Badge>
            ))}
            {item.dayOfMonth && (
              <span className="text-xs text-zinc-500">
                Day {item.dayOfMonth}
              </span>
            )}
            {item.weekOfMonth && (
              <span className="text-xs text-zinc-500">
                {item.weekOfMonth} week
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isUpdating ? (
            <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-400 hover:text-white"
                onClick={() => handleToggleActive(item)}
              >
                {item.active ? (
                  <PauseCircle className="w-4 h-4" />
                ) : (
                  <PlayCircle className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-400 hover:text-red-500"
                onClick={() => handleDelete(item.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Operating Cadence</h1>
            <p className="text-zinc-400">Recurring tasks and operating rhythm</p>
          </div>
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            Add Recurring Task
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Repeat className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{items.length}</p>
                <p className="text-sm text-zinc-400">Total Tasks</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{dailyItems.length}</p>
                <p className="text-sm text-zinc-400">Daily</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CalendarDays className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{weeklyItems.length}</p>
                <p className="text-sm text-zinc-400">Weekly</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Calendar className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{monthlyItems.length}</p>
                <p className="text-sm text-zinc-400">Monthly</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cadence Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="all">All ({items.length})</TabsTrigger>
            <TabsTrigger value="daily" className="gap-2">
              <Clock className="w-4 h-4" />
              Daily ({dailyItems.length})
            </TabsTrigger>
            <TabsTrigger value="weekly" className="gap-2">
              <CalendarDays className="w-4 h-4" />
              Weekly ({weeklyItems.length})
            </TabsTrigger>
            <TabsTrigger value="monthly" className="gap-2">
              <Calendar className="w-4 h-4" />
              Monthly ({monthlyItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg text-white">All Recurring Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {items.length === 0 ? (
                      <div className="text-center py-12">
                        <Repeat className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                        <p className="text-zinc-500 text-sm mb-4">No recurring tasks yet</p>
                        <Button variant="outline" onClick={() => setDialogOpen(true)} className="gap-2">
                          <Plus className="w-4 h-4" />
                          Add First Task
                        </Button>
                      </div>
                    ) : (
                      items.map(renderItemCard)
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="daily">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg text-white">Daily Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {dailyItems.length === 0 ? (
                      <p className="text-zinc-500 text-sm text-center py-8">No daily tasks</p>
                    ) : (
                      dailyItems.map(renderItemCard)
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weekly">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg text-white">Weekly Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {weeklyItems.length === 0 ? (
                      <p className="text-zinc-500 text-sm text-center py-8">No weekly tasks</p>
                    ) : (
                      weeklyItems.map(renderItemCard)
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg text-white">Monthly Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {monthlyItems.length === 0 ? (
                      <p className="text-zinc-500 text-sm text-center py-8">No monthly tasks</p>
                    ) : (
                      monthlyItems.map(renderItemCard)
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <CreateCadenceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onItemCreated={handleItemCreated}
      />
    </>
  );
}
