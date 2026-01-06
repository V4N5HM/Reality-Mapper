'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Task, Client, TaskUrgency, TaskStatus, Subtask } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { cn, summarizeTaskTitle } from '@/lib/utils';
import { AlertTriangle, Clock, CalendarDays, Loader2, Plus, CheckCircle2, RefreshCw, X, User, Building2, Pencil, Save, Trash2, LayoutGrid, List, GripVertical, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

interface TasksViewProps {
  urgent: Task[];
  thisWeek: Task[];
  thisMonth: Task[];
  completed: Task[];
  clients: Client[];
  teamMembers: TeamMember[];
  isAdmin?: boolean;
  currentUserId?: string;
  currentUserName?: string;
}

const urgencyColors: Record<TaskUrgency, string> = {
  Urgent: 'bg-red-500/10 text-red-500 border-red-500/20',
  'This Week': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  'This Month': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  Backlog: 'bg-zinc-600/10 text-zinc-500 border-zinc-600/20',
};

const urgencyIcons: Record<TaskUrgency, typeof AlertTriangle> = {
  Urgent: AlertTriangle,
  'This Week': Clock,
  'This Month': CalendarDays,
  Backlog: CalendarDays,
};

// Task Detail Dialog - for viewing and editing a task
interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  teamMembers: TeamMember[];
  onTaskUpdated: (task: Task) => void;
  onTaskCompleted: (taskId: string) => void;
  onTaskDeleted: (taskId: string) => void;
}

function TaskDetailDialog({ task, open, onOpenChange, clients, teamMembers, onTaskUpdated, onTaskCompleted, onTaskDeleted }: TaskDetailDialogProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editUrgency, setEditUrgency] = useState<TaskUrgency>('This Week');
  const [editDueDate, setEditDueDate] = useState('');
  const [editClientId, setEditClientId] = useState<string>('none');
  const [editAssignedTo, setEditAssignedTo] = useState<string>('none');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Subtask state
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

  // Reset edit state when task changes or dialog closes
  const resetEditState = () => {
    if (task) {
      setEditTitle(task.task);
      setEditNotes(task.notes || '');
      setEditUrgency(task.urgency);
      setEditDueDate(task.dueDate || '');
      setEditClientId(task.clientId || 'none');
      // Use assigneeId (Team Member database ID) if available, otherwise fall back to name lookup
      const assigneeId = task.assigneeId || teamMembers.find(m => m.name === task.assignedTo)?.id;
      setEditAssignedTo(assigneeId || 'none');
      setSubtasks(task.subtasks || []);
    }
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setIsAddingSubtask(false);
    setNewSubtaskTitle('');
  };

  // Initialize subtasks when task changes
  // Using useEffect pattern via conditional initialization
  if (task && task.subtasks && subtasks.length === 0 && task.subtasks.length > 0) {
    setSubtasks(task.subtasks);
  }

  // Delete task
  const handleDelete = async () => {
    if (!task) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      toast.success('Task deleted');
      router.refresh();
      onTaskDeleted(task.id);
      handleDialogClose(false);
    } catch (error) {
      toast.error('Failed to delete task');
      console.error('Error deleting task:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Initialize edit values when entering edit mode
  const handleStartEdit = () => {
    if (task) {
      setEditTitle(task.task);
      setEditNotes(task.notes || '');
      setEditUrgency(task.urgency);
      setEditDueDate(task.dueDate || '');
      setEditClientId(task.clientId || 'none');
      // Use assigneeId (Team Member database ID) if available, otherwise fall back to name lookup
      const assigneeId = task.assigneeId || teamMembers.find(m => m.name === task.assignedTo)?.id;
      setEditAssignedTo(assigneeId || 'none');
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!task || !editTitle.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: editTitle.trim(),
          notes: editNotes || undefined,
          urgency: editUrgency,
          dueDate: editDueDate || undefined,
          clientId: editClientId === 'none' ? undefined : editClientId,
          // Use assigneeId for relation-based assignment (works for all team members)
          assigneeId: editAssignedTo === 'none' ? undefined : editAssignedTo,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      const updatedTask = await response.json();
      toast.success('Task updated successfully');
      router.refresh();
      const assignedMember = teamMembers.find(m => m.id === editAssignedTo);
      onTaskUpdated({
        ...task,
        task: editTitle.trim(),
        notes: editNotes || undefined,
        urgency: editUrgency,
        dueDate: editDueDate || undefined,
        clientId: editClientId === 'none' ? undefined : editClientId,
        clientName: editClientId === 'none' ? undefined : clients.find(c => c.id === editClientId)?.name,
        assignedTo: assignedMember?.name || undefined,
        assigneeId: editAssignedTo === 'none' ? undefined : editAssignedTo,
      });
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update task');
      console.error('Error updating task:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      resetEditState();
      setSubtasks([]);
      setNewSubtaskTitle('');
      setIsAddingSubtask(false);
    }
    onOpenChange(open);
  };

  // Add a new subtask
  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim() || !task) return;

    const newSubtask: Subtask = {
      id: `subtask-${Date.now()}`,
      title: newSubtaskTitle.trim(),
      completed: false,
      parentTaskId: task.id,
    };

    setSubtasks(prev => [...prev, newSubtask]);
    setNewSubtaskTitle('');
    setIsAddingSubtask(false);

    // Update the parent task with the new subtask
    const updatedSubtasks = [...subtasks, newSubtask];
    onTaskUpdated({
      ...task,
      subtasks: updatedSubtasks,
    });
  };

  // Toggle subtask completion
  const handleToggleSubtask = (subtaskId: string) => {
    if (!task) return;

    setSubtasks(prev => {
      const updated = prev.map(s =>
        s.id === subtaskId ? { ...s, completed: !s.completed } : s
      );
      onTaskUpdated({
        ...task,
        subtasks: updated,
      });
      return updated;
    });
  };

  // Delete a subtask
  const handleDeleteSubtask = (subtaskId: string) => {
    if (!task) return;

    setSubtasks(prev => {
      const updated = prev.filter(s => s.id !== subtaskId);
      onTaskUpdated({
        ...task,
        subtasks: updated,
      });
      return updated;
    });
  };

  if (!task) return null;

  const clientName = clients.find(c => c.id === task.clientId)?.name || task.clientName;

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white text-lg font-semibold"
                  placeholder="Task title"
                />
              ) : (
                <DialogTitle className="text-white text-lg leading-tight">
                  {task.task}
                </DialogTitle>
              )}
              <DialogDescription className="mt-2 flex flex-wrap items-center gap-2">
                {isEditing ? (
                  <Select value={editUrgency} onValueChange={(v) => setEditUrgency(v as TaskUrgency)}>
                    <SelectTrigger className="w-[140px] h-7 text-xs bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="Urgent" className="text-red-400">Urgent</SelectItem>
                      <SelectItem value="This Week" className="text-yellow-400">This Week</SelectItem>
                      <SelectItem value="This Month" className="text-zinc-300">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge
                    variant="outline"
                    className={cn('text-xs', urgencyColors[task.urgency])}
                  >
                    {task.urgency}
                  </Badge>
                )}
                {task.recurringTemplateId && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/20"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Cadence Task
                  </Badge>
                )}
                {!isEditing && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs',
                      task.status === 'Complete'
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : task.status === 'In Progress'
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                    )}
                  >
                    {task.status}
                  </Badge>
                )}
              </DialogDescription>
            </div>
            {!isEditing && task.status !== 'Complete' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleStartEdit}
                className="text-zinc-400 hover:text-white"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Client */}
          {isEditing ? (
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs">Client</Label>
              <Select value={editClientId} onValueChange={setEditClientId}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="none">No client</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : clientName ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
              <Building2 className="w-4 h-4 text-zinc-400" />
              <div>
                <p className="text-xs text-zinc-500">Client</p>
                <p className="text-sm text-white">{clientName}</p>
              </div>
            </div>
          ) : null}

          {/* Assigned To - editable */}
          {isEditing ? (
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs">Assigned To</Label>
              <Select value={editAssignedTo} onValueChange={setEditAssignedTo}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Select assignee..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="none">Unassigned</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (task.assignedTo || task.assigneeId) ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
              <User className="w-4 h-4 text-zinc-400" />
              <div>
                <p className="text-xs text-zinc-500">Assigned To</p>
                <p className="text-sm text-white">
                  {/* Show name from assignedTo or look up by assigneeId */}
                  {task.assignedTo || teamMembers.find(m => m.id === task.assigneeId)?.name || 'Unknown'}
                </p>
              </div>
            </div>
          ) : null}

          {/* Due Date */}
          {isEditing ? (
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs">Due Date</Label>
              <Input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          ) : task.dueDate ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
              <CalendarDays className="w-4 h-4 text-zinc-400" />
              <div>
                <p className="text-xs text-zinc-500">Due Date</p>
                <p className="text-sm text-white">
                  {new Date(task.dueDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          ) : null}

          {/* Notes/Description */}
          {isEditing ? (
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs">Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add notes..."
                className="bg-zinc-800 border-zinc-700 text-white min-h-[100px]"
              />
            </div>
          ) : task.notes ? (
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs">Notes</Label>
              <div className="p-3 rounded-lg bg-zinc-800/50 text-sm text-zinc-300 whitespace-pre-wrap">
                {task.notes}
              </div>
            </div>
          ) : null}

          {/* Subtasks Section */}
          {!isEditing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-400 text-xs">Subtasks</Label>
                {!isAddingSubtask && task.status !== 'Complete' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAddingSubtask(true)}
                    className="text-zinc-400 hover:text-white h-6 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                )}
              </div>

              {/* Add subtask input */}
              {isAddingSubtask && (
                <div className="flex items-center gap-2">
                  <Input
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Subtask title..."
                    className="bg-zinc-800 border-zinc-700 text-white text-sm h-8"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtask();
                      } else if (e.key === 'Escape') {
                        setIsAddingSubtask(false);
                        setNewSubtaskTitle('');
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddSubtask}
                    disabled={!newSubtaskTitle.trim()}
                    className="h-8"
                  >
                    Add
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsAddingSubtask(false);
                      setNewSubtaskTitle('');
                    }}
                    className="h-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Subtask list */}
              {subtasks.length > 0 ? (
                <div className="space-y-1">
                  {subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/50 group"
                    >
                      <Checkbox
                        checked={subtask.completed}
                        onCheckedChange={() => handleToggleSubtask(subtask.id)}
                        className="border-zinc-600"
                      />
                      <span
                        className={cn(
                          "flex-1 text-sm",
                          subtask.completed ? "text-zinc-500 line-through" : "text-zinc-300"
                        )}
                      >
                        {subtask.title}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSubtask(subtask.id)}
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : !isAddingSubtask ? (
                <p className="text-xs text-zinc-600 py-2">No subtasks yet</p>
              ) : null}
            </div>
          )}

          {/* Created Date */}
          {!isEditing && (
            <div className="text-xs text-zinc-500">
              Created: {new Date(task.createdAt).toLocaleDateString()}
              {task.completedDate && (
                <> &bull; Completed: {new Date(task.completedDate).toLocaleDateString()}</>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {showDeleteConfirm ? (
            <>
              <p className="text-sm text-zinc-400 mr-auto">Are you sure you want to delete this task?</p>
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="border-zinc-700 text-zinc-300"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="gap-2"
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
              </Button>
            </>
          ) : isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="border-zinc-700 text-zinc-300"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!editTitle.trim() || isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 mr-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDialogClose(false)}
                className="border-zinc-700 text-zinc-300"
              >
                Close
              </Button>
              {task.status !== 'Complete' && (
                <Button
                  onClick={() => {
                    onTaskCompleted(task.id);
                    handleDialogClose(false);
                  }}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark Complete
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Create Task Dialog
interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  onTaskCreated: (task: Task) => void;
  currentUserId?: string;
  currentUserName?: string;
}

function CreateTaskDialog({ open, onOpenChange, clients, onTaskCreated, currentUserId, currentUserName }: CreateTaskDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState<string>('none');
  const [urgency, setUrgency] = useState<TaskUrgency>('This Week');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          clientId: clientId === 'none' ? undefined : clientId,
          urgency,
          dueDate: dueDate || undefined,
          description: notes || undefined,
          // Auto-assign to current user
          assigneeId: currentUserId,
          assignee: currentUserName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      const newTask = await response.json();
      toast.success('Task created successfully');
      router.refresh();
      onTaskCreated(newTask);
      onOpenChange(false);

      // Reset form
      setTitle('');
      setClientId('none');
      setUrgency('This Week');
      setDueDate('');
      setNotes('');
    } catch (error) {
      toast.error('Failed to create task');
      console.error('Error creating task:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white">Create New Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-zinc-300">Task Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          {/* Description/Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-zinc-300">Description (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details about this task..."
              className="bg-zinc-800 border-zinc-700 text-white min-h-[80px]"
            />
          </div>

          {/* Client */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Assigned Client (Optional)</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Select a client..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="none">No client</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Urgency */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Urgency</Label>
            <Select value={urgency} onValueChange={(v) => setUrgency(v as TaskUrgency)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="Urgent" className="text-red-400">
                  Urgent (48 hours)
                </SelectItem>
                <SelectItem value="This Week" className="text-yellow-400">
                  This Week (Before Friday)
                </SelectItem>
                <SelectItem value="This Month" className="text-zinc-300">
                  This Month (End of month)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate" className="text-zinc-300">Due Date (Optional)</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-zinc-700 text-zinc-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || isCreating}
            className="gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create Task
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Task Item Component - clickable to expand, draggable, inline editable
interface TaskItemProps {
  task: Task;
  onComplete: (taskId: string) => void;
  onReopen?: (taskId: string) => void;
  onUpdate?: (taskId: string, updates: { task?: string; clientId?: string; assignedTo?: string; dueDate?: string }) => Promise<void>;
  completingId: string | null;
  reopeningId?: string | null;
  onClick: () => void;
  index: number;
  isDraggable?: boolean;
  isCompleted?: boolean;
  clients?: Client[];
  teamMembers?: TeamMember[];
  selectMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (taskId: string) => void;
}

type KanbanEditingField = 'task' | 'client' | 'assignedTo' | 'dueDate' | null;

function TaskItem({ task, onComplete, onReopen, onUpdate, completingId, reopeningId, onClick, index, isDraggable = true, isCompleted = false, clients = [], teamMembers = [], selectMode = false, isSelected = false, onToggleSelection }: TaskItemProps) {
  const [editingField, setEditingField] = useState<KanbanEditingField>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle card click with delay to allow double-click to cancel
  const handleCardClick = () => {
    // If already editing, don't open dialog
    if (editingField) return;

    // Clear any existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    // Set timeout to open dialog after delay (allows double-click to cancel)
    clickTimeoutRef.current = setTimeout(() => {
      onClick();
    }, 200);
  };

  const handleDoubleClick = (e: React.MouseEvent, field: KanbanEditingField) => {
    if (isCompleted) return; // Don't allow inline editing of completed tasks
    e.stopPropagation();

    // Cancel the single-click timeout so dialog doesn't open
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }

    setEditingField(field);
    switch (field) {
      case 'task':
        setEditValue(task.task);
        break;
      case 'dueDate':
        setEditValue(task.dueDate || '');
        break;
      default:
        setEditValue('');
    }
  };

  const handleSave = async (field: KanbanEditingField, value: string) => {
    if (!onUpdate) {
      setEditingField(null);
      return;
    }

    const updates: { task?: string; clientId?: string; assigneeId?: string; dueDate?: string } = {};

    switch (field) {
      case 'task':
        if (!value.trim() || value === task.task) {
          setEditingField(null);
          return;
        }
        updates.task = value.trim();
        break;
      case 'client':
        if (value === (task.clientId || 'none')) {
          setEditingField(null);
          return;
        }
        updates.clientId = value === 'none' ? undefined : value;
        break;
      case 'assignedTo':
        // Compare with assigneeId (new) or look up by name (legacy)
        const currentAssigneeId = task.assigneeId || '';
        if (value === currentAssigneeId) {
          setEditingField(null);
          return;
        }
        // Use assigneeId for relation-based assignment
        updates.assigneeId = value || undefined;
        break;
      case 'dueDate':
        if (value === (task.dueDate || '')) {
          setEditingField(null);
          return;
        }
        updates.dueDate = value || undefined;
        break;
    }

    setIsSaving(true);
    try {
      await onUpdate(task.id, updates);
      setEditingField(null);
    } catch {
      setEditingField(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave(editingField, editValue);
    } else if (e.key === 'Escape') {
      setEditingField(null);
    }
  };

  const content = (
    <div className="flex items-start gap-2 flex-1 min-w-0">
      {selectMode && (
        <div
          className="shrink-0 mt-0.5"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelection?.(task.id);
          }}
        >
          <Checkbox
            checked={isSelected}
            className="border-zinc-600"
          />
        </div>
      )}
      {isDraggable && !selectMode && (
        <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab shrink-0">
          <GripVertical className="w-4 h-4 text-zinc-500" />
        </div>
      )}
      <div
        className="relative shrink-0"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {(completingId === task.id || reopeningId === task.id) ? (
          <Loader2 className="w-4 h-4 text-zinc-400 animate-spin mt-0.5" />
        ) : (
          <Checkbox
            className="mt-0.5 border-zinc-600"
            checked={task.status === 'Complete'}
            onCheckedChange={() => {
              if (isCompleted && onReopen) {
                onReopen(task.id);
              } else {
                onComplete(task.id);
              }
            }}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            {editingField === 'task' ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleSave('task', editValue)}
                onKeyDown={handleKeyDown}
                autoFocus
                disabled={isSaving}
                className="text-sm font-medium bg-zinc-800 border border-zinc-600 rounded px-2 py-0.5 text-white w-full focus:outline-none focus:ring-1 focus:ring-zinc-500"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <p
                className={cn(
                  "text-sm font-medium",
                  isCompleted ? "text-zinc-500 line-through" : "text-white cursor-text"
                )}
                onDoubleClick={(e) => handleDoubleClick(e, 'task')}
                title={task.task}
              >
                {summarizeTaskTitle(task.task, 55)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.recurringTemplateId && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0 h-4",
                isCompleted
                  ? "bg-blue-500/5 text-blue-400/50 border-blue-500/10"
                  : "bg-blue-500/10 text-blue-400 border-blue-500/20"
              )}
            >
              <RefreshCw className="w-2.5 h-2.5 mr-1" />
              Cadence
            </Badge>
          )}
          {/* Client - editable */}
          {editingField === 'client' ? (
            <div onClick={(e) => e.stopPropagation()}>
              <Select
                defaultValue={task.clientId || 'none'}
                onValueChange={(value) => handleSave('client', value)}
              >
                <SelectTrigger className="h-5 text-[10px] bg-zinc-800 border-zinc-600 w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="none">No client</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <span
              className={cn(
                "text-xs",
                isCompleted ? "text-zinc-600" : "text-zinc-500 cursor-pointer hover:text-zinc-400"
              )}
              onDoubleClick={(e) => handleDoubleClick(e, 'client')}
              title="Double-click to edit client"
            >
              {task.clientName || (isCompleted ? '' : 'No client')}
            </span>
          )}
          {/* Due Date - editable */}
          {!isCompleted && (
            <>
              {(task.clientName || editingField === 'client') && <span className="text-zinc-600">•</span>}
              {editingField === 'dueDate' ? (
                <input
                  type="date"
                  defaultValue={task.dueDate || ''}
                  onChange={(e) => handleSave('dueDate', e.target.value)}
                  onBlur={() => setEditingField(null)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  className="text-[10px] h-5 bg-zinc-800 border border-zinc-600 rounded px-1 text-white focus:outline-none"
                />
              ) : (
                <span
                  className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400"
                  onDoubleClick={(e) => handleDoubleClick(e, 'dueDate')}
                  title="Double-click to edit due date"
                >
                  {task.dueDate ? `Due: ${new Date(task.dueDate).toLocaleDateString()}` : 'No due date'}
                </span>
              )}
            </>
          )}
          {isCompleted && task.completedDate && (
            <>
              {task.clientName && <span className="text-zinc-700">•</span>}
              <span className="text-xs text-zinc-600">
                {new Date(task.completedDate).toLocaleDateString()}
              </span>
            </>
          )}
          {/* Assigned To - editable */}
          <>
            <span className={isCompleted ? "text-zinc-700" : "text-zinc-600"}>•</span>
            {editingField === 'assignedTo' ? (
              <div onClick={(e) => e.stopPropagation()}>
                <Select
                  defaultValue={task.assigneeId || teamMembers.find(m => m.name === task.assignedTo)?.id || 'none'}
                  onValueChange={(value) => handleSave('assignedTo', value === 'none' ? '' : value)}
                >
                  <SelectTrigger className="h-5 text-[10px] bg-zinc-800 border-zinc-600 w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="none">Unassigned</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <span
                className={cn(
                  "text-xs",
                  isCompleted ? "text-zinc-600" : "text-zinc-500 cursor-pointer hover:text-zinc-400"
                )}
                onDoubleClick={(e) => handleDoubleClick(e, 'assignedTo')}
                title="Double-click to edit assignee"
              >
                {task.assignedTo || teamMembers.find(m => m.id === task.assigneeId)?.name || (isCompleted ? '' : 'Unassigned')}
              </span>
            )}
          </>
        </div>
      </div>
    </div>
  );

  if (!isDraggable) {
    return (
      <div
        className="flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-800/50 transition-colors group cursor-pointer"
        onClick={handleCardClick}
      >
        {content}
      </div>
    );
  }

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-800/50 transition-colors group cursor-pointer",
            snapshot.isDragging && "bg-zinc-800 shadow-lg ring-1 ring-zinc-600"
          )}
          onClick={handleCardClick}
        >
          {content}
        </div>
      )}
    </Draggable>
  );
}

// Task Section Component with Droppable
interface TaskSectionProps {
  title: string;
  tasks: Task[];
  urgency: TaskUrgency;
  droppableId: string;
  onComplete: (taskId: string) => void;
  onUpdate: (taskId: string, updates: { task?: string; clientId?: string; assignedTo?: string; dueDate?: string }) => Promise<void>;
  completingId: string | null;
  onTaskClick: (task: Task) => void;
  clients: Client[];
  teamMembers: TeamMember[];
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (taskId: string) => void;
}

function TaskSection({ title, tasks, urgency, droppableId, onComplete, onUpdate, completingId, onTaskClick, clients, teamMembers, selectMode = false, selectedIds = new Set(), onToggleSelection }: TaskSectionProps) {
  const Icon = urgencyIcons[urgency];
  const colorClass = urgency === 'Urgent' ? 'text-red-500' : urgency === 'This Week' ? 'text-yellow-500' : 'text-zinc-400';

  return (
    <Card className="bg-zinc-900 border-zinc-800 flex flex-col h-fit">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <Icon className={cn('w-5 h-5', colorClass)} />
          {title}
          <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 ml-auto">
            {tasks.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        <Droppable droppableId={droppableId}>
          {(provided, snapshot) => (
            <ScrollArea className="h-[400px]">
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  "min-h-[350px] p-4 pt-0 transition-colors",
                  snapshot.isDraggingOver && "bg-zinc-800/30"
                )}
              >
                <div className="space-y-1">
                  {tasks.length === 0 && !snapshot.isDraggingOver ? (
                    <p className="text-zinc-500 text-sm text-center py-4">No tasks</p>
                  ) : (
                    tasks.map((task, index) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        index={index}
                        onComplete={onComplete}
                        onUpdate={onUpdate}
                        completingId={completingId}
                        onClick={() => onTaskClick(task)}
                        clients={clients}
                        teamMembers={teamMembers}
                        selectMode={selectMode}
                        isSelected={selectedIds.has(task.id)}
                        onToggleSelection={onToggleSelection}
                      />
                    ))
                  )}
                  {provided.placeholder}
                </div>
              </div>
            </ScrollArea>
          )}
        </Droppable>
      </CardContent>
    </Card>
  );
}

type ViewMode = 'kanban' | 'table';

// Task Table Row Component for table view
interface TaskTableRowProps {
  task: Task;
  completingId: string | null;
  reopeningId?: string | null;
  onComplete: (taskId: string) => void;
  onReopen?: (taskId: string) => void;
  onUpdate?: (taskId: string, updates: { task?: string; clientId?: string; assignedTo?: string; dueDate?: string }) => Promise<void>;
  onSubtaskToggle?: (taskId: string, subtaskId: string, completed: boolean) => void;
  onClick: () => void;
  showCompletedDate?: boolean;
  showSubtasks?: boolean;
  index?: number;
  isDraggable?: boolean;
  clients?: Client[];
  teamMembers?: TeamMember[];
  selectMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (taskId: string) => void;
}

type EditingField = 'task' | 'client' | 'assignedTo' | 'dueDate' | null;

function TaskTableRow({ task, completingId, reopeningId, onComplete, onReopen, onUpdate, onSubtaskToggle, onClick, showCompletedDate, showSubtasks, index = 0, isDraggable = false, clients = [], teamMembers = [], selectMode = false, isSelected = false, onToggleSelection }: TaskTableRowProps) {
  const isCompleted = task.status === 'Complete';
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle row click with delay to allow double-click to cancel
  const handleRowClick = (e: React.MouseEvent) => {
    // If already editing, don't open dialog
    if (editingField) return;

    // Clear any existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    // Set timeout to open dialog after delay (allows double-click to cancel)
    clickTimeoutRef.current = setTimeout(() => {
      onClick();
    }, 200);
  };

  const handleDoubleClick = (e: React.MouseEvent, field: EditingField) => {
    if (isCompleted) return;
    e.stopPropagation();

    // Cancel the single-click timeout so dialog doesn't open
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }

    setEditingField(field);
    switch (field) {
      case 'task':
        setEditValue(task.task);
        break;
      case 'dueDate':
        setEditValue(task.dueDate || '');
        break;
      default:
        setEditValue('');
    }
  };

  const handleSave = async (field: EditingField, value: string) => {
    if (!onUpdate) {
      setEditingField(null);
      return;
    }

    const updates: { task?: string; clientId?: string; assigneeId?: string; dueDate?: string } = {};

    switch (field) {
      case 'task':
        if (!value.trim() || value === task.task) {
          setEditingField(null);
          return;
        }
        updates.task = value.trim();
        break;
      case 'client':
        if (value === (task.clientId || 'none')) {
          setEditingField(null);
          return;
        }
        updates.clientId = value === 'none' ? undefined : value;
        break;
      case 'assignedTo':
        // Compare with assigneeId (new) or look up by name (legacy)
        const currentAssigneeId = task.assigneeId || '';
        if (value === currentAssigneeId) {
          setEditingField(null);
          return;
        }
        // Use assigneeId for relation-based assignment
        updates.assigneeId = value || undefined;
        break;
      case 'dueDate':
        if (value === (task.dueDate || '')) {
          setEditingField(null);
          return;
        }
        updates.dueDate = value || undefined;
        break;
    }

    setIsSaving(true);
    try {
      await onUpdate(task.id, updates);
      setEditingField(null);
    } catch {
      setEditingField(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave(editingField, editValue);
    } else if (e.key === 'Escape') {
      setEditingField(null);
    }
  };

  const rowContent = (provided?: { innerRef: (element: HTMLElement | null) => void; draggableProps: object; dragHandleProps: object | null }, snapshot?: { isDragging: boolean }) => (
    <>
      <TableRow
        ref={provided?.innerRef}
        {...(provided?.draggableProps || {})}
        className={cn(
          "border-zinc-800 cursor-pointer hover:bg-zinc-800/50",
          snapshot?.isDragging && "bg-zinc-800 shadow-lg"
        )}
        onClick={handleRowClick}
      >
        <TableCell onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            {selectMode && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelection?.(task.id)}
                className="border-zinc-600"
              />
            )}
            {isDraggable && !selectMode && (
              <div {...(provided?.dragHandleProps || {})} className="cursor-grab">
                <GripVertical className="w-4 h-4 text-zinc-500" />
              </div>
            )}
            {showSubtasks && hasSubtasks && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
              >
                <ChevronRight className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-90")} />
              </Button>
            )}
            {(completingId === task.id || reopeningId === task.id) ? (
              <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
            ) : (
              <Checkbox
                className="border-zinc-600"
                checked={isCompleted}
                onCheckedChange={() => {
                  if (isCompleted && onReopen) {
                    onReopen(task.id);
                  } else {
                    onComplete(task.id);
                  }
                }}
              />
            )}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {editingField === 'task' ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleSave('task', editValue)}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                disabled={isSaving}
                className="text-sm font-medium bg-zinc-800 border border-zinc-600 rounded px-2 py-0.5 text-white w-full focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
            ) : (
              <span
                className={cn(
                  'text-sm font-medium',
                  isCompleted ? 'text-zinc-500 line-through' : 'text-white cursor-text'
                )}
                onDoubleClick={(e) => handleDoubleClick(e, 'task')}
                title={task.task}
              >
                {summarizeTaskTitle(task.task, 60)}
              </span>
            )}
            {hasSubtasks && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 bg-zinc-700/50 text-zinc-400 border-zinc-600 shrink-0"
              >
                {task.subtasks!.filter(s => s.completed).length}/{task.subtasks!.length}
              </Badge>
            )}
            {task.recurringTemplateId && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 bg-blue-500/10 text-blue-400 border-blue-500/20 shrink-0"
              >
                <RefreshCw className="w-2.5 h-2.5 mr-1" />
                Cadence
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell>
          {editingField === 'client' ? (
            <div onClick={(e) => e.stopPropagation()}>
              <Select
                defaultValue={task.clientId || 'none'}
                onValueChange={(value) => {
                  handleSave('client', value);
                }}
              >
                <SelectTrigger className="w-[140px] h-7 text-xs bg-zinc-800 border-zinc-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="none">No client</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <span
              className={cn(
                'text-zinc-400 text-sm',
                !isCompleted && 'cursor-pointer hover:text-zinc-300'
              )}
              onDoubleClick={(e) => handleDoubleClick(e, 'client')}
              title="Double-click to edit"
            >
              {task.clientName || '-'}
            </span>
          )}
        </TableCell>
        <TableCell>
          {editingField === 'assignedTo' ? (
            <div onClick={(e) => e.stopPropagation()}>
              <Select
                defaultValue={task.assigneeId || teamMembers.find(m => m.name === task.assignedTo)?.id || 'none'}
                onValueChange={(value) => {
                  handleSave('assignedTo', value === 'none' ? '' : value);
                }}
              >
                <SelectTrigger className="w-[140px] h-7 text-xs bg-zinc-800 border-zinc-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="none">Unassigned</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <span
              className={cn(
                'text-zinc-400 text-sm',
                !isCompleted && 'cursor-pointer hover:text-zinc-300'
              )}
              onDoubleClick={(e) => handleDoubleClick(e, 'assignedTo')}
              title="Double-click to edit"
            >
              {task.assignedTo || teamMembers.find(m => m.id === task.assigneeId)?.name || '-'}
            </span>
          )}
        </TableCell>
        <TableCell>
          {showCompletedDate ? (
            <span className="text-zinc-400 text-sm">
              {task.completedDate
                ? new Date(task.completedDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : '-'}
            </span>
          ) : editingField === 'dueDate' ? (
            <input
              type="date"
              defaultValue={task.dueDate || ''}
              onChange={(e) => handleSave('dueDate', e.target.value)}
              onBlur={() => setEditingField(null)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="text-sm bg-zinc-800 border border-zinc-600 rounded px-2 py-0.5 text-white focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          ) : (
            <span
              className={cn(
                'text-zinc-400 text-sm',
                !isCompleted && 'cursor-pointer hover:text-zinc-300'
              )}
              onDoubleClick={(e) => handleDoubleClick(e, 'dueDate')}
              title="Double-click to edit"
            >
              {task.dueDate
                ? new Date(task.dueDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : '-'}
            </span>
          )}
        </TableCell>
        <TableCell>
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              task.status === 'Complete'
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : task.status === 'In Progress'
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
            )}
          >
            {task.status}
          </Badge>
        </TableCell>
      </TableRow>
      {/* Subtask rows when expanded */}
      {showSubtasks && isExpanded && hasSubtasks && task.subtasks!.map((subtask) => (
        <TableRow key={subtask.id} className="border-zinc-800/50 bg-zinc-900/50">
          <TableCell onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1 pl-6">
              <Checkbox
                className="border-zinc-600"
                checked={subtask.completed}
                onCheckedChange={(checked) => {
                  if (onSubtaskToggle) {
                    onSubtaskToggle(task.id, subtask.id, !!checked);
                  }
                }}
              />
            </div>
          </TableCell>
          <TableCell colSpan={5}>
            <span className={cn(
              'text-sm pl-2',
              subtask.completed ? 'text-zinc-500 line-through' : 'text-zinc-300'
            )}>
              {subtask.title}
            </span>
          </TableCell>
        </TableRow>
      ))}
    </>
  );

  if (!isDraggable) {
    return rowContent();
  }

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => rowContent(provided, snapshot)}
    </Draggable>
  );
}

// Main TasksView Component
export function TasksView({ urgent, thisWeek, thisMonth, completed, clients, teamMembers, isAdmin = false, currentUserId, currentUserName }: TasksViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [urgentTasks, setUrgentTasks] = useState(urgent);
  const [thisWeekTasks, setThisWeekTasks] = useState(thisWeek);
  const [thisMonthTasks, setThisMonthTasks] = useState(thisMonth);
  const [completedTasks, setCompletedTasks] = useState(completed);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [reopeningId, setReopeningId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Auto-open task detail when highlightId is provided
  useEffect(() => {
    if (highlightId) {
      // Find the task with this ID across all lists
      const allTasks = [...urgent, ...thisWeek, ...thisMonth, ...completed];
      const task = allTasks.find(t => t.id === highlightId);
      if (task) {
        setSelectedTask(task);
        setDetailDialogOpen(true);
        // Clear highlight from URL to prevent re-opening on refresh
        router.replace('/tasks', { scroll: false });
      } else {
        // Task not in local data (might be Backlog or filtered out), fetch it
        fetch(`/api/tasks/${highlightId}`)
          .then(res => res.ok ? res.json() : null)
          .then(fetchedTask => {
            if (fetchedTask) {
              setSelectedTask(fetchedTask);
              setDetailDialogOpen(true);
              // Clear highlight from URL to prevent re-opening on refresh
              router.replace('/tasks', { scroll: false });
            }
          })
          .catch(console.error);
      }
    }
  }, [highlightId, urgent, thisWeek, thisMonth, completed, router]);
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [teamMemberFilter, setTeamMemberFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Multi-select handlers
  const toggleSelection = useCallback((taskId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  const selectAllTasks = useCallback(() => {
    const allIds = [
      ...urgentTasks.map(t => t.id),
      ...thisWeekTasks.map(t => t.id),
      ...thisMonthTasks.map(t => t.id),
      ...completedTasks.map(t => t.id),
    ];
    setSelectedIds(new Set(allIds));
  }, [urgentTasks, thisWeekTasks, thisMonthTasks, completedTasks]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/tasks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete tasks');
      }

      const result = await response.json();
      toast.success(`Deleted ${result.deleted} task${result.deleted !== 1 ? 's' : ''}`);
      router.refresh();

      // Remove deleted tasks from local state
      const idsToRemove = selectedIds;
      setUrgentTasks(prev => prev.filter(t => !idsToRemove.has(t.id)));
      setThisWeekTasks(prev => prev.filter(t => !idsToRemove.has(t.id)));
      setThisMonthTasks(prev => prev.filter(t => !idsToRemove.has(t.id)));
      setCompletedTasks(prev => prev.filter(t => !idsToRemove.has(t.id)));

      setDeleteConfirmOpen(false);
      setSelectedIds(new Set());
      setSelectMode(false);
    } catch (error) {
      toast.error('Failed to delete tasks');
      console.error('Error deleting tasks:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [selectedIds]);

  // Filter tasks by client and team member
  const filterTasks = (tasks: Task[]) => {
    let filtered = tasks;

    // Filter by client
    if (clientFilter !== 'all') {
      if (clientFilter === 'unassigned') {
        filtered = filtered.filter(t => !t.clientId);
      } else {
        filtered = filtered.filter(t => t.clientId === clientFilter);
      }
    }

    // Filter by team member
    if (teamMemberFilter !== 'all') {
      if (teamMemberFilter === 'unassigned') {
        // Task is unassigned if neither assignedTo nor assigneeId is set
        filtered = filtered.filter(t => !t.assignedTo && !t.assigneeId);
      } else {
        // Match by assigneeId (new relation) OR by assignedTo name (legacy people field)
        const selectedMember = teamMembers.find(m => m.id === teamMemberFilter);
        if (selectedMember) {
          filtered = filtered.filter(t =>
            t.assigneeId === teamMemberFilter || // Match by assigneeId (Team Member database ID)
            t.assignedTo === selectedMember.name // Match by assignedTo (legacy name from People field)
          );
        }
      }
    }

    return filtered;
  };

  const filteredUrgent = filterTasks(urgentTasks);
  const filteredThisWeek = filterTasks(thisWeekTasks);
  const filteredThisMonth = filterTasks(thisMonthTasks);
  const filteredCompleted = filterTasks(completedTasks);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDetailDialogOpen(true);
  };

  const handleComplete = async (taskId: string) => {
    setCompletingId(taskId);

    // Find the task first before any state updates
    const taskFromUrgent = urgentTasks.find((t) => t.id === taskId);
    const taskFromThisWeek = thisWeekTasks.find((t) => t.id === taskId);
    const taskFromThisMonth = thisMonthTasks.find((t) => t.id === taskId);
    const originalTask = taskFromUrgent || taskFromThisWeek || taskFromThisMonth;

    if (!originalTask) {
      setCompletingId(null);
      toast.error('Task not found');
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Complete' }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete task');
      }

      // Create the completed task with updated status and date
      const completedTask: Task = {
        ...originalTask,
        status: 'Complete' as TaskStatus,
        completedDate: new Date().toISOString(),
      };

      // Remove from source list and add to completed
      if (taskFromUrgent) {
        setUrgentTasks((prev) => prev.filter((t) => t.id !== taskId));
      } else if (taskFromThisWeek) {
        setThisWeekTasks((prev) => prev.filter((t) => t.id !== taskId));
      } else if (taskFromThisMonth) {
        setThisMonthTasks((prev) => prev.filter((t) => t.id !== taskId));
      }

      // Add to completed list at the beginning
      setCompletedTasks((prev) => [completedTask, ...prev]);

      toast.success('Task completed');
      router.refresh();
    } catch (error) {
      toast.error('Failed to complete task');
      console.error('Error completing task:', error);
    } finally {
      setCompletingId(null);
    }
  };

  const handleTaskCreated = (task: Task) => {
    // Add to appropriate list based on urgency
    const taskWithDefaults: Task = {
      ...task,
      task: task.task || '',
      status: task.status || 'To Do',
      urgency: task.urgency || 'This Week',
      createdAt: task.createdAt || new Date().toISOString(),
    };

    switch (taskWithDefaults.urgency) {
      case 'Urgent':
        setUrgentTasks((prev) => [taskWithDefaults, ...prev]);
        break;
      case 'This Week':
        setThisWeekTasks((prev) => [taskWithDefaults, ...prev]);
        break;
      case 'This Month':
        setThisMonthTasks((prev) => [taskWithDefaults, ...prev]);
        break;
    }
  };

  // Handle reopening a completed task
  const handleReopen = async (taskId: string) => {
    setReopeningId(taskId);

    try {
      // Find the task to get its original urgency
      const task = completedTasks.find(t => t.id === taskId);
      if (!task) return;

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'To Do' }),
      });

      if (!response.ok) {
        throw new Error('Failed to reopen task');
      }

      // Remove from completed and add to appropriate urgency list
      const reopenedTask = { ...task, status: 'To Do' as TaskStatus, completedDate: undefined };
      setCompletedTasks(prev => prev.filter(t => t.id !== taskId));

      switch (task.urgency) {
        case 'Urgent':
          setUrgentTasks(prev => [reopenedTask, ...prev]);
          break;
        case 'This Week':
          setThisWeekTasks(prev => [reopenedTask, ...prev]);
          break;
        case 'This Month':
          setThisMonthTasks(prev => [reopenedTask, ...prev]);
          break;
      }

      toast.success('Task reopened');
      router.refresh();
    } catch (error) {
      toast.error('Failed to reopen task');
      console.error('Error reopening task:', error);
    } finally {
      setReopeningId(null);
    }
  };

  // Handle drag and drop between urgency columns
  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Dropped outside a droppable area
    if (!destination) return;

    // Dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Find the task being dragged
    let draggedTask: Task | undefined;
    const getTasksAndSetter = (urgency: string) => {
      switch (urgency) {
        case 'Urgent':
          return { tasks: urgentTasks, setTasks: setUrgentTasks };
        case 'This Week':
          return { tasks: thisWeekTasks, setTasks: setThisWeekTasks };
        case 'This Month':
          return { tasks: thisMonthTasks, setTasks: setThisMonthTasks };
        default:
          return null;
      }
    };

    const sourceData = getTasksAndSetter(source.droppableId);
    const destData = getTasksAndSetter(destination.droppableId);

    if (!sourceData || !destData) return;

    draggedTask = sourceData.tasks.find(t => t.id === draggableId);
    if (!draggedTask) return;

    // Optimistic update - move task immediately
    const newUrgency = destination.droppableId as TaskUrgency;
    const updatedTask = { ...draggedTask, urgency: newUrgency };

    // Remove from source
    sourceData.setTasks(prev => prev.filter(t => t.id !== draggableId));

    // Add to destination
    destData.setTasks(prev => {
      const newTasks = [...prev];
      newTasks.splice(destination.index, 0, updatedTask);
      return newTasks;
    });

    // Update in database if urgency changed
    if (source.droppableId !== destination.droppableId) {
      setUpdatingId(draggableId);
      try {
        const response = await fetch(`/api/tasks/${draggableId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urgency: newUrgency }),
        });

        if (!response.ok) {
          throw new Error('Failed to update task urgency');
        }

        toast.success(`Moved to ${newUrgency}`);
        router.refresh();
      } catch (error) {
        // Revert on error
        sourceData.setTasks(prev => {
          const newTasks = [...prev];
          newTasks.splice(source.index, 0, draggedTask!);
          return newTasks;
        });
        destData.setTasks(prev => prev.filter(t => t.id !== draggableId));
        toast.error('Failed to move task');
        console.error('Error updating task urgency:', error);
      } finally {
        setUpdatingId(null);
      }
    }
  }, [urgentTasks, thisWeekTasks, thisMonthTasks]);

  // Handle inline task update (title, client, assignedTo, dueDate)
  const handleInlineUpdate = useCallback(async (taskId: string, updates: { task?: string; clientId?: string; assignedTo?: string; dueDate?: string }) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      // Get the updated client name if clientId was updated
      let clientName: string | undefined;
      if (updates.clientId !== undefined) {
        clientName = updates.clientId ? clients.find(c => c.id === updates.clientId)?.name : undefined;
      }

      // Update in the appropriate list
      const updateTask = (prev: Task[]) =>
        prev.map(t => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            ...updates,
            ...(clientName !== undefined ? { clientName } : {}),
          };
        });

      setUrgentTasks(updateTask);
      setThisWeekTasks(updateTask);
      setThisMonthTasks(updateTask);
      setCompletedTasks(updateTask);

      toast.success('Task updated');
      router.refresh();
    } catch (error) {
      toast.error('Failed to update task');
      console.error('Error updating task:', error);
      throw error;
    }
  }, [clients]);

  // Handle subtask toggle (just updates local state, doesn't move to completed)
  const handleSubtaskToggle = useCallback((taskId: string, subtaskId: string, completed: boolean) => {
    const updateTask = (prev: Task[]) =>
      prev.map(t => {
        if (t.id !== taskId || !t.subtasks) return t;
        return {
          ...t,
          subtasks: t.subtasks.map(s =>
            s.id === subtaskId ? { ...s, completed } : s
          ),
        };
      });

    setUrgentTasks(updateTask);
    setThisWeekTasks(updateTask);
    setThisMonthTasks(updateTask);
    setCompletedTasks(updateTask);
  }, []);

  // Combine all tasks for table view
  const allTasks = [...filteredUrgent, ...filteredThisWeek, ...filteredThisMonth, ...filteredCompleted];

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        {/* Filters */}
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="bg-zinc-800 border border-zinc-700">
              <TabsTrigger value="kanban" className="gap-1.5 data-[state=active]:bg-zinc-600">
                <LayoutGrid className="w-4 h-4" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="table" className="gap-1.5 data-[state=active]:bg-zinc-600">
                <List className="w-4 h-4" />
                Table
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Client Filter */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-zinc-400" />
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-[180px] bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Filter by client..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="all">All Clients</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {clientFilter !== 'all' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setClientFilter('all')}
                className="text-zinc-400 hover:text-white h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Team Member Filter */}
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-zinc-400" />
            <Select value={teamMemberFilter} onValueChange={setTeamMemberFilter}>
              <SelectTrigger className="w-[180px] bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Filter by assignee..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="all">All Team Members</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {teamMemberFilter !== 'all' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTeamMemberFilter('all')}
                className="text-zinc-400 hover:text-white h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Multi-select controls */}
          {selectMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllTasks}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exitSelectMode}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Exit Select
              </Button>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete ({selectedIds.size})
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectMode(true)}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Select
            </Button>
          )}

          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Task
          </Button>
        </div>
      </div>

      {/* Kanban View with Drag and Drop */}
      {viewMode === 'kanban' && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            <TaskSection
              title="Urgent (48hrs)"
              tasks={filteredUrgent}
              urgency="Urgent"
              droppableId="Urgent"
              onComplete={handleComplete}
              onUpdate={handleInlineUpdate}
              completingId={completingId}
              onTaskClick={handleTaskClick}
              clients={clients}
              teamMembers={teamMembers}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelection={toggleSelection}
            />
            <TaskSection
              title="This Week"
              tasks={filteredThisWeek}
              urgency="This Week"
              droppableId="This Week"
              onComplete={handleComplete}
              onUpdate={handleInlineUpdate}
              completingId={completingId}
              onTaskClick={handleTaskClick}
              clients={clients}
              teamMembers={teamMembers}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelection={toggleSelection}
            />
            <TaskSection
              title="This Month"
              tasks={filteredThisMonth}
              urgency="This Month"
              droppableId="This Month"
              onComplete={handleComplete}
              onUpdate={handleInlineUpdate}
              completingId={completingId}
              onTaskClick={handleTaskClick}
              clients={clients}
              teamMembers={teamMembers}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelection={toggleSelection}
            />

            {/* Completed Section - not droppable, but allows reopening tasks */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Completed
                  <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 ml-auto">
                    {filteredCompleted.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[350px]">
                  <div className="space-y-1 p-4 pt-0">
                    {filteredCompleted.length === 0 ? (
                      <p className="text-zinc-500 text-sm text-center py-4">No completed tasks</p>
                    ) : (
                      filteredCompleted.map((task, index) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          index={index}
                          onComplete={handleComplete}
                          onReopen={handleReopen}
                          completingId={completingId}
                          reopeningId={reopeningId}
                          onClick={() => handleTaskClick(task)}
                          isDraggable={false}
                          isCompleted={true}
                          clients={clients}
                          teamMembers={teamMembers}
                          selectMode={selectMode}
                          isSelected={selectedIds.has(task.id)}
                          onToggleSelection={toggleSelection}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </DragDropContext>
      )}

      {/* Table View - Divided by Urgency */}
      {viewMode === 'table' && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="space-y-6">
            {/* Urgent Section */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-0 pt-4">
                <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Urgent (48hrs)
                  <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 ml-2">
                    {filteredUrgent.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-2">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="w-[60px]"></TableHead>
                      <TableHead className="text-zinc-400">Task</TableHead>
                      <TableHead className="text-zinc-400">Client</TableHead>
                      <TableHead className="text-zinc-400">Assigned To</TableHead>
                      <TableHead className="text-zinc-400">Due Date</TableHead>
                      <TableHead className="text-zinc-400">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <Droppable droppableId="Urgent" type="TABLE_ROW">
                    {(provided, snapshot) => (
                      <TableBody
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(snapshot.isDraggingOver && "bg-zinc-800/30")}
                      >
                        {filteredUrgent.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-zinc-500 py-8">
                              No urgent tasks
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUrgent.map((task, index) => (
                            <TaskTableRow
                              key={task.id}
                              task={task}
                              index={index}
                              completingId={completingId}
                              onComplete={handleComplete}
                              onUpdate={handleInlineUpdate}
                              onSubtaskToggle={handleSubtaskToggle}
                              onClick={() => handleTaskClick(task)}
                              showSubtasks
                              isDraggable
                              clients={clients}
                              teamMembers={teamMembers}
                              selectMode={selectMode}
                              isSelected={selectedIds.has(task.id)}
                              onToggleSelection={toggleSelection}
                            />
                          ))
                        )}
                        {provided.placeholder}
                      </TableBody>
                    )}
                  </Droppable>
                </Table>
              </CardContent>
            </Card>

            {/* This Week Section */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-0 pt-4">
                <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  This Week
                  <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 ml-2">
                    {filteredThisWeek.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-2">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="w-[60px]"></TableHead>
                      <TableHead className="text-zinc-400">Task</TableHead>
                      <TableHead className="text-zinc-400">Client</TableHead>
                      <TableHead className="text-zinc-400">Assigned To</TableHead>
                      <TableHead className="text-zinc-400">Due Date</TableHead>
                      <TableHead className="text-zinc-400">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <Droppable droppableId="This Week" type="TABLE_ROW">
                    {(provided, snapshot) => (
                      <TableBody
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(snapshot.isDraggingOver && "bg-zinc-800/30")}
                      >
                        {filteredThisWeek.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-zinc-500 py-8">
                              No tasks this week
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredThisWeek.map((task, index) => (
                            <TaskTableRow
                              key={task.id}
                              task={task}
                              index={index}
                              completingId={completingId}
                              onComplete={handleComplete}
                              onUpdate={handleInlineUpdate}
                              onSubtaskToggle={handleSubtaskToggle}
                              onClick={() => handleTaskClick(task)}
                              showSubtasks
                              isDraggable
                              clients={clients}
                              teamMembers={teamMembers}
                              selectMode={selectMode}
                              isSelected={selectedIds.has(task.id)}
                              onToggleSelection={toggleSelection}
                            />
                          ))
                        )}
                        {provided.placeholder}
                      </TableBody>
                    )}
                  </Droppable>
                </Table>
              </CardContent>
            </Card>

            {/* This Month Section */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-0 pt-4">
                <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-zinc-400" />
                  This Month
                  <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 ml-2">
                    {filteredThisMonth.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-2">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="w-[60px]"></TableHead>
                      <TableHead className="text-zinc-400">Task</TableHead>
                      <TableHead className="text-zinc-400">Client</TableHead>
                      <TableHead className="text-zinc-400">Assigned To</TableHead>
                      <TableHead className="text-zinc-400">Due Date</TableHead>
                      <TableHead className="text-zinc-400">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <Droppable droppableId="This Month" type="TABLE_ROW">
                    {(provided, snapshot) => (
                      <TableBody
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(snapshot.isDraggingOver && "bg-zinc-800/30")}
                      >
                        {filteredThisMonth.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-zinc-500 py-8">
                              No tasks this month
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredThisMonth.map((task, index) => (
                            <TaskTableRow
                              key={task.id}
                              task={task}
                              index={index}
                              completingId={completingId}
                              onComplete={handleComplete}
                              onUpdate={handleInlineUpdate}
                              onSubtaskToggle={handleSubtaskToggle}
                              onClick={() => handleTaskClick(task)}
                              showSubtasks
                              isDraggable
                              clients={clients}
                              teamMembers={teamMembers}
                              selectMode={selectMode}
                              isSelected={selectedIds.has(task.id)}
                              onToggleSelection={toggleSelection}
                            />
                          ))
                        )}
                        {provided.placeholder}
                      </TableBody>
                    )}
                  </Droppable>
                </Table>
              </CardContent>
            </Card>

            {/* Completed Section - Not draggable */}
            {filteredCompleted.length > 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-0 pt-4">
                  <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Completed
                    <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 ml-2">
                      {filteredCompleted.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 pt-2">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800 hover:bg-transparent">
                        <TableHead className="w-[60px]"></TableHead>
                        <TableHead className="text-zinc-400">Task</TableHead>
                        <TableHead className="text-zinc-400">Client</TableHead>
                        <TableHead className="text-zinc-400">Assigned To</TableHead>
                        <TableHead className="text-zinc-400">Completed</TableHead>
                        <TableHead className="text-zinc-400">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCompleted.map((task) => (
                        <TaskTableRow
                          key={task.id}
                          task={task}
                          completingId={completingId}
                          reopeningId={reopeningId}
                          onComplete={handleComplete}
                          onReopen={handleReopen}
                          onSubtaskToggle={handleSubtaskToggle}
                          onClick={() => handleTaskClick(task)}
                          showCompletedDate
                          showSubtasks
                          clients={clients}
                          teamMembers={teamMembers}
                          selectMode={selectMode}
                          isSelected={selectedIds.has(task.id)}
                          onToggleSelection={toggleSelection}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {allTasks.length === 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="py-8">
                  <p className="text-center text-zinc-500">No tasks found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </DragDropContext>
      )}

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        clients={clients}
        onTaskCreated={handleTaskCreated}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
      />

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        clients={clients}
        teamMembers={teamMembers}
        onTaskUpdated={(updatedTask) => {
          // Update task in the correct list
          const updateInList = (list: Task[], setList: React.Dispatch<React.SetStateAction<Task[]>>) => {
            const index = list.findIndex(t => t.id === updatedTask.id);
            if (index !== -1) {
              // Task found in this list
              const oldTask = list[index];

              // If urgency changed, we need to move it to a different list
              if (oldTask.urgency !== updatedTask.urgency) {
                // Remove from current list
                setList(prev => prev.filter(t => t.id !== updatedTask.id));

                // Add to new list based on new urgency
                switch (updatedTask.urgency) {
                  case 'Urgent':
                    setUrgentTasks(prev => [updatedTask, ...prev]);
                    break;
                  case 'This Week':
                    setThisWeekTasks(prev => [updatedTask, ...prev]);
                    break;
                  case 'This Month':
                    setThisMonthTasks(prev => [updatedTask, ...prev]);
                    break;
                }
              } else {
                // Just update in place
                setList(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
              }
              return true;
            }
            return false;
          };

          // Try to update in each list
          if (!updateInList(urgentTasks, setUrgentTasks)) {
            if (!updateInList(thisWeekTasks, setThisWeekTasks)) {
              if (!updateInList(thisMonthTasks, setThisMonthTasks)) {
                updateInList(completedTasks, setCompletedTasks);
              }
            }
          }

          // Update selected task for the dialog
          setSelectedTask(updatedTask);
        }}
        onTaskCompleted={handleComplete}
        onTaskDeleted={(taskId) => {
          // Remove task from all lists
          setUrgentTasks(prev => prev.filter(t => t.id !== taskId));
          setThisWeekTasks(prev => prev.filter(t => t.id !== taskId));
          setThisMonthTasks(prev => prev.filter(t => t.id !== taskId));
          setCompletedTasks(prev => prev.filter(t => t.id !== taskId));
        }}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete {selectedIds.size} task{selectedIds.size !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This action cannot be undone. The selected task{selectedIds.size !== 1 ? 's' : ''} will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
