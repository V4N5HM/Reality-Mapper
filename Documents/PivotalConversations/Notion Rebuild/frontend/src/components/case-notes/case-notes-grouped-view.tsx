'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Mail,
  Phone,
  PenLine,
  CheckSquare,
  Loader2,
  Check,
  ChevronRight,
  Folder,
  FolderOpen,
  Video,
  ExternalLink,
  ListTodo,
  Plus,
  User,
  Trash2,
  X,
} from 'lucide-react';
import { CaseNote, CaseNoteSource, CaseNoteType, TaskUrgency } from '@/types';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

interface ActionItem {
  task: string;
  urgency: TaskUrgency;
  assignee?: string;
}

interface CaseNotesGroupedViewProps {
  notes: CaseNote[];
  onCreateTask?: (note: CaseNote) => Promise<void>;
  onCreateTaskFromActionItem?: (note: CaseNote, actionItem: string, urgency: TaskUrgency, assignee?: string) => Promise<void>;
}

interface MeetingFolder {
  id: string;
  title: string;
  date: string;
  notes: CaseNote[];
  transcriptUrl?: string;
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

export function CaseNotesGroupedView({ notes, onCreateTask, onCreateTaskFromActionItem }: CaseNotesGroupedViewProps) {
  const router = useRouter();
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [creatingTaskForNote, setCreatingTaskForNote] = useState<string | null>(null);
  const [creatingTaskForItem, setCreatingTaskForItem] = useState<string | null>(null); // "noteId:itemIndex"
  const [createdTaskNotes, setCreatedTaskNotes] = useState<Set<string>>(new Set());
  const [createdTaskItems, setCreatedTaskItems] = useState<Set<string>>(new Set()); // "noteId:itemIndex"

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Action item dialog state
  const [actionItemDialogOpen, setActionItemDialogOpen] = useState(false);
  const [selectedActionItem, setSelectedActionItem] = useState<{
    note: CaseNote;
    item: ActionItem;
    itemIndex: number;
  } | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskUrgency, setTaskUrgency] = useState<TaskUrgency>('This Week');
  const taskUrgencyRef = useRef<TaskUrgency>(taskUrgency);
  const [taskAssignee, setTaskAssignee] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Multi-select handlers
  const toggleSelection = (noteId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(notes.map(n => n.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/case-notes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete case notes');
      }

      const result = await response.json();
      toast.success(`Deleted ${result.deleted} case note${result.deleted !== 1 ? 's' : ''}`);

      setDeleteConfirmOpen(false);
      setSelectedIds(new Set());
      setSelectMode(false);
      router.refresh();
    } catch (error) {
      toast.error('Failed to delete case notes');
      console.error('Error deleting case notes:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Fetch team members when dialog opens
  useEffect(() => {
    if (actionItemDialogOpen && teamMembers.length === 0) {
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
  }, [actionItemDialogOpen, teamMembers.length]);

  // Separate meeting notes from other notes
  const meetingNotes = notes.filter(n => n.title.startsWith('[Meeting]') && n.source === 'Call');
  const otherNotes = notes.filter(n => !n.title.startsWith('[Meeting]') || n.source !== 'Call');

  // Group meeting notes by meeting (extract meeting title from note title)
  const meetingFolders: MeetingFolder[] = [];
  const meetingMap = new Map<string, MeetingFolder>();

  meetingNotes.forEach(note => {
    // Extract meeting title from "[Meeting] Meeting Title"
    const meetingTitle = note.title.replace('[Meeting] ', '');

    if (!meetingMap.has(meetingTitle)) {
      meetingMap.set(meetingTitle, {
        id: `meeting-${meetingTitle.toLowerCase().replace(/\s+/g, '-')}`,
        title: meetingTitle,
        date: note.date,
        notes: [],
        // Try to extract transcript URL from note content
        transcriptUrl: extractTranscriptUrl(note.fullNote),
      });
    }

    meetingMap.get(meetingTitle)!.notes.push(note);
  });

  // Sort meetings by date (most recent first)
  meetingFolders.push(...Array.from(meetingMap.values()).sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  ));

  // Group other notes by source
  const notesBySource = {
    slack: otherNotes.filter(n => n.source === 'Slack'),
    email: otherNotes.filter(n => n.source === 'Email'),
    call: otherNotes.filter(n => n.source === 'Call'),
    manual: otherNotes.filter(n => n.source === 'Manual'),
  };

  const toggleFolder = (folderId: string) => {
    setOpenFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleCreateTask = async (note: CaseNote) => {
    if (!onCreateTask) return;

    setCreatingTaskForNote(note.id);
    try {
      await onCreateTask(note);
      setCreatedTaskNotes(prev => new Set(prev).add(note.id));
      toast.success('Task created from case note');
    } catch {
      toast.error('Failed to create task');
    } finally {
      setCreatingTaskForNote(null);
    }
  };

  const handleOpenActionItemDialog = (note: CaseNote, item: ActionItem, itemIndex: number) => {
    if (!onCreateTaskFromActionItem) return;

    setSelectedActionItem({ note, item, itemIndex });
    setTaskTitle(item.task);
    setTaskUrgency(item.urgency);
    taskUrgencyRef.current = item.urgency;
    setTaskAssignee(item.assignee || '');
    setActionItemDialogOpen(true);
  };

  const handleCreateTaskFromDialog = async () => {
    if (!onCreateTaskFromActionItem || !selectedActionItem) return;

    const { note, itemIndex } = selectedActionItem;
    const itemKey = `${note.id}:${itemIndex}`;

    // Use the ref to ensure we have the latest urgency value
    const urgencyToUse = taskUrgencyRef.current;

    setIsCreatingTask(true);
    try {
      await onCreateTaskFromActionItem(note, taskTitle, urgencyToUse, taskAssignee && taskAssignee !== 'unassigned' ? taskAssignee : undefined);
      setCreatedTaskItems(prev => new Set(prev).add(itemKey));
      toast.success('Task created from action item');
      setActionItemDialogOpen(false);
      // Reset form
      setTaskTitle('');
      setTaskUrgency('This Week');
      taskUrgencyRef.current = 'This Week';
      setTaskAssignee('');
      setSelectedActionItem(null);
    } catch {
      toast.error('Failed to create task');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const toggleNoteExpanded = (noteId: string) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  const renderNote = (note: CaseNote, compact = false) => {
    const SourceIcon = sourceIcons[note.source];
    const hasExistingTask = (note.taskIds && note.taskIds.length > 0) || createdTaskNotes.has(note.id);
    const isCreatingTask = creatingTaskForNote === note.id;
    const isNoteExpanded = expandedNotes.has(note.id);
    const isSelected = selectedIds.has(note.id);

    // Extract action items from the note content
    const actionItems = extractActionItemsFromContent(note.fullNote);
    const hasActionItems = actionItems.length > 0;

    return (
      <div
        key={note.id}
        className={cn(
          'p-4 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800 last:border-b-0',
          compact && 'p-3',
          selectMode && isSelected && 'bg-blue-500/10 ring-1 ring-blue-500/50'
        )}
        onClick={selectMode ? () => toggleSelection(note.id) : undefined}
      >
        <div className="flex gap-3">
          {selectMode && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleSelection(note.id)}
              className="mt-1"
            />
          )}
          {!compact && !selectMode && (
            <div className={cn('p-2 rounded-lg h-fit', sourceColors[note.source])}>
              <SourceIcon className="w-4 h-4" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h4 className={cn('font-medium text-white', compact ? 'text-sm' : 'text-base')}>
                  {note.title.replace('[Meeting] ', '')}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  {compact && (
                    <>
                      <SourceIcon className="w-3 h-3 text-zinc-500" />
                      <span className="text-xs text-zinc-500">{note.source}</span>
                      <span className="text-zinc-600">•</span>
                    </>
                  )}
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
              </div>
            </div>

            <p className={cn(
              'text-zinc-400 whitespace-pre-wrap',
              compact ? 'text-xs line-clamp-3' : 'text-sm'
            )}>
              {note.fullNote}
            </p>

            {/* Action Items Section */}
            {hasActionItems && onCreateTaskFromActionItem && (
              <div className="mt-3 pt-3 border-t border-zinc-800">
                <button
                  onClick={() => toggleNoteExpanded(note.id)}
                  className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
                >
                  <ListTodo className="w-4 h-4" />
                  <span>{actionItems.length} Action Item{actionItems.length !== 1 ? 's' : ''}</span>
                  <ChevronRight
                    className={cn(
                      'w-4 h-4 transition-transform',
                      isNoteExpanded && 'rotate-90'
                    )}
                  />
                </button>

                {isNoteExpanded && (
                  <div className="mt-2 space-y-2">
                    {actionItems.map((item, index) => {
                      const itemKey = `${note.id}:${index}`;
                      const isCreating = creatingTaskForItem === itemKey;
                      const isCreated = createdTaskItems.has(itemKey);

                      return (
                        <div
                          key={index}
                          className="flex items-start gap-2 p-2 rounded-lg bg-zinc-800/50"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-zinc-300">{item.task}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] px-1.5 py-0',
                                  item.urgency === 'Urgent'
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                    : item.urgency === 'This Week'
                                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                    : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                )}
                              >
                                {item.urgency}
                              </Badge>
                              {item.assignee && (
                                <span className="text-[10px] text-zinc-500">
                                  {item.assignee}
                                </span>
                              )}
                            </div>
                          </div>
                          {isCreated ? (
                            <div className="flex items-center gap-1 text-green-500">
                              <Check className="w-3 h-3" />
                              <span className="text-[10px]">Created</span>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px] gap-1 text-zinc-400 hover:text-white"
                              onClick={() => handleOpenActionItemDialog(note, item, index)}
                              disabled={isCreating}
                            >
                              {isCreating ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  Create Task
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {onCreateTask && (
              <div className="flex items-center gap-2 mt-3">
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
                    disabled={isCreatingTask}
                  >
                    {isCreatingTask ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-3 h-3" />
                        Create Task
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (notes.length === 0) {
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
      {/* Select Mode Controls */}
      <div className="flex items-center justify-between mb-4">
        {selectMode ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exitSelectMode}
              className="border-zinc-700 text-zinc-300"
            >
              <X className="w-4 h-4 mr-1" />
              Exit Select
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="border-zinc-700 text-zinc-300"
            >
              Select All
            </Button>
            {selectedIds.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                className="border-zinc-700 text-zinc-300"
              >
                Clear ({selectedIds.size})
              </Button>
            )}
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectMode(true)}
            className="border-zinc-700 text-zinc-300"
          >
            Select
          </Button>
        )}

        {selectMode && selectedIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteConfirmOpen(true)}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete ({selectedIds.size})
          </Button>
        )}
      </div>

    <div className="space-y-4">
      {/* Meeting Folders */}
      {meetingFolders.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
            <Video className="w-4 h-4" />
            Meeting Notes ({meetingFolders.length})
          </h3>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-0">
              {meetingFolders.map((folder) => {
                const isOpen = openFolders.has(folder.id);

                return (
                  <Collapsible
                    key={folder.id}
                    open={isOpen}
                    onOpenChange={() => toggleFolder(folder.id)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center gap-3 p-4 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800 last:border-b-0">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          {isOpen ? (
                            <FolderOpen className="w-4 h-4 text-green-500" />
                          ) : (
                            <Folder className="w-4 h-4 text-green-500" />
                          )}
                        </div>

                        <div className="flex-1 text-left">
                          <h4 className="font-medium text-white">{folder.title}</h4>
                          <p className="text-xs text-zinc-500">
                            {new Date(folder.date).toLocaleDateString()} • {folder.notes.length} note(s)
                          </p>
                        </div>

                        {folder.transcriptUrl && (
                          <a
                            href={folder.transcriptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 p-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}

                        <ChevronRight
                          className={cn(
                            'w-4 h-4 text-zinc-500 transition-transform',
                            isOpen && 'rotate-90'
                          )}
                        />
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t border-zinc-800 bg-zinc-900/50">
                        {folder.notes.map((note) => renderNote(note, true))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Other Notes by Source */}
      {Object.entries(notesBySource).map(([source, sourceNotes]) => {
        if (sourceNotes.length === 0) return null;

        const SourceIcon = sourceIcons[source as CaseNoteSource];
        const sourceKey = source as CaseNoteSource;

        return (
          <div key={source} className="space-y-2">
            <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <SourceIcon className="w-4 h-4" />
              {source.charAt(0).toUpperCase() + source.slice(1)} Notes ({sourceNotes.length})
            </h3>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-0">
                <ScrollArea className="max-h-[400px]">
                  {sourceNotes.map((note) => renderNote(note))}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>

      {/* Create Task from Action Item Dialog */}
      <Dialog open={actionItemDialogOpen} onOpenChange={setActionItemDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Create Task from Action Item</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Source Action Item Preview */}
            {selectedActionItem && (
              <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <p className="text-xs text-zinc-500 mb-1">Source Action Item</p>
                <p className="text-sm text-zinc-300 line-clamp-3">{selectedActionItem.item.task}</p>
                {selectedActionItem.item.assignee && (
                  <p className="text-xs text-zinc-500 mt-1">Suggested: {selectedActionItem.item.assignee}</p>
                )}
              </div>
            )}

            {/* Task Title */}
            <div className="space-y-2">
              <Label htmlFor="actionItemTitle" className="text-zinc-300">Task Title</Label>
              <Input
                id="actionItemTitle"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Enter task title..."
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            {/* Assignee */}
            <div className="space-y-2">
              <Label className="text-zinc-300">Assign To (Optional)</Label>
              <Select value={taskAssignee} onValueChange={setTaskAssignee}>
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
              <Select value={taskUrgency} onValueChange={(v) => {
                const urgency = v as TaskUrgency;
                setTaskUrgency(urgency);
                taskUrgencyRef.current = urgency;
              }}>
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
                  <SelectItem value="Backlog" className="text-zinc-500">
                    Backlog (No deadline)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionItemDialogOpen(false)}
              className="border-zinc-700 text-zinc-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTaskFromDialog}
              disabled={!taskTitle.trim() || isCreatingTask}
              className="gap-2"
            >
              {isCreatingTask ? (
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Case Notes</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete {selectedIds.size} case note{selectedIds.size !== 1 ? 's' : ''}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-zinc-300" disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Extract transcript URL from note content
 */
function extractTranscriptUrl(content: string): string | undefined {
  const match = content.match(/\*\*Transcript:\*\*\s*(https?:\/\/[^\s]+)/);
  return match?.[1];
}

// Keywords that indicate urgency
const URGENCY_KEYWORDS: Record<TaskUrgency, string[]> = {
  'Urgent': ['urgent', 'asap', 'immediately', 'today', 'critical', 'emergency', 'right away'],
  'This Week': ['this week', 'by friday', 'soon', 'before the weekend', 'next few days'],
  'This Month': ['this month', 'end of month', 'when you can', 'no rush'],
  'Backlog': ['eventually', 'someday', 'nice to have', 'if you have time'],
};

// Action item indicators
const ACTION_INDICATORS = [
  'action item',
  'to do',
  'todo',
  'need to',
  'will do',
  'should do',
  'must',
  'follow up',
  'get back to',
  'send',
  'create',
  'update',
  'review',
  'check',
  'complete',
  'finish',
  'schedule',
  'book',
  'prepare',
];

/**
 * Extract action items from case note content
 */
function extractActionItemsFromContent(content: string): ActionItem[] {
  if (!content) return [];

  const items: ActionItem[] = [];
  const lines = content.split('\n');
  let currentAssignee: string | undefined;
  let inActionItemsSection = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Skip empty lines
    if (!trimmed) continue;

    // Check for "Action Items" section header (## Action Items, **Action Items**, etc.)
    if (/^#{1,3}\s*action\s*items?/i.test(trimmed) || /^\*\*action\s*items?\*\*/i.test(trimmed)) {
      inActionItemsSection = true;
      continue;
    }

    // Check for other section headers that would end the action items section
    if (/^#{1,3}\s+\w/.test(trimmed) && !/action\s*items?/i.test(trimmed)) {
      inActionItemsSection = false;
      currentAssignee = undefined;
      continue;
    }

    // Check if this is a speaker/assignee header (e.g., **Eddie Dong** or **Ella Cas**)
    // More lenient pattern - allows for trailing characters or spaces
    const speakerMatch = trimmed.match(/^\*\*([^*]+)\*\*\s*$/);
    if (speakerMatch) {
      currentAssignee = speakerMatch[1].trim();
      continue;
    }

    // If we're in the action items section, be more lenient about what counts as an action item
    if (inActionItemsSection) {
      // Skip lines that are just section labels or headers
      if (trimmed.startsWith('#')) continue;

      // Skip lines that are bold headers (assignee names we already caught above)
      if (/^\*\*[^*]+\*\*\s*$/.test(trimmed)) continue;

      // Skip very short lines
      if (trimmed.length < 15) continue;

      // Remove bullet/number prefix if present
      let taskText = trimmed.replace(/^[-•*]\s+/, '').replace(/^\d+[.)]\s+/, '').trim();

      // Remove timestamp at end (e.g., "(08:14)" or "(1:23:45)" or "(38:50)")
      taskText = taskText.replace(/\s*\(\d{1,2}:\d{2}(:\d{2})?\)\s*$/, '').trim();

      // Skip if after cleaning it's too short or is just a name
      if (taskText.length < 15 || isLikelyNameOnly(taskText)) continue;

      items.push({
        task: taskText,
        urgency: determineUrgency(taskText),
        assignee: currentAssignee,
      });
      continue;
    }

    // For content outside action items sections, use stricter detection
    // Check for action item markers (bullet points, dashes, etc.)
    const isMarkedItem = /^[-•*]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed);

    // Check for action verbs in the content
    const lower = trimmed.toLowerCase();
    const hasActionIndicator = ACTION_INDICATORS.some(indicator => lower.includes(indicator));

    // If it looks like an action item
    if ((isMarkedItem || hasActionIndicator) && trimmed.length > 15 && trimmed.length < 300) {
      // Remove bullet/number prefix
      const taskText = trimmed.replace(/^[-•*]\s+/, '').replace(/^\d+[.)]\s+/, '').trim();

      // Remove timestamp at end (e.g., "(08:14)" or "(1:23:45)")
      const cleanTask = taskText.replace(/\s*\(\d{1,2}:\d{2}(:\d{2})?\)\s*$/, '').trim();

      // Skip if after cleaning it's too short or is just a name
      if (cleanTask.length < 15 || isLikelyNameOnly(cleanTask)) continue;

      // Validate this looks like an actual task
      if (!isValidActionItem(cleanTask)) continue;

      items.push({
        task: cleanTask,
        urgency: determineUrgency(cleanTask),
        assignee: currentAssignee,
      });
    }
  }

  return items.slice(0, 20); // Limit to 20 action items
}

/**
 * Check if a string is likely just a person's name
 */
function isLikelyNameOnly(text: string): boolean {
  // Remove any leading/trailing asterisks (in case of bold formatting)
  const cleanText = text.replace(/^\*+|\*+$/g, '').trim();
  const words = cleanText.split(/\s+/);

  // Single word that's just a first name (e.g., "Kyle")
  if (words.length === 1 && cleanText.length < 20) {
    // If it's capitalized and doesn't contain action words, it's likely a name
    const isCapitalized = cleanText[0] === cleanText[0].toUpperCase();
    const lowerText = cleanText.toLowerCase();
    const hasActionWord = ['create', 'update', 'send', 'review', 'follow', 'prepare', 'share', 'film'].some(v => lowerText.includes(v));
    if (isCapitalized && !hasActionWord) return true;
  }

  // More than 4 words is likely not just a name
  if (words.length > 4) return false;

  // Check if it looks like a name pattern (Title Case, no common action verbs)
  const actionVerbs = ['create', 'update', 'send', 'review', 'follow', 'prepare', 'share', 'provide', 'schedule', 'check', 'research', 'assist', 'continue', 'decide', 'film', 'upload', 'identify', 'encourage', 'respond', 'use', 'finalize', 'confirm', 'support', 'monitor', 'brainstorm'];
  const lowerText = cleanText.toLowerCase();

  // If it contains action verbs, it's probably not just a name
  if (actionVerbs.some(verb => lowerText.includes(verb))) return false;

  // If all words start with capital letter and word count is 1-3, likely a name
  if (words.length >= 1 && words.length <= 3) {
    const allCapitalized = words.every(w => w.length > 0 && w[0] === w[0].toUpperCase());
    if (allCapitalized) return true;
  }

  return false;
}

/**
 * Validate that text looks like a real action item
 */
function isValidActionItem(text: string): boolean {
  const lowerText = text.toLowerCase();

  // Must contain at least one action-oriented word
  const actionWords = [
    'create', 'update', 'send', 'review', 'follow', 'prepare', 'share',
    'provide', 'schedule', 'check', 'research', 'assist', 'continue',
    'decide', 'film', 'upload', 'identify', 'encourage', 'finalize',
    'confirm', 'respond', 'support', 'use', 'brainstorm', 'monitor',
    'explore', 'communicate', 'prioritize', 'advise', 'leverage', 'propose',
    'need to', 'will', 'should', 'must', 'todo', 'to do', 'action'
  ];

  const hasActionWord = actionWords.some(word => lowerText.includes(word));

  // Must be reasonable length
  const reasonableLength = text.length >= 15 && text.length <= 300;

  // Should not start with common non-task patterns
  const badPatterns = [
    /^(yes|no|ok|okay|sure|thanks|thank you|hi|hello|hey)/i,
    /^(the|a|an)\s+\w+\s*$/i,
    /^\d+\s*$/,
    /^[A-Z][a-z]+\s+[A-Z][a-z]+\s*$/,
  ];

  const hasBadPattern = badPatterns.some(pattern => pattern.test(text));

  return hasActionWord && reasonableLength && !hasBadPattern;
}

/**
 * Determine urgency from text
 */
function determineUrgency(text: string): TaskUrgency {
  const lower = text.toLowerCase();

  for (const [urgency, keywords] of Object.entries(URGENCY_KEYWORDS) as [TaskUrgency, string[]][]) {
    if (keywords.some(kw => lower.includes(kw))) {
      return urgency;
    }
  }

  return 'This Week'; // Default urgency
}
