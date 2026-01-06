'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Video, Youtube, Mic, AlertCircle, ExternalLink, MoreVertical, ArrowRight, Plus, Loader2, CheckSquare, Trash2 } from 'lucide-react';
import { Idea, Client, IdeaStatus, ContentType } from '@/types';
import { toast } from 'sonner';

interface IdeasBoardProps {
  ideas: Idea[];
  clients: Client[];
  initialCursor?: string | null;
  initialHasMore?: boolean;
  contentTypeFilter?: ContentType;
}

const statusColumns: { id: IdeaStatus; title: string; color: string }[] = [
  { id: 'Not started', title: 'New Ideas', color: 'border-blue-500' },
  { id: 'In Progress', title: 'In Progress', color: 'border-yellow-500' },
  { id: 'Needs Review', title: 'Needs Review', color: 'border-orange-500' },
  { id: 'Approved', title: 'Approved', color: 'border-green-500' },
  { id: 'Done', title: 'Done', color: 'border-zinc-500' },
];

const contentTypeIcons = {
  'Short Form': Video,
  'YouTube': Youtube,
  'Podcast': Mic,
};

const contentTypeColors = {
  'Short Form': 'bg-blue-500/10 text-blue-400',
  'YouTube': 'bg-red-500/10 text-red-400',
  'Podcast': 'bg-purple-500/10 text-purple-400',
};

interface NewIdeaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  onIdeaCreated: (idea: Idea) => void;
}

function NewIdeaDialog({ open, onOpenChange, clients, onIdeaCreated }: NewIdeaDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [contentType, setContentType] = useState<ContentType>('Short Form');
  const [hook, setHook] = useState('');
  const [script, setScript] = useState('');
  const [source, setSource] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !clientId) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          clientId,
          contentType,
          status: 'Not started',
          hook: hook.trim() || undefined,
          script: script.trim() || undefined,
          source: source || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to create idea');

      const newIdea = await response.json();
      toast.success('Idea created successfully');
      router.refresh();
      onIdeaCreated(newIdea);
      onOpenChange(false);
      // Reset form
      setTitle('');
      setHook('');
      setScript('');
      setSource('');
    } catch (error) {
      toast.error('Failed to create idea');
      console.error('Error creating idea:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">New Idea</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-zinc-300">Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Idea title or topic..."
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Client *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Content Type</Label>
              <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="Short Form">Short Form</SelectItem>
                  <SelectItem value="YouTube">YouTube</SelectItem>
                  <SelectItem value="Podcast">Podcast</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Hook</Label>
            <Input
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              placeholder="Opening hook..."
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Script/Notes</Label>
            <Textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Script or notes..."
              className="bg-zinc-800 border-zinc-700 text-white min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Select source..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="AI Generated">AI Generated</SelectItem>
                <SelectItem value="Team">Team</SelectItem>
                <SelectItem value="Client Request">Client Request</SelectItem>
                <SelectItem value="Trending">Trending</SelectItem>
                <SelectItem value="Article">Article</SelectItem>
                <SelectItem value="Reddit">Reddit</SelectItem>
                <SelectItem value="YouTube">YouTube</SelectItem>
                <SelectItem value="TikTok">TikTok</SelectItem>
                <SelectItem value="X">X</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-zinc-700">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!title.trim() || !clientId || isCreating}>
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Create Idea
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function IdeasBoard({
  ideas: initialIdeas,
  clients,
  initialCursor,
  initialHasMore = false,
  contentTypeFilter,
}: IdeasBoardProps) {
  const router = useRouter();
  const [ideas, setIdeas] = useState(initialIdeas);
  const [selectedClientName, setSelectedClientName] = useState<string>('all');
  const [newIdeaOpen, setNewIdeaOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(initialCursor || null);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const getClientName = (idea: Idea) => {
    // Use the clientName from the idea if available (from Content Bank clients)
    if (idea.clientName) return idea.clientName;
    // Fall back to looking up in the main clients list
    const client = clients.find((c) => c.id === idea.clientId);
    return client?.name || 'Unknown';
  };

  // Use the clients prop for the dropdown (all Active clients from Notion)
  const clientOptions = useMemo(() => {
    return clients.map((c) => c.name).sort();
  }, [clients]);

  // Filter ideas by selected client name
  const filteredIdeas = useMemo(() => {
    if (selectedClientName === 'all') {
      return ideas;
    }
    return ideas.filter((i) => i.clientName === selectedClientName);
  }, [ideas, selectedClientName]);

  // Group ideas by status (case-insensitive to handle Notion variations)
  const ideasByStatus = useMemo(() => {
    return statusColumns.map((column) => ({
      ...column,
      ideas: filteredIdeas.filter((i) => i.status?.toLowerCase() === column.id.toLowerCase()),
    }));
  }, [filteredIdeas]);

  // Update idea status
  const handleStatusChange = async (ideaId: string, newStatus: IdeaStatus) => {
    setUpdatingId(ideaId);
    try {
      const response = await fetch(`/api/ideas/${ideaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      setIdeas((prev) => prev.map((i) => i.id === ideaId ? { ...i, status: newStatus } : i));
      toast.success(`Moved to ${newStatus}`);
      router.refresh();
    } catch (error) {
      toast.error('Failed to update status');
      console.error('Error updating idea:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  // Convert idea to content
  const handleConvertToContent = async (idea: Idea) => {
    setConvertingId(idea.id);
    try {
      const response = await fetch(`/api/ideas/${idea.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: idea.title,
          clientId: idea.clientId,
          contentType: idea.contentType,
        }),
      });

      if (!response.ok) throw new Error('Failed to convert to content');

      // Update the idea status to "Done"
      setIdeas((prev) => prev.map((i) => i.id === idea.id ? { ...i, status: 'Done' as IdeaStatus } : i));
      toast.success('Converted to content');
      router.refresh();
    } catch (error) {
      toast.error('Failed to convert to content');
      console.error('Error converting idea:', error);
    } finally {
      setConvertingId(null);
    }
  };

  const handleIdeaCreated = (newIdea: Idea) => {
    setIdeas((prev) => [newIdea, ...prev]);
  };

  // Toggle selection for an idea
  const toggleSelection = (ideaId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ideaId)) {
        newSet.delete(ideaId);
      } else {
        newSet.add(ideaId);
      }
      return newSet;
    });
  };

  // Select all filtered ideas
  const selectAll = () => {
    const allIds = filteredIdeas.map(idea => idea.id);
    setSelectedIds(new Set(allIds));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Bulk delete selected ideas
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/ideas', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (!response.ok) throw new Error('Failed to delete ideas');

      const result = await response.json();

      // Remove deleted ideas from state
      setIdeas(prev => prev.filter(i => !selectedIds.has(i.id)));

      toast.success(`Deleted ${result.success} idea${result.success !== 1 ? 's' : ''}`);
      router.refresh();
      if (result.failed > 0) {
        toast.warning(`${result.failed} idea${result.failed !== 1 ? 's' : ''} failed to delete`);
      }
    } catch (error) {
      toast.error('Failed to delete ideas');
      console.error(error);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setSelectedIds(new Set());
      setSelectMode(false);
    }
  };

  // Load more ideas
  const handleLoadMore = async () => {
    if (!cursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams({
        paginated: 'true',
        pageSize: '200',
        cursor,
      });
      if (contentTypeFilter) {
        params.set('contentType', contentTypeFilter);
      }

      const response = await fetch(`/api/ideas?${params}`);
      if (!response.ok) throw new Error('Failed to load more ideas');

      const data = await response.json();
      setIdeas((prev) => [...prev, ...data.ideas]);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Error loading more ideas:', error);
      toast.error('Failed to load more ideas');
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <>
      {/* Filters and Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Client:</span>
            <Select value={selectedClientName} onValueChange={setSelectedClientName}>
              <SelectTrigger className="w-48 bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="All clients" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="all">All Clients</SelectItem>
                {clientOptions.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-zinc-500">
            {filteredIdeas.length} {filteredIdeas.length === 1 ? 'idea' : 'ideas'}
            {hasMore && ' (more available)'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Select Mode Toggle */}
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
                Select All ({filteredIdeas.length})
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
          <Button onClick={() => setNewIdeaOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Idea
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectMode && selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 mb-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
          <span className="text-sm text-zinc-400">
            {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
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
      )}

      {/* Ideas Kanban Board */}
      <div className="grid grid-cols-5 gap-4">
        {ideasByStatus.map((column) => (
          <Card key={column.id} className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', column.color.replace('border-', 'bg-'))} />
                  <span className="text-sm text-white">{column.title}</span>
                </div>
                <Badge variant="outline" className="text-xs text-zinc-400">
                  {column.ideas.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[500px]">
                <div className="space-y-2 pr-2">
                  {column.ideas.length === 0 ? (
                    <p className="text-zinc-500 text-xs text-center py-4">No ideas</p>
                  ) : (
                    column.ideas.map((idea) => {
                      const Icon = contentTypeIcons[idea.contentType];
                      const isUpdating = updatingId === idea.id;
                      const isConverting = convertingId === idea.id;
                      const isSelected = selectedIds.has(idea.id);

                      return (
                        <div
                          key={idea.id}
                          className={cn(
                            'p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600 transition-colors',
                            (isUpdating || isConverting) && 'opacity-50',
                            isSelected && 'ring-2 ring-blue-500 bg-blue-500/5',
                            selectMode && 'cursor-pointer'
                          )}
                          onClick={() => selectMode && toggleSelection(idea.id)}
                        >
                          {/* Header with type and actions */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {selectMode ? (
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleSelection(idea.id)}
                                  className="border-zinc-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <div className={cn('p-1 rounded', contentTypeColors[idea.contentType])}>
                                  <Icon className="w-3 h-3" />
                                </div>
                              )}
                              <span className="text-xs text-zinc-400">
                                {getClientName(idea)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {idea.priority === 'Urgent' && (
                                <AlertCircle className="w-4 h-4 text-red-500" />
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1 rounded hover:bg-zinc-700">
                                    <MoreVertical className="w-4 h-4 text-zinc-400" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-zinc-800 border-zinc-700">
                                  {statusColumns.filter(s => s.id !== idea.status).map((status) => (
                                    <DropdownMenuItem
                                      key={status.id}
                                      onClick={() => handleStatusChange(idea.id, status.id)}
                                      className="cursor-pointer"
                                    >
                                      Move to {status.title}
                                    </DropdownMenuItem>
                                  ))}
                                  {idea.status === 'Approved' && (
                                    <>
                                      <DropdownMenuSeparator className="bg-zinc-700" />
                                      <DropdownMenuItem
                                        onClick={() => handleConvertToContent(idea)}
                                        className="cursor-pointer text-green-400"
                                      >
                                        <ArrowRight className="w-4 h-4 mr-2" />
                                        Convert to Content
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Title */}
                          <p className="text-sm font-medium text-white mb-1 line-clamp-2">
                            {idea.title}
                          </p>

                          {/* Hook preview */}
                          {idea.hook && (
                            <p className="text-xs text-zinc-500 line-clamp-2 mb-2">
                              {idea.hook}
                            </p>
                          )}

                          {/* Footer */}
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-700">
                            <span className="text-xs text-zinc-500">
                              {new Date(idea.createdAt).toLocaleDateString()}
                            </span>
                            <div className="flex items-center gap-2">
                              {idea.source && (
                                <Badge variant="outline" className="text-xs text-zinc-500">
                                  {idea.source}
                                </Badge>
                              )}
                              {idea.url && (
                                <a
                                  href={idea.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-zinc-500 hover:text-white"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center mt-6">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="border-zinc-700 hover:bg-zinc-800"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading more ideas...
              </>
            ) : (
              <>Load More Ideas</>
            )}
          </Button>
        </div>
      )}

      <NewIdeaDialog
        open={newIdeaOpen}
        onOpenChange={setNewIdeaOpen}
        clients={clients}
        onIdeaCreated={handleIdeaCreated}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Delete {selectedIds.size} idea{selectedIds.size !== 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected ideas will be permanently deleted.
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
    </>
  );
}
