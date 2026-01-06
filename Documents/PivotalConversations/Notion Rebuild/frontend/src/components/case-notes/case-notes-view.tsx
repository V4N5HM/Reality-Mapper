'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Plus,
  MessageSquare,
  Phone,
  PenLine,
  Search,
  Loader2,
  ChevronRight,
  Video,
  ExternalLink,
  CheckSquare,
  Check,
  Calendar,
  Users,
  FileText,
  Trash2,
  MoreHorizontal,
  ListTodo,
  User,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { CaseNote, Client, CaseNoteSource, CaseNoteType, TaskUrgency } from '@/types';
import { AddCaseNoteDialog } from '@/components/case-notes/add-case-note-dialog';
import { LoadMoreButton } from '@/components/shared/load-more-button';
import { toast } from 'sonner';

// Action item interface
interface ActionItem {
  task: string;
  urgency: TaskUrgency;
  assignee?: string;
}

// Team member interface
interface TeamMember {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

const sourceIcons: Record<CaseNoteSource, typeof MessageSquare> = {
  'Slack': MessageSquare,
  'Email': MessageSquare,
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

interface MeetingGroup {
  id: string;
  title: string;
  clientName: string;
  date: string;
  notes: CaseNote[];
  transcriptUrl?: string;
}

interface CaseNotesViewProps {
  initialNotes: CaseNote[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  clients: Client[];
}

export function CaseNotesView({ initialNotes, initialNextCursor, initialHasMore, clients }: CaseNotesViewProps) {
  // Use initial data from server - no loading state needed on first render
  const [notes, setNotes] = useState<CaseNote[]>(initialNotes);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // UI State
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [openMeetings, setOpenMeetings] = useState<Set<string>>(new Set());
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load more notes
  const loadMoreNotes = async () => {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    try {
      const res = await fetch(`/api/case-notes?paginated=true&pageSize=100&cursor=${nextCursor}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(prev => [...prev, ...(data.caseNotes || [])]);
        setNextCursor(data.nextCursor || null);
        setHasMore(data.hasMore || false);
      }
    } catch (error) {
      console.error('Error loading more notes:', error);
      toast.error('Failed to load more notes');
    } finally {
      setLoadingMore(false);
    }
  };

  // Refresh data
  const refreshData = async () => {
    try {
      const res = await fetch('/api/case-notes?paginated=true&pageSize=100');
      if (res.ok) {
        const data = await res.json();
        setNotes(data.caseNotes || data);
        setNextCursor(data.nextCursor || null);
        setHasMore(data.hasMore || false);
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    }
  };

  // Get client name helper
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown Client';
  };

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          note.title.toLowerCase().includes(query) ||
          note.fullNote.toLowerCase().includes(query) ||
          getClientName(note.clientId).toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      if (clientFilter !== 'all' && note.clientId !== clientFilter) return false;
      if (sourceFilter !== 'all' && note.source !== sourceFilter) return false;
      if (typeFilter !== 'all' && note.type !== typeFilter) return false;
      return true;
    });
  }, [notes, searchQuery, clientFilter, sourceFilter, typeFilter, clients]);

  // Group notes by meeting
  const { meetingGroups, otherNotes } = useMemo(() => {
    const meetings: MeetingGroup[] = [];
    const meetingMap = new Map<string, MeetingGroup>();
    const other: CaseNote[] = [];

    const sortedNotes = [...filteredNotes].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    for (const note of sortedNotes) {
      if (note.title.startsWith('[Meeting]') && note.source === 'Call') {
        const meetingTitle = note.title.replace('[Meeting] ', '');
        const key = `${meetingTitle}-${note.date}-${note.clientId}`;

        if (!meetingMap.has(key)) {
          meetingMap.set(key, {
            id: key,
            title: meetingTitle,
            clientName: getClientName(note.clientId),
            date: note.date,
            notes: [],
            transcriptUrl: extractTranscriptUrl(note.fullNote),
          });
        }
        meetingMap.get(key)!.notes.push(note);
      } else {
        other.push(note);
      }
    }

    meetings.push(...Array.from(meetingMap.values()));
    meetings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { meetingGroups: meetings, otherNotes: other };
  }, [filteredNotes, clients]);

  // Stats
  const stats = useMemo(() => ({
    total: notes.length,
    filtered: filteredNotes.length,
    meetings: meetingGroups.length,
    slack: notes.filter(n => n.source === 'Slack').length,
    call: notes.filter(n => n.source === 'Call').length,
    manual: notes.filter(n => n.source === 'Manual').length,
    clientRequests: notes.filter(n => n.type === 'Client Request').length,
    editingGuidelines: notes.filter(n => n.type === 'Editing Guideline').length,
  }), [notes, filteredNotes, meetingGroups]);

  const toggleMeeting = (id: string) => {
    setOpenMeetings(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleNoteExpand = (id: string) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteClick = (noteId: string) => {
    setNoteToDelete(noteId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/case-notes/${noteToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete case note');
      }

      setNotes(prev => prev.filter(n => n.id !== noteToDelete));
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Case Notes</h1>
          <p className="text-zinc-400">
            {stats.clientRequests} client requests • {stats.editingGuidelines} editing guidelines • {stats.total - stats.clientRequests - stats.editingGuidelines} internal notes
          </p>
        </div>
        <Button className="gap-2" onClick={() => setAddNoteOpen(true)}>
          <Plus className="w-4 h-4" />
          New Note
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Video className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.meetings}</p>
              <p className="text-sm text-zinc-400">Meetings</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <MessageSquare className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.slack}</p>
              <p className="text-sm text-zinc-400">Slack</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-500/10">
              <PenLine className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.manual}</p>
              <p className="text-sm text-zinc-400">Manual</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-800 text-white"
          />
        </div>

        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[200px] bg-zinc-900 border-zinc-800 text-white">
            <Users className="w-4 h-4 mr-2 text-zinc-500" />
            <SelectValue placeholder="All Clients" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(client => (
              <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[160px] bg-zinc-900 border-zinc-800 text-white">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="Slack">Slack</SelectItem>
            <SelectItem value="Call">Call</SelectItem>
            <SelectItem value="Manual">Manual</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-800 text-white">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Internal Note">Internal Note</SelectItem>
            <SelectItem value="Client Request">Client Request</SelectItem>
            <SelectItem value="Editing Guideline">Editing Guideline</SelectItem>
          </SelectContent>
        </Select>

        {(searchQuery || clientFilter !== 'all' || sourceFilter !== 'all' || typeFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setClientFilter('all');
              setSourceFilter('all');
              setTypeFilter('all');
            }}
            className="text-zinc-400 hover:text-white"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Results count */}
      {stats.filtered !== stats.total && (
        <p className="text-sm text-zinc-500">
          Showing {stats.filtered} of {stats.total} notes
        </p>
      )}

      {/* Meeting Notes Section */}
      {meetingGroups.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
            <Video className="w-4 h-4" />
            Meeting Notes ({meetingGroups.length})
          </h2>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-0">
              {meetingGroups.map((meeting) => {
                const isOpen = openMeetings.has(meeting.id);

                return (
                  <Collapsible
                    key={meeting.id}
                    open={isOpen}
                    onOpenChange={() => toggleMeeting(meeting.id)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center gap-3 p-4 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800 last:border-b-0">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <Video className="w-4 h-4 text-green-500" />
                        </div>

                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-white">{meeting.title}</h3>
                            <Badge variant="outline" className="text-xs bg-zinc-800 text-zinc-400 border-zinc-700">
                              {meeting.clientName}
                            </Badge>
                          </div>
                          <p className="text-xs text-zinc-500 mt-1">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {new Date(meeting.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                            <span className="mx-2">•</span>
                            <FileText className="w-3 h-3 inline mr-1" />
                            {meeting.notes.length} note{meeting.notes.length !== 1 ? 's' : ''}
                          </p>
                        </div>

                        {meeting.transcriptUrl && (
                          <a
                            href={meeting.transcriptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 p-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}

                        <ChevronRight className={cn(
                          'w-4 h-4 text-zinc-500 transition-transform',
                          isOpen && 'rotate-90'
                        )} />
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t border-zinc-800 bg-zinc-950/50">
                        {meeting.notes.map((note) => (
                          <NoteCard
                            key={note.id}
                            note={note}
                            clientName={meeting.clientName}
                            clientId={note.clientId}
                            clients={clients}
                            compact
                            expanded={expandedNotes.has(note.id)}
                            onToggleExpand={() => toggleNoteExpand(note.id)}
                            onDelete={handleDeleteClick}
                            onTaskCreated={refreshData}
                          />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Other Notes Section */}
      {otherNotes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {meetingGroups.length > 0 ? 'Other Notes' : 'All Notes'} ({otherNotes.length})
          </h2>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <div className="divide-y divide-zinc-800">
                  {otherNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      clientName={getClientName(note.clientId)}
                      clientId={note.clientId}
                      clients={clients}
                      expanded={expandedNotes.has(note.id)}
                      onToggleExpand={() => toggleNoteExpand(note.id)}
                      onDelete={handleDeleteClick}
                      onTaskCreated={refreshData}
                    />
                  ))}
                </div>
                <LoadMoreButton
                  onClick={loadMoreNotes}
                  loading={loadingMore}
                  hasMore={hasMore}
                  loadedCount={notes.length}
                  totalLabel="notes"
                />
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {filteredNotes.length === 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No case notes found</h3>
            <p className="text-zinc-500 mb-4">
              {searchQuery || clientFilter !== 'all' || sourceFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first case note'}
            </p>
            <Button onClick={() => setAddNoteOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Note
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Note Dialog */}
      <AddCaseNoteDialog
        open={addNoteOpen}
        onOpenChange={setAddNoteOpen}
        clientId={clientFilter !== 'all' ? clientFilter : undefined}
        clientName={clientFilter !== 'all'
          ? clients.find(c => c.id === clientFilter)?.name
          : undefined
        }
        clients={clients}
        onNoteCreated={refreshData}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Case Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this case note? This action cannot be undone.
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
              onClick={handleDeleteConfirm}
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
    </div>
  );
}

// Note card component (simplified - keeping key functionality)
interface NoteCardProps {
  note: CaseNote;
  clientName: string;
  clientId: string;
  clients: Client[];
  compact?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onDelete?: (noteId: string) => void;
  onTaskCreated?: () => void;
}

function NoteCard({ note, clientName, clientId, clients, compact, expanded, onToggleExpand, onDelete, onTaskCreated }: NoteCardProps) {
  const [actionItemsExpanded, setActionItemsExpanded] = useState(false);
  const [createdTaskItems, setCreatedTaskItems] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedActionItem, setSelectedActionItem] = useState<{ item: ActionItem; index: number } | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskUrgency, setTaskUrgency] = useState<TaskUrgency>('This Week');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskClientId, setTaskClientId] = useState(clientId);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const SourceIcon = sourceIcons[note.source];
  const hasTask = note.taskIds && note.taskIds.length > 0;
  const actionItems = extractActionItemsFromContent(note.fullNote);
  const hasActionItems = actionItems.length > 0;
  const isLongContent = note.fullNote.length > 300;
  const displayContent = !expanded && isLongContent
    ? note.fullNote.substring(0, 300) + '...'
    : note.fullNote;

  const handleOpenDialog = async (item: ActionItem, itemIndex: number) => {
    setSelectedActionItem({ item, index: itemIndex });
    setTaskTitle(item.task);
    setTaskUrgency(item.urgency);
    setTaskAssignee(item.assignee || '');
    setTaskClientId(clientId);
    setDialogOpen(true);

    // Fetch team members if not loaded
    if (teamMembers.length === 0) {
      setIsLoadingTeam(true);
      try {
        const res = await fetch('/api/team');
        const data = await res.json();
        if (data.members) {
          setTeamMembers(data.members);
        }
      } catch (err) {
        console.error('Failed to fetch team members:', err);
      } finally {
        setIsLoadingTeam(false);
      }
    }
  };

  const handleCreateTaskFromDialog = async () => {
    if (!selectedActionItem) return;

    const itemKey = `${note.id}:${selectedActionItem.index}`;
    setIsCreatingTask(true);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle,
          clientId: taskClientId && taskClientId !== 'none' ? taskClientId : undefined,
          urgency: taskUrgency,
          description: `From case note: ${note.title}`,
          caseNoteId: note.id,
          assignee: taskAssignee && taskAssignee !== 'unassigned' ? taskAssignee : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Failed to create task');
      }

      setCreatedTaskItems(prev => new Set(prev).add(itemKey));
      toast.success('Task created from action item');
      setDialogOpen(false);
      setTaskTitle('');
      setTaskUrgency('This Week');
      setTaskAssignee('');
      setTaskClientId(clientId);
      setSelectedActionItem(null);
      onTaskCreated?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create task';
      toast.error(message);
    } finally {
      setIsCreatingTask(false);
    }
  };

  return (
    <div className={cn('p-4 hover:bg-zinc-800/30 transition-colors', compact && 'py-3')}>
      <div className="flex gap-3">
        <div className={cn('p-2 rounded-lg h-fit shrink-0', sourceColors[note.source])}>
          <SourceIcon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <h4 className={cn('font-medium text-white truncate', compact ? 'text-sm' : 'text-base')}>
                {note.title.replace('[Meeting] ', '')}
              </h4>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {!compact && (
                  <>
                    <span className="text-xs text-zinc-500">{clientName}</span>
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

            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className={cn('text-xs', typeColors[note.type])}>
                {note.type}
              </Badge>
              {note.autoGenerated && (
                <Badge variant="outline" className="text-xs bg-zinc-800 text-zinc-500 border-zinc-700">
                  Auto
                </Badge>
              )}
              {onDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-zinc-800 border-zinc-700">
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                      className="text-red-400 focus:text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <p className={cn('text-zinc-400 whitespace-pre-wrap', compact ? 'text-xs' : 'text-sm')}>
            {displayContent}
          </p>

          {isLongContent && (
            <button onClick={onToggleExpand} className="text-xs text-blue-400 hover:text-blue-300 mt-2">
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}

          {hasActionItems && (
            <div className="mt-3 pt-3 border-t border-zinc-800">
              <button
                onClick={() => setActionItemsExpanded(!actionItemsExpanded)}
                className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
              >
                <ListTodo className="w-4 h-4" />
                <span>{actionItems.length} Action Item{actionItems.length !== 1 ? 's' : ''}</span>
                <ChevronRight className={cn('w-4 h-4 transition-transform', actionItemsExpanded && 'rotate-90')} />
              </button>

              {actionItemsExpanded && (
                <div className="mt-2 space-y-2">
                  {actionItems.map((item, index) => {
                    const itemKey = `${note.id}:${index}`;
                    const isCreated = createdTaskItems.has(itemKey);

                    return (
                      <div key={index} className="flex items-start gap-2 p-2 rounded-lg bg-zinc-800/50">
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
                              <span className="text-[10px] text-zinc-500">{item.assignee}</span>
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
                            onClick={() => handleOpenDialog(item, index)}
                          >
                            <Plus className="w-3 h-3" />
                            Create Task
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {hasTask && (
            <div className="flex items-center gap-2 text-green-500 mt-3">
              <Check className="w-4 h-4" />
              <span className="text-xs">{note.taskIds?.length} task(s) linked</span>
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Create Task from Action Item</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedActionItem && (
              <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <p className="text-xs text-zinc-500 mb-1">Source Action Item</p>
                <p className="text-sm text-zinc-300 line-clamp-3">{selectedActionItem.item.task}</p>
                {selectedActionItem.item.assignee && (
                  <p className="text-xs text-zinc-500 mt-1">Suggested: {selectedActionItem.item.assignee}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="taskTitle" className="text-zinc-300">Task Title</Label>
              <Input
                id="taskTitle"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Enter task title..."
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Client (Optional)</Label>
              <Select value={taskClientId} onValueChange={setTaskClientId}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="none" className="text-zinc-400">
                    <span className="flex items-center gap-2"><Users className="w-4 h-4" />No Client</span>
                  </SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id} className="text-zinc-300">
                      <span className="flex items-center gap-2"><Users className="w-4 h-4" />{client.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-500">Default: {clientName}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Assign To (Optional)</Label>
              <Select value={taskAssignee} onValueChange={setTaskAssignee}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder={isLoadingTeam ? "Loading team..." : "Select team member"} />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="unassigned" className="text-zinc-400">
                    <span className="flex items-center gap-2"><User className="w-4 h-4" />Unassigned</span>
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

            <div className="space-y-2">
              <Label className="text-zinc-300">Urgency</Label>
              <Select value={taskUrgency} onValueChange={(v) => setTaskUrgency(v as TaskUrgency)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="Urgent" className="text-red-400">Urgent (48 hours)</SelectItem>
                  <SelectItem value="This Week" className="text-yellow-400">This Week (Before Friday)</SelectItem>
                  <SelectItem value="This Month" className="text-zinc-300">This Month (End of month)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-zinc-700 text-zinc-300">
              Cancel
            </Button>
            <Button onClick={handleCreateTaskFromDialog} disabled={!taskTitle.trim() || isCreatingTask} className="gap-2">
              {isCreatingTask ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Creating...</>
              ) : (
                <><CheckSquare className="w-4 h-4" />Create Task</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper functions
function extractTranscriptUrl(content: string): string | undefined {
  const match = content.match(/\*\*Transcript:\*\*\s*(https?:\/\/[^\s]+)/);
  return match?.[1];
}

const URGENCY_KEYWORDS: Record<TaskUrgency, string[]> = {
  'Urgent': ['urgent', 'asap', 'immediately', 'today', 'critical', 'emergency', 'right away'],
  'This Week': ['this week', 'by friday', 'soon', 'before the weekend', 'next few days'],
  'This Month': ['this month', 'end of month', 'when you can', 'no rush'],
  'Backlog': ['eventually', 'someday', 'nice to have', 'if you have time'],
};

function determineUrgency(text: string): TaskUrgency {
  const lower = text.toLowerCase();
  for (const [urgency, keywords] of Object.entries(URGENCY_KEYWORDS) as [TaskUrgency, string[]][]) {
    if (keywords.some(kw => lower.includes(kw))) return urgency;
  }
  return 'This Week';
}

function isLikelyNameOnly(text: string): boolean {
  const cleanText = text.replace(/^\*+|\*+$/g, '').trim();
  const words = cleanText.split(/\s+/);
  if (words.length === 1 && cleanText.length < 20) {
    const isCapitalized = cleanText[0] === cleanText[0].toUpperCase();
    const hasActionWord = ['create', 'update', 'send', 'review', 'follow', 'prepare', 'share', 'film'].some(v => cleanText.toLowerCase().includes(v));
    if (isCapitalized && !hasActionWord) return true;
  }
  if (words.length > 4) return false;
  const actionVerbs = ['create', 'update', 'send', 'review', 'follow', 'prepare', 'share', 'provide', 'schedule', 'check', 'research'];
  if (actionVerbs.some(verb => cleanText.toLowerCase().includes(verb))) return false;
  if (words.length >= 1 && words.length <= 3) {
    const allCapitalized = words.every(w => w.length > 0 && w[0] === w[0].toUpperCase());
    if (allCapitalized) return true;
  }
  return false;
}

function extractActionItemsFromContent(content: string): ActionItem[] {
  if (!content) return [];
  const items: ActionItem[] = [];
  const lines = content.split('\n');
  let currentAssignee: string | undefined;
  let inActionItemsSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^#{1,3}\s*action\s*items?/i.test(trimmed) || /^\*\*action\s*items?\*\*/i.test(trimmed)) {
      inActionItemsSection = true;
      continue;
    }

    if (/^#{1,3}\s+\w/.test(trimmed) && !/action\s*items?/i.test(trimmed)) {
      inActionItemsSection = false;
      currentAssignee = undefined;
      continue;
    }

    const speakerMatch = trimmed.match(/^\*\*([^*]+)\*\*\s*$/);
    if (speakerMatch) {
      currentAssignee = speakerMatch[1].trim();
      continue;
    }

    if (inActionItemsSection) {
      if (trimmed.startsWith('#')) continue;
      if (/^\*\*[^*]+\*\*\s*$/.test(trimmed)) continue;
      if (trimmed.length < 15) continue;

      let taskText = trimmed.replace(/^[-•*]\s+/, '').replace(/^\d+[.)]\s+/, '').trim();
      taskText = taskText.replace(/\s*\(\d{1,2}:\d{2}(:\d{2})?\)\s*$/, '').trim();

      if (taskText.length < 15 || isLikelyNameOnly(taskText)) continue;

      items.push({ task: taskText, urgency: determineUrgency(taskText), assignee: currentAssignee });
    }
  }

  return items.slice(0, 20);
}
