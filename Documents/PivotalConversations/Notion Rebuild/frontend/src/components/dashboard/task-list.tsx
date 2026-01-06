'use client';

import { useState } from 'react';
import { Task } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, summarizeTaskTitle } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { CalendarDays, Building2, User, RefreshCw } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  title?: string;
  onTaskComplete?: (taskId: string) => void;
}

// Sort tasks by due date (earliest first, nulls last)
function sortByDueDate(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

const urgencyColors = {
  Urgent: 'bg-red-500/10 text-red-500 border-red-500/20',
  'This Week': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  'This Month': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  Backlog: 'bg-zinc-600/10 text-zinc-500 border-zinc-600/20',
};

export function TaskList({ tasks, title = 'Tasks', onTaskComplete }: TaskListProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Sort tasks by due date
  const sortedTasks = sortByDueDate(tasks);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDialogOpen(true);
  };

  return (
    <>
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-white flex items-center justify-between">
            {title}
            <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">
              {sortedTasks.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <div className="space-y-1 p-4 pt-0">
              {sortedTasks.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-4">No tasks</p>
              ) : (
                sortedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-800/50 transition-colors group cursor-pointer"
                    onClick={() => handleTaskClick(task)}
                  >
                    <Checkbox
                      className="mt-0.5 border-zinc-600"
                      checked={task.status === 'Complete'}
                      onCheckedChange={() => {
                        onTaskComplete?.(task.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          task.status === 'Complete' ? 'text-zinc-500 line-through' : 'text-white'
                        )}
                        title={task.task}
                      >
                        {summarizeTaskTitle(task.task, 50)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {task.clientName && (
                          <span className="text-xs text-zinc-500">{task.clientName}</span>
                        )}
                        {task.dueDate && (
                          <span className="text-xs text-zinc-500">
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn('text-xs shrink-0', urgencyColors[task.urgency])}
                    >
                      {task.urgency}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Task Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <DialogTitle className="text-white text-lg leading-tight">
                      {selectedTask.task}
                    </DialogTitle>
                    <DialogDescription className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn('text-xs', urgencyColors[selectedTask.urgency])}
                      >
                        {selectedTask.urgency}
                      </Badge>
                      {selectedTask.recurringTemplateId && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/20"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Cadence Task
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          selectedTask.status === 'Complete'
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : selectedTask.status === 'In Progress'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                        )}
                      >
                        {selectedTask.status}
                      </Badge>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Client */}
                {selectedTask.clientName && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
                    <Building2 className="w-4 h-4 text-zinc-400" />
                    <div>
                      <p className="text-xs text-zinc-500">Client</p>
                      <p className="text-sm text-white">{selectedTask.clientName}</p>
                    </div>
                  </div>
                )}

                {/* Assigned To */}
                {selectedTask.assignedTo && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
                    <User className="w-4 h-4 text-zinc-400" />
                    <div>
                      <p className="text-xs text-zinc-500">Assigned To</p>
                      <p className="text-sm text-white">{selectedTask.assignedTo}</p>
                    </div>
                  </div>
                )}

                {/* Due Date */}
                {selectedTask.dueDate && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
                    <CalendarDays className="w-4 h-4 text-zinc-400" />
                    <div>
                      <p className="text-xs text-zinc-500">Due Date</p>
                      <p className="text-sm text-white">
                        {new Date(selectedTask.dueDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedTask.notes && (
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-500">Notes</p>
                    <div className="p-3 rounded-lg bg-zinc-800/50 text-sm text-zinc-300 whitespace-pre-wrap">
                      {selectedTask.notes}
                    </div>
                  </div>
                )}

                {/* Created Date */}
                <div className="text-xs text-zinc-500">
                  Created: {new Date(selectedTask.createdAt).toLocaleDateString()}
                  {selectedTask.completedDate && (
                    <> &bull; Completed: {new Date(selectedTask.completedDate).toLocaleDateString()}</>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
