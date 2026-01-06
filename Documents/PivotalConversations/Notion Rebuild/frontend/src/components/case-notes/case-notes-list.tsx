'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { MessageSquare, Mail, Phone, PenLine, CheckSquare, Loader2, Check, Trash2, MoreHorizontal, User } from 'lucide-react';
import { CaseNote, Client, CaseNoteSource, CaseNoteType, TaskUrgency } from '@/types';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

interface CaseNotesListProps {
  notes: CaseNote[];
  clients: Client[];
}

const sourceIcons: Record<CaseNoteSource, typeof MessageSquare> = {
  'Slack': MessageSquare,
  'Email': Mail,
  'Call': Phone,
  'Manual': PenLine,
};

const sourceColors: Record<CaseNoteSource, string> = {
  'Slack': 'bg-purple-500/10 text-purple-500',
  'Email': 'bg-blue-500/10 text-blue-500',
  'Call': 'bg-green-500/10 text-green-500',
  'Manual': 'bg-zinc-500/10 text-zinc-400',
};

const typeColors: Record<CaseNoteType, string> = {
  'Internal Note': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'Client Request': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  'Editing Guideline': 'bg-green-500/10 text-green-500 border-green-500/20',
};

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseNote: CaseNote | null;
  onTaskCreated: (caseNoteId: string) => void;
}

function CreateTaskDialog({ open, onOpenChange, caseNote, onTaskCreated }: CreateTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [urgency, setUrgency] = useState<TaskUrgency>('This Week');
  const [dueDate, setDueDate] = useState('');
  const [assignee, setAssignee] = useState<string>('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);

  // Fetch team members when dialog opens
  useEffect(() => {
    if (open && teamMembers.length === 0) {
      setIsLoadingTeam(true);
      fetch('/api/team')
        .then(res => res.json())
        .then(data => {
          if (data.members) {
            setTeamMembers(data.members);
          }
        })
        .catch(err => console.error('Failed to fetch team members:', err))
        .finally(() => setIsLoadingTeam(false));
    }
  }, [open, teamMembers.length]);

  // Set default title from case note
  const handleOpen = () => {
    if (caseNote) {
      setTitle(caseNote.title);
    }
  };

  const handleCreate = async () => {
    if (!caseNote || !title.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          clientId: caseNote.clientId,
          urgency,
          dueDate: dueDate || undefined,
          description: caseNote.fullNote,
          caseNoteId: caseNote.id,
          assignee: assignee && assignee !== 'unassigned' ? assignee : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      toast.success('Task created successfully');
      onTaskCreated(caseNote.id);
      onOpenChange(false);

      // Reset form
      setTitle('');
      setUrgency('This Week');
      setDueDate('');
      setAssignee('');
    } catch (error) {
      toast.error('Failed to create task');
      console.error('Error creating task:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800" onOpenAutoFocus={handleOpen}>
        <DialogHeader>
          <DialogTitle className="text-white">Create Task from Case Note</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Source Case Note Preview */}
          {caseNote && (
            <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
              <p className="text-xs text-zinc-500 mb-1">Source Note</p>
              <p className="text-sm text-zinc-300 line-clamp-2">{caseNote.fullNote}</p>
            </div>
          )}

          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-zinc-300">Task Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Assign To (Optional)</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder={isLoadingTeam ? "Loading team..." : "Select team member"} />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="unassigned" className="text-zinc-400">
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Unassigned
                  </span>
                </SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.name} className="text-zinc-300">
                    <span className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {member.name}
                      <span className="text-xs text-zinc-500">({member.roles.join(', ')})</span>
                    </span>
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
                <CheckSquare className="w-4 h-4" />
                Create Task
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CaseNotesList({ notes, clients }: CaseNotesListProps) {
  const [caseNotes, setCaseNotes] = useState(notes);
  const [selectedNote, setSelectedNote] = useState<CaseNote | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<CaseNote | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createdTaskNotes, setCreatedTaskNotes] = useState<Set<string>>(new Set());

  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.name || 'Unknown';
  };

  const handleCreateTask = (note: CaseNote) => {
    setSelectedNote(note);
    setDialogOpen(true);
  };

  const handleTaskCreated = (caseNoteId: string) => {
    setCreatedTaskNotes((prev) => new Set(prev).add(caseNoteId));
  };

  const handleDeleteNote = async () => {
    if (!noteToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/case-notes/${noteToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete case note');
      }

      setCaseNotes((prev) => prev.filter((n) => n.id !== noteToDelete.id));
      toast.success('Case note deleted');
      setDeleteDialogOpen(false);
      setNoteToDelete(null);
    } catch (error) {
      toast.error('Failed to delete case note');
      console.error('Error deleting case note:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (caseNotes.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-8 text-center">
          <p className="text-zinc-500">No case notes found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="divide-y divide-zinc-800">
              {caseNotes.map((note) => {
                const SourceIcon = sourceIcons[note.source];
                const hasExistingTask = (note.taskIds && note.taskIds.length > 0) || createdTaskNotes.has(note.id);

                return (
                  <div
                    key={note.id}
                    className="p-4 hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex gap-4">
                      {/* Source Icon */}
                      <div className={cn('p-2 rounded-lg h-fit', sourceColors[note.source])}>
                        <SourceIcon className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="text-sm font-medium text-white">{note.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-zinc-500">
                                {getClientName(note.clientId)}
                              </span>
                              <span className="text-zinc-600">•</span>
                              <span className="text-xs text-zinc-500">
                                {new Date(note.date).toLocaleDateString()}
                              </span>
                              {note.createdBy && (
                                <>
                                  <span className="text-zinc-600">•</span>
                                  <span className="text-xs text-zinc-500">by {note.createdBy}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn('text-xs', typeColors[note.type])}
                            >
                              {note.type}
                            </Badge>
                            {note.autoGenerated && (
                              <Badge variant="outline" className="text-xs bg-zinc-800 text-zinc-500">
                                Auto
                              </Badge>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-zinc-800 border-zinc-700">
                                {!hasExistingTask && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleCreateTask(note)}
                                      className="text-zinc-300"
                                    >
                                      <CheckSquare className="w-4 h-4 mr-2" />
                                      Create Task
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-zinc-700" />
                                  </>
                                )}
                                <DropdownMenuItem
                                  onClick={() => {
                                    setNoteToDelete(note);
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="text-red-400 focus:text-red-400"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Note Content */}
                        <p className="text-sm text-zinc-400 mb-3 whitespace-pre-wrap">
                          {note.fullNote}
                        </p>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {hasExistingTask ? (
                            <div className="flex items-center gap-2 text-green-500">
                              <Check className="w-4 h-4" />
                              <span className="text-xs">
                                {createdTaskNotes.has(note.id)
                                  ? 'Task created'
                                  : `${note.taskIds?.length} task(s) linked`}
                              </span>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => handleCreateTask(note)}
                            >
                              <CheckSquare className="w-3 h-3" />
                              Create Task
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <CreateTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        caseNote={selectedNote}
        onTaskCreated={handleTaskCreated}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Case Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{noteToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-zinc-700"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteNote}
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
