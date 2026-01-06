'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  ListTodo,
  RefreshCw,
  Zap,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GenerateCadenceTasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  onTasksGenerated?: () => void;
}

interface PreviewTask {
  task: string;
  dueDate: string;
  cadencePhase: string;
  roles: string[];
}

interface PreviewSkipped {
  task: string;
  reason: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

interface TeamMemberMapping {
  role: string;
  userId: string;
  name: string;
}

type FrequencyOption = 'all' | 'Monthly' | 'Weekly' | 'Daily';

export function GenerateCadenceTasksDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  onTasksGenerated,
}: GenerateCadenceTasksDialogProps) {
  const [frequency, setFrequency] = useState<FrequencyOption>('all');
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    generated: PreviewTask[];
    skipped: PreviewSkipped[];
    tasksPerMember?: Record<string, number>;
  } | null>(null);
  const [result, setResult] = useState<{
    created: number;
    failed: number;
    skipped: number;
    tasksPerMember?: Record<string, number>;
  } | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamMemberMappings, setTeamMemberMappings] = useState<TeamMemberMapping[]>([]);

  // Fetch team members when dialog opens
  useEffect(() => {
    if (open) {
      fetchTeamMembers();
    }
  }, [open]);

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch('/api/team');
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.members || []);

        // Build team member mappings for task assignment
        const mappings: TeamMemberMapping[] = [];
        for (const member of data.members || []) {
          for (const role of member.roles) {
            mappings.push({
              role,
              userId: member.id,
              name: member.name,
            });
          }
        }
        setTeamMemberMappings(mappings);
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  };

  const fetchCurrentPhase = async () => {
    try {
      const response = await fetch('/api/cadence/current-phase');
      if (response.ok) {
        const data = await response.json();
        setCurrentPhase(data.phase);
      }
    } catch (error) {
      console.error('Failed to fetch current phase:', error);
    }
  };

  const handlePreview = async () => {
    setIsLoading(true);
    setPreviewData(null);
    setResult(null);

    try {
      await fetchCurrentPhase();

      const response = await fetch('/api/cadence/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          clientName,
          frequency: frequency === 'all' ? undefined : frequency,
          dryRun: true,
          teamMemberMappings, // Include team member mappings for preview
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to preview tasks');
      }

      setPreviewData({
        generated: data.generated || [],
        skipped: data.skipped || [],
        tasksPerMember: data.tasksPerMember || {},
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to preview tasks';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/cadence/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          clientName,
          frequency: frequency === 'all' ? undefined : frequency,
          dryRun: false,
          teamMemberMappings, // Include team member mappings for assignment
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate tasks');
      }

      setResult({
        created: data.created || 0,
        failed: data.failed || 0,
        skipped: data.skipped || 0,
        tasksPerMember: data.tasksPerMember || {},
      });

      toast.success(`Created ${data.created} tasks across team members`);
      onTasksGenerated?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate tasks';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPreviewData(null);
    setResult(null);
    setCurrentPhase(null);
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      fetchCurrentPhase();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Generate Cadence Tasks
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Generate recurring tasks from your operating cadence templates for {clientName}.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          // Result State
          <div className="py-6 space-y-4">
            <div className="flex items-center justify-center">
              <div className="p-4 rounded-full bg-green-500/10">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-medium text-white">Tasks Generated</h3>
              <p className="text-sm text-zinc-400">
                Successfully created {result.created} tasks for {clientName}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-zinc-800 border border-zinc-700">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">{result.created}</p>
                <p className="text-xs text-zinc-400">Created</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-500">{result.skipped}</p>
                <p className="text-xs text-zinc-400">Skipped</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">{result.failed}</p>
                <p className="text-xs text-zinc-400">Failed</p>
              </div>
            </div>

            {/* Tasks per team member breakdown */}
            {result.tasksPerMember && Object.keys(result.tasksPerMember).length > 0 && (
              <div className="p-4 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-300">Tasks per Team Member</span>
                </div>
                <div className="space-y-2">
                  {Object.entries(result.tasksPerMember).map(([name, count]) => (
                    <div key={name} className="flex justify-between items-center text-sm">
                      <span className="text-zinc-400">{name}</span>
                      <Badge variant="secondary" className="bg-zinc-700">
                        {count} tasks
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          // Form/Preview State
          <div className="space-y-4 py-4">
            {/* Current Phase Indicator */}
            {currentPhase && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-blue-400">
                    Current Cadence Phase: <strong>{currentPhase}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Team Members Info */}
            {teamMembers.length > 0 && (
              <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm text-zinc-300">
                    {teamMembers.length} team members will be assigned tasks based on their roles
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {teamMembers.slice(0, 5).map((member) => (
                    <Badge key={member.id} variant="secondary" className="text-xs bg-zinc-700">
                      {member.name}
                    </Badge>
                  ))}
                  {teamMembers.length > 5 && (
                    <Badge variant="secondary" className="text-xs bg-zinc-600">
                      +{teamMembers.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Frequency Filter */}
            <div className="space-y-2">
              <Label className="text-zinc-300">Task Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as FrequencyOption)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="all">All Frequencies</SelectItem>
                  <SelectItem value="Monthly">Monthly Tasks</SelectItem>
                  <SelectItem value="Weekly">Weekly Tasks</SelectItem>
                  <SelectItem value="Daily">Daily Tasks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preview Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800 border border-zinc-700">
              <div className="space-y-0.5">
                <Label className="text-zinc-300">Preview Mode</Label>
                <p className="text-xs text-zinc-500">
                  Preview tasks before creating them
                </p>
              </div>
              <Switch checked={isPreviewMode} onCheckedChange={setIsPreviewMode} />
            </div>

            {/* Preview Results */}
            {previewData && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">
                    Preview ({previewData.generated.length} tasks)
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePreview}
                    className="gap-1 text-xs"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refresh
                  </Button>
                </div>

                <ScrollArea className="h-[200px] rounded-lg border border-zinc-700">
                  <div className="divide-y divide-zinc-800">
                    {previewData.generated.length === 0 ? (
                      <div className="p-4 text-center text-zinc-500 text-sm">
                        No tasks to generate for the selected frequency
                      </div>
                    ) : (
                      previewData.generated.map((task, index) => (
                        <div key={index} className="p-3 hover:bg-zinc-800/50">
                          <div className="flex items-start gap-3">
                            <ListTodo className="w-4 h-4 text-zinc-500 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate">{task.task}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-zinc-800 text-zinc-400"
                                >
                                  {task.cadencePhase}
                                </Badge>
                                <span className="text-xs text-zinc-500">
                                  Due: {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              </div>
                              {task.roles.length > 0 && (
                                <p className="text-xs text-zinc-500 mt-1">
                                  Roles: {task.roles.join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                {/* Tasks per member preview */}
                {previewData.tasksPerMember && Object.keys(previewData.tasksPerMember).length > 0 && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-400">
                        Tasks will be assigned to team members
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(previewData.tasksPerMember).slice(0, 6).map(([name, count]) => (
                        <div key={name} className="flex justify-between items-center text-xs">
                          <span className="text-green-300/70 truncate">{name}</span>
                          <Badge variant="secondary" className="bg-green-900/50 text-green-300 text-xs">
                            {count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {previewData.skipped.length > 0 && (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-yellow-400">
                        {previewData.skipped.length} tasks skipped
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {previewData.skipped.slice(0, 3).map((item, i) => (
                        <li key={i} className="text-xs text-yellow-300/70">
                          {item.task}: {item.reason}
                        </li>
                      ))}
                      {previewData.skipped.length > 3 && (
                        <li className="text-xs text-yellow-500">
                          +{previewData.skipped.length - 3} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-zinc-700 text-zinc-300"
              >
                Cancel
              </Button>
              {isPreviewMode && !previewData ? (
                <Button onClick={handlePreview} disabled={isLoading} className="gap-2">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ListTodo className="w-4 h-4" />
                      Preview Tasks
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleGenerate}
                  disabled={isLoading || (isPreviewMode && previewData?.generated.length === 0)}
                  className="gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Generate {previewData ? previewData.generated.length : ''} Tasks
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
