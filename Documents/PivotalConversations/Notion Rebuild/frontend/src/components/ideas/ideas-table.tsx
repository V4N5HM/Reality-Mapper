'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Idea, Client, IdeaStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { cn } from '@/lib/utils';
import {
  Search,
  MoreHorizontal,
  Send,
  Eye,
  Trash2,
  Video,
  Youtube,
  Mic,
  ExternalLink,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface IdeasTableProps {
  ideas: Idea[];
  clients: Client[];
  contentTypeFilter?: 'Short Form' | 'YouTube' | 'Podcast';
}

const statusColors: Record<IdeaStatus, string> = {
  'Not started': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  'Ideas': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  'In Progress': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Needs Review': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  'Reviewing': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Approved': 'bg-green-500/10 text-green-400 border-green-500/20',
  'Not Approved': 'bg-red-500/10 text-red-400 border-red-500/20',
  'Done': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Recorded': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'Used': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

const contentTypeIcons = {
  'Short Form': Video,
  'YouTube': Youtube,
  'Podcast': Mic,
};

const priorityColors = {
  'Urgent': 'bg-red-500/10 text-red-400 border-red-500/20',
  'Not Urgent': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

// Truncate text to approximately 2 lines (around 100-120 chars)
function truncateToTwoLines(text: string | undefined, maxLength: number = 120): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

export function IdeasTable({ ideas: initialIdeas, clients, contentTypeFilter }: IdeasTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [ideas, setIdeas] = useState(initialIdeas);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSendingToClient, setIsSendingToClient] = useState<string | null>(null);

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Auto-open idea detail when highlightId is provided
  useEffect(() => {
    if (highlightId) {
      const idea = initialIdeas.find(i => i.id === highlightId);
      if (idea) {
        setSelectedIdea(idea);
        setViewDialogOpen(true);
        // Clear highlight from URL to prevent re-opening on refresh
        router.replace('/ideas', { scroll: false });
      } else {
        // Idea not in local data (might be filtered by content type tab), fetch it
        fetch(`/api/ideas/${highlightId}`)
          .then(res => res.ok ? res.json() : null)
          .then(fetchedIdea => {
            if (fetchedIdea) {
              setSelectedIdea(fetchedIdea);
              setViewDialogOpen(true);
              // Clear highlight from URL to prevent re-opening on refresh
              router.replace('/ideas', { scroll: false });
            }
          })
          .catch(console.error);
      }
    }
  }, [highlightId, initialIdeas, router]);

  const itemsPerPage = 20;

  // Filter and sort ideas (urgent first)
  const filteredIdeas = ideas
    .filter((idea) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !idea.title.toLowerCase().includes(query) &&
          !idea.hook?.toLowerCase().includes(query) &&
          !idea.clientName?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Client filter
      if (clientFilter !== 'all' && idea.clientId !== clientFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && idea.status !== statusFilter) {
        return false;
      }

      // Content type filter (from tab)
      if (contentTypeFilter && idea.contentType !== contentTypeFilter) {
        return false;
      }

      return true;
    })
    // Sort: Urgent ideas first, then by creation date (newest first)
    .sort((a, b) => {
      // Urgent items come first
      if (a.priority === 'Urgent' && b.priority !== 'Urgent') return -1;
      if (a.priority !== 'Urgent' && b.priority === 'Urgent') return 1;
      // Then sort by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Pagination
  const totalPages = Math.ceil(filteredIdeas.length / itemsPerPage);
  const paginatedIdeas = filteredIdeas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Send to client (moves to "Needs Review" status)
  const handleSendToClient = async (idea: Idea) => {
    setIsSendingToClient(idea.id);
    try {
      const response = await fetch(`/api/ideas/${idea.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Needs Review' }),
      });

      if (!response.ok) throw new Error('Failed to send to client');

      setIdeas((prev) =>
        prev.map((i) =>
          i.id === idea.id ? { ...i, status: 'Needs Review' as IdeaStatus } : i
        )
      );
      toast.success('Idea sent to client for review');
      router.refresh();
    } catch (error) {
      toast.error('Failed to send idea to client');
      console.error(error);
    } finally {
      setIsSendingToClient(null);
    }
  };

  // Delete idea
  const handleDelete = async () => {
    if (!selectedIdea) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/ideas/${selectedIdea.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete idea');

      setIdeas((prev) => prev.filter((i) => i.id !== selectedIdea.id));
      toast.success('Idea deleted');
      router.refresh();
      setDeleteDialogOpen(false);
      setSelectedIdea(null);
    } catch (error) {
      toast.error('Failed to delete idea');
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Update status
  const handleStatusChange = async (idea: Idea, newStatus: IdeaStatus) => {
    try {
      const response = await fetch(`/api/ideas/${idea.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      setIdeas((prev) =>
        prev.map((i) => (i.id === idea.id ? { ...i, status: newStatus } : i))
      );
      toast.success('Status updated');
      router.refresh();
    } catch (error) {
      toast.error('Failed to update status');
      console.error(error);
    }
  };

  // Multi-select handlers
  const toggleSelection = useCallback((ideaId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ideaId)) {
        newSet.delete(ideaId);
      } else {
        newSet.add(ideaId);
      }
      return newSet;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    const allIds = filteredIdeas.map(i => i.id);
    setSelectedIds(new Set(allIds));
  }, [filteredIdeas]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setIsBulkDeleting(true);
    try {
      const response = await fetch('/api/ideas', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete ideas');
      }

      const result = await response.json();
      toast.success(`Deleted ${result.deleted} idea${result.deleted !== 1 ? 's' : ''}`);
      router.refresh();

      // Remove deleted ideas from local state
      setIdeas(prev => prev.filter(i => !selectedIds.has(i.id)));
      setBulkDeleteDialogOpen(false);
      setSelectedIds(new Set());
      setSelectMode(false);
    } catch (error) {
      toast.error('Failed to delete ideas');
      console.error('Error deleting ideas:', error);
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedIds]);

  const ContentIcon = contentTypeFilter ? contentTypeIcons[contentTypeFilter] : null;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Search ideas..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 bg-zinc-800 border-zinc-700 text-white w-full"
          />
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Select
            value={clientFilter}
            onValueChange={(v) => {
              setClientFilter(v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[160px] bg-zinc-800 border-zinc-700 text-white">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[160px] bg-zinc-800 border-zinc-700 text-white">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Not started">New Ideas</SelectItem>
              <SelectItem value="Needs Review">Needs Review</SelectItem>
              <SelectItem value="Reviewing">Client Reviewing</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Not Approved">Not Approved</SelectItem>
              <SelectItem value="Done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          {/* Multi-select controls */}
          {selectMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllFiltered}
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
                  onClick={() => setBulkDeleteDialogOpen(true)}
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
          <span className="text-sm text-zinc-400">
            {filteredIdeas.length} idea{filteredIdeas.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table - Scrollable on mobile */}
      <div className="rounded-lg border border-zinc-800 overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              {selectMode && (
                <TableHead className="w-[40px]"></TableHead>
              )}
              <TableHead className="text-zinc-400 w-[35%] min-w-[200px]">Idea</TableHead>
              <TableHead className="text-zinc-400">Client</TableHead>
              <TableHead className="text-zinc-400">Type</TableHead>
              <TableHead className="text-zinc-400">Style</TableHead>
              <TableHead className="text-zinc-400">Priority</TableHead>
              <TableHead className="text-zinc-400">Status</TableHead>
              <TableHead className="text-zinc-400">Source</TableHead>
              <TableHead className="text-zinc-400 w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedIdeas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={selectMode ? 9 : 8} className="text-center py-8 text-zinc-500">
                  No ideas found
                </TableCell>
              </TableRow>
            ) : (
              paginatedIdeas.map((idea) => {
                const TypeIcon = contentTypeIcons[idea.contentType];
                // Create a 2-line summary from hook or script
                const summary = idea.hook || idea.script || '';
                const isUrgent = idea.priority === 'Urgent';
                const isSelected = selectedIds.has(idea.id);
                return (
                  <TableRow
                    key={idea.id}
                    className={cn(
                      "border-zinc-800 hover:bg-zinc-800/50 cursor-pointer",
                      isUrgent && "bg-red-950/30 border-l-2 border-l-red-500",
                      isSelected && "bg-blue-950/30"
                    )}
                    onClick={() => {
                      if (selectMode) {
                        toggleSelection(idea.id);
                      } else {
                        setSelectedIdea(idea);
                        setViewDialogOpen(true);
                      }
                    }}
                  >
                    {selectMode && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelection(idea.id)}
                          className="border-zinc-600"
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {isUrgent && (
                            <span className="text-red-500 text-xs font-bold animate-pulse">🚨</span>
                          )}
                          <p className="font-medium text-white line-clamp-1">
                            {idea.title}
                          </p>
                        </div>
                        {summary && (
                          <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                            {truncateToTwoLines(summary)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-300 text-sm">
                      {idea.clientName || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <TypeIcon className="w-4 h-4 text-zinc-400" />
                        <span className="text-zinc-300 text-xs">{idea.contentType}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-400 text-xs">
                      {idea.style || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn('text-xs', priorityColors[idea.priority])}
                      >
                        {idea.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Select
                          value={idea.status}
                          onValueChange={(v) => handleStatusChange(idea, v as IdeaStatus)}
                        >
                          <SelectTrigger
                            className={cn(
                              "w-[120px] h-7 text-xs border",
                              statusColors[idea.status]
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-800 border-zinc-700">
                            <SelectItem value="Not started">New Ideas</SelectItem>
                            <SelectItem value="Needs Review">Needs Review</SelectItem>
                            <SelectItem value="Reviewing">Reviewing</SelectItem>
                            <SelectItem value="Approved">Approved</SelectItem>
                            <SelectItem value="Not Approved">Not Approved</SelectItem>
                            <SelectItem value="Done">Done</SelectItem>
                          </SelectContent>
                        </Select>
                        {/* Show rejection reason below status if rejected */}
                        {idea.status === 'Not Approved' && idea.rejectionReason && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30"
                          >
                            {idea.rejectionReason}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-400 text-xs">
                      {idea.source || '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-800 border-zinc-700">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedIdea(idea);
                              setViewDialogOpen(true);
                            }}
                            className="text-zinc-300"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {(idea.status === 'Not started' || idea.status === 'Ideas') && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendToClient(idea);
                              }}
                              disabled={isSendingToClient === idea.id}
                              className="text-zinc-300"
                            >
                              {isSendingToClient === idea.id ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4 mr-2" />
                              )}
                              Send to Client
                            </DropdownMenuItem>
                          )}
                          {idea.url && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(idea.url, '_blank');
                              }}
                              className="text-zinc-300"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Open URL
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-zinc-700" />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedIdea(idea);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-red-400 focus:text-red-400"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-400">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredIdeas.length)} of{' '}
            {filteredIdeas.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="border-zinc-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-zinc-400">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="border-zinc-700"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* View Idea Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedIdea?.title}</DialogTitle>
            <DialogDescription className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={cn('text-xs', statusColors[selectedIdea?.status || 'Not started'])}>
                {selectedIdea?.status}
              </Badge>
              {selectedIdea?.clientName && (
                <span className="text-zinc-400">• {selectedIdea.clientName}</span>
              )}
              {selectedIdea?.contentType && (
                <span className="text-zinc-400">• {selectedIdea.contentType}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Rejection Details - shown prominently if rejected */}
            {selectedIdea?.status === 'Not Approved' && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-xs text-red-400 font-medium mb-2">Rejection Details</p>
                {selectedIdea.rejectionReason && (
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                      {selectedIdea.rejectionReason}
                    </Badge>
                  </div>
                )}
                {selectedIdea.rejectionNote && (
                  <p className="text-sm text-zinc-300">{selectedIdea.rejectionNote}</p>
                )}
                {!selectedIdea.rejectionReason && !selectedIdea.rejectionNote && (
                  <p className="text-sm text-zinc-500 italic">No rejection details provided</p>
                )}
              </div>
            )}

            {selectedIdea?.angle && (
              <div>
                <p className="text-xs text-zinc-500 mb-1">Angle</p>
                <p className="text-zinc-300 whitespace-pre-wrap">{selectedIdea.angle}</p>
              </div>
            )}
            {selectedIdea?.hook && (
              <div>
                <p className="text-xs text-zinc-500 mb-1">Hook</p>
                <p className="text-zinc-300">{selectedIdea.hook}</p>
              </div>
            )}
            {selectedIdea?.script && (
              <div>
                <p className="text-xs text-zinc-500 mb-1">Script</p>
                <p className="text-zinc-300 whitespace-pre-wrap">{selectedIdea.script}</p>
              </div>
            )}
            {selectedIdea?.source && (
              <div>
                <p className="text-xs text-zinc-500 mb-1">Source</p>
                <p className="text-zinc-300">{selectedIdea.source}</p>
              </div>
            )}
            {selectedIdea?.sourceLink && (
              <div>
                <p className="text-xs text-zinc-500 mb-1">Source Link</p>
                <a
                  href={selectedIdea.sourceLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline flex items-center gap-1"
                >
                  {selectedIdea.sourceLink}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            {selectedIdea?.style && (
              <div>
                <p className="text-xs text-zinc-500 mb-1">Style</p>
                <p className="text-zinc-300">{selectedIdea.style}</p>
              </div>
            )}
            {selectedIdea?.url && (
              <div>
                <p className="text-xs text-zinc-500 mb-1">Reference URL</p>
                <a
                  href={selectedIdea.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline flex items-center gap-1"
                >
                  {selectedIdea.url}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            {selectedIdea?.briefUrl && (
              <div>
                <p className="text-xs text-zinc-500 mb-1">Brief URL</p>
                <a
                  href={selectedIdea.briefUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline flex items-center gap-1"
                >
                  {selectedIdea.briefUrl}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {(selectedIdea?.status === 'Not started' || selectedIdea?.status === 'Ideas') && (
              <Button
                onClick={() => {
                  if (selectedIdea) handleSendToClient(selectedIdea);
                  setViewDialogOpen(false);
                }}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                Send to Client
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setViewDialogOpen(false)}
              className="border-zinc-700"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Idea</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedIdea?.title}"? This action cannot be undone.
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Delete {selectedIds.size} idea{selectedIds.size !== 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This action cannot be undone. The selected idea{selectedIds.size !== 1 ? 's' : ''} will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isBulkDeleting ? (
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
    </div>
  );
}
