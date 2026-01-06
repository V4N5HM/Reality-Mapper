'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Content, ContentStatus, ContentType, Client } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { GripVertical, Loader2, MoreVertical, Scissors, Link2, Eye, Calendar, Trash2, X, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import { ContentDetailModal } from './content-detail-modal';
import { contentTypeIcons, columnBorderColors } from '@/lib/ui-constants';

interface PipelineColumn {
  id: ContentStatus;
  title: string;
  items: Content[];
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  roles?: string[];
  teamRole?: string;
  isAdmin?: boolean;
}

interface PipelineBoardProps {
  columns: PipelineColumn[];
  contentType: ContentType;
  clients?: Client[];
  teamMembers?: TeamMember[];
  onStatusChange?: (contentId: string, newStatus: ContentStatus) => void;
  highlightId?: string | null;
}

export function PipelineBoard({ columns: initialColumns, contentType, clients, teamMembers = [], onStatusChange, highlightId }: PipelineBoardProps) {
  const router = useRouter();
  const [columns, setColumns] = useState<PipelineColumn[]>(initialColumns);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync columns with prop changes (for filtering)
  useEffect(() => {
    setColumns(initialColumns);
  }, [initialColumns]);

  // Clear selection when exiting select mode
  useEffect(() => {
    if (!selectMode) {
      setSelectedIds(new Set());
    }
  }, [selectMode]);

  // Auto-open detail modal when highlightId is provided
  useEffect(() => {
    if (highlightId) {
      // Find the content item with this ID across all columns
      for (const column of initialColumns) {
        const item = column.items.find(i => i.id === highlightId);
        if (item) {
          setSelectedContent(item);
          setDetailModalDefaultTab('details');
          setDetailModalOpen(true);
          // Clear highlight from URL to prevent re-opening on refresh
          router.replace('/pipeline', { scroll: false });
          break;
        }
      }
    }
  }, [highlightId, initialColumns, router]);

  const [clipDialogOpen, setClipDialogOpen] = useState(false);
  const [selectedParentContent, setSelectedParentContent] = useState<Content | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [detailModalDefaultTab, setDetailModalDefaultTab] = useState<'details' | 'links' | 'notes' | 'clips'>('details');
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [pendingScheduleData, setPendingScheduleData] = useState<{
    contentId: string;
    newColumns: PipelineColumn[];
    originalColumns: PipelineColumn[];
  } | null>(null);

  // Frame.io link dialog state
  const [frameIoDialogOpen, setFrameIoDialogOpen] = useState(false);
  const [pendingFrameIoData, setPendingFrameIoData] = useState<{
    contentId: string;
    newColumns: PipelineColumn[];
    originalColumns: PipelineColumn[];
  } | null>(null);

  // Toggle selection for an item
  const toggleSelection = (contentId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contentId)) {
        newSet.delete(contentId);
      } else {
        newSet.add(contentId);
      }
      return newSet;
    });
  };

  // Select all items
  const selectAll = () => {
    const allIds = columns.flatMap(col => col.items.map(item => item.id));
    setSelectedIds(new Set(allIds));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Bulk delete selected items
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    setIsDeleting(true);
    const idsToDelete = Array.from(selectedIds);
    const successfullyDeleted = new Set<string>();
    let failCount = 0;

    for (const id of idsToDelete) {
      try {
        const response = await fetch(`/api/content/${id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          successfullyDeleted.add(id);
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
        console.error('Error deleting content:', error);
      }
    }

    // Remove only successfully deleted items from columns (optimistic update)
    if (successfullyDeleted.size > 0) {
      setColumns(prevColumns =>
        prevColumns.map(col => ({
          ...col,
          items: col.items.filter(item => !successfullyDeleted.has(item.id)),
        }))
      );
    }

    setIsDeleting(false);
    setDeleteConfirmOpen(false);
    setSelectedIds(new Set());
    setSelectMode(false);

    if (failCount === 0) {
      toast.success(`Deleted ${successfullyDeleted.size} item${successfullyDeleted.size !== 1 ? 's' : ''}`);
    } else if (successfullyDeleted.size === 0) {
      toast.error('Failed to delete items');
    } else {
      toast.warning(`Deleted ${successfullyDeleted.size} item${successfullyDeleted.size !== 1 ? 's' : ''}, ${failCount} failed`);
    }
  };

  const handleCreateClip = (content: Content) => {
    setSelectedParentContent(content);
    setClipDialogOpen(true);
  };

  const handleClipCreated = () => {
    // Refresh the page to show new clip
    window.location.reload();
  };

  const handleOpenDetail = (content: Content) => {
    setSelectedContent(content);
    setDetailModalDefaultTab('details');
    setDetailModalOpen(true);
  };

  const handleAddLink = (content: Content) => {
    setSelectedContent(content);
    setDetailModalDefaultTab('links');
    setDetailModalOpen(true);
  };

  const handleContentUpdate = (updatedContent: Content) => {
    // Update the content in the columns
    setColumns(prevColumns =>
      prevColumns.map(col => ({
        ...col,
        items: col.items.map(item =>
          item.id === updatedContent.id ? updatedContent : item
        ),
      }))
    );
  };

  const handleContentDelete = (contentId: string) => {
    // Remove content from columns
    setColumns(prevColumns =>
      prevColumns.map(col => ({
        ...col,
        items: col.items.filter(item => item.id !== contentId),
      }))
    );
  };

  // Filter to only show columns with items or key stages
  const keyStages: ContentStatus[] = contentType === 'Short Form'
    ? ['Filmed', 'In Progress', 'PC Feedback', 'Client Feedback', 'Approved', 'Not Approved', 'Scheduled', 'Posted']
    : contentType === 'YouTube'
    ? ['Research', 'Brief', 'Filmed', 'Edit', 'Thumbnail Design', 'PC Review', 'Client Review', 'Final Review', 'To Schedule', 'Scheduled', 'Live', 'Live: 24 Hour Review', 'Live: 48 Hour Review', 'Live: 5 Day Review', 'Complete']
    : ['Guest Booked', 'Research', 'Brief', 'Filmed', 'Edit', 'Thumbnail Design', 'PC Review', 'Client Review', 'Final Review', 'To Schedule', 'Scheduled', 'Live', 'Live: 24 Hour Review', 'Live: 48 Hour Review', 'Live: 5 Day Review', 'Complete'];

  const visibleColumns = columns.filter(
    (col) => keyStages.includes(col.id) || col.items.length > 0
  );

  // Statuses that require a scheduled date (To Schedule is just a holding area, no date needed)
  const schedulingStatuses: ContentStatus[] = ['Scheduled'];

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

    const sourceColumn = columns.find((col) => col.id === source.droppableId);
    const destColumn = columns.find((col) => col.id === destination.droppableId);

    if (!sourceColumn || !destColumn) return;

    const draggedItem = sourceColumn.items.find((item) => item.id === draggableId);
    if (!draggedItem) return;

    // Optimistic update - move item immediately
    const newColumns = columns.map((col) => {
      if (col.id === source.droppableId) {
        return {
          ...col,
          items: col.items.filter((item) => item.id !== draggableId),
        };
      }
      if (col.id === destination.droppableId) {
        const newItems = [...col.items];
        const updatedItem = { ...draggedItem, status: col.id as ContentStatus };
        newItems.splice(destination.index, 0, updatedItem);
        return {
          ...col,
          items: newItems,
        };
      }
      return col;
    });

    setColumns(newColumns);
    setUpdatingId(draggableId);

    // Only update if status changed
    if (source.droppableId !== destination.droppableId) {
      const newStatus = destination.droppableId as ContentStatus;

      // If moving to Client Feedback and no Frame.io link, prompt for it
      // Only require Frame.io link for YouTube/Podcast, not Short Form
      if (newStatus === 'Client Feedback' && !draggedItem.frameIoLink && draggedItem.contentType !== 'Short Form') {
        setPendingFrameIoData({
          contentId: draggableId,
          newColumns,
          originalColumns: columns,
        });
        setFrameIoDialogOpen(true);
        setUpdatingId(null);
        return;
      }

      // If moving to a scheduling status and no date is set, prompt for date
      if (schedulingStatuses.includes(newStatus) && !draggedItem.scheduledDate) {
        setPendingScheduleData({
          contentId: draggableId,
          newColumns,
          originalColumns: columns,
        });
        setScheduleDialogOpen(true);
        setUpdatingId(null);
        return;
      }

      try {
        const response = await fetch(`/api/content/${draggableId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) {
          throw new Error('Failed to update status');
        }

        toast.success(`Moved to ${newStatus}`);
        onStatusChange?.(draggableId, newStatus);
        // Refresh to sync with server
        router.refresh();
      } catch (error) {
        // Revert on error
        setColumns(columns);
        toast.error('Failed to update status. Please try again.');
        console.error('Error updating content status:', error);
      }
    }

    setUpdatingId(null);
  }, [columns, onStatusChange, router]);

  // Handle schedule dialog confirmation
  const handleScheduleConfirm = async (scheduledDate: string) => {
    if (!pendingScheduleData) return;

    setUpdatingId(pendingScheduleData.contentId);
    try {
      // Update both status and scheduled date
      const response = await fetch(`/api/content/${pendingScheduleData.contentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Scheduled',
          scheduledDate
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      // Update local state with the scheduled date
      setColumns(pendingScheduleData.newColumns.map(col => ({
        ...col,
        items: col.items.map(item =>
          item.id === pendingScheduleData.contentId
            ? { ...item, scheduledDate }
            : item
        )
      })));

      toast.success(`Scheduled for ${new Date(scheduledDate).toLocaleDateString()}`);
      onStatusChange?.(pendingScheduleData.contentId, 'Scheduled');
      router.refresh();
    } catch (error) {
      // Revert on error
      setColumns(pendingScheduleData.originalColumns);
      toast.error('Failed to schedule content. Please try again.');
      console.error('Error scheduling content:', error);
    } finally {
      setUpdatingId(null);
      setPendingScheduleData(null);
      setScheduleDialogOpen(false);
    }
  };

  // Handle schedule dialog cancel
  const handleScheduleCancel = () => {
    if (pendingScheduleData) {
      // Revert to original columns
      setColumns(pendingScheduleData.originalColumns);
    }
    setPendingScheduleData(null);
    setScheduleDialogOpen(false);
  };

  // Handle Frame.io dialog confirmation
  const handleFrameIoConfirm = async (frameIoLink: string) => {
    if (!pendingFrameIoData) return;

    setUpdatingId(pendingFrameIoData.contentId);
    try {
      // Update both status and Frame.io link
      const response = await fetch(`/api/content/${pendingFrameIoData.contentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Client Feedback',
          frameIoLink
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      // Update local state with the Frame.io link
      setColumns(pendingFrameIoData.newColumns.map(col => ({
        ...col,
        items: col.items.map(item =>
          item.id === pendingFrameIoData.contentId
            ? { ...item, frameIoLink }
            : item
        )
      })));

      toast.success('Sent to Client Feedback with Frame.io link');
      onStatusChange?.(pendingFrameIoData.contentId, 'Client Feedback');
      router.refresh();
    } catch (error) {
      // Revert on error
      setColumns(pendingFrameIoData.originalColumns);
      toast.error('Failed to send to client feedback. Please try again.');
      console.error('Error sending to client feedback:', error);
    } finally {
      setUpdatingId(null);
      setPendingFrameIoData(null);
      setFrameIoDialogOpen(false);
    }
  };

  // Handle Frame.io dialog cancel
  const handleFrameIoCancel = () => {
    if (pendingFrameIoData) {
      // Revert to original columns
      setColumns(pendingFrameIoData.originalColumns);
    }
    setPendingFrameIoData(null);
    setFrameIoDialogOpen(false);
  };

  const totalItems = columns.reduce((sum, col) => sum + col.items.length, 0);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      {/* Selection toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant={selectMode ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectMode(!selectMode)}
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
                Select All ({totalItems})
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
        {selectMode && selectedIds.size > 0 && (
          <div className="flex items-center gap-3">
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
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {visibleColumns.map((column) => (
          <div key={column.id} className="flex-shrink-0 w-72">
            <Card className={cn(
              'bg-zinc-900 border-zinc-800 border-t-2',
              columnBorderColors[column.id] || 'border-t-zinc-700'
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-zinc-300">
                    {column.title}
                  </CardTitle>
                  <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">
                    {column.items.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-2">
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'min-h-[500px] rounded-lg transition-colors',
                        snapshot.isDraggingOver && 'bg-zinc-800/50'
                      )}
                    >
                      <ScrollArea className="h-[500px]">
                        <div className="space-y-2 p-1">
                          {column.items.length === 0 && !snapshot.isDraggingOver ? (
                            <div className="h-20 border-2 border-dashed border-zinc-800 rounded-lg flex items-center justify-center">
                              <p className="text-xs text-zinc-600">Drop here</p>
                            </div>
                          ) : (
                            column.items.map((item, index) => (
                              <Draggable
                                key={item.id}
                                draggableId={item.id}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                  >
                                    <ContentCard
                                      content={item}
                                      isDragging={snapshot.isDragging}
                                      isUpdating={updatingId === item.id}
                                      onCreateClip={handleCreateClip}
                                      onClick={() => handleOpenDetail(item)}
                                      onAddLink={handleAddLink}
                                      selectMode={selectMode}
                                      isSelected={selectedIds.has(item.id)}
                                      onToggleSelect={() => toggleSelection(item.id)}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))
                          )}
                          {provided.placeholder}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {selectedParentContent && (
        <CreateClipDialog
          open={clipDialogOpen}
          onOpenChange={setClipDialogOpen}
          parentContent={selectedParentContent}
          onClipCreated={handleClipCreated}
        />
      )}

      <ContentDetailModal
        content={selectedContent}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onUpdate={handleContentUpdate}
        onDelete={handleContentDelete}
        clients={clients}
        teamMembers={teamMembers}
        defaultTab={detailModalDefaultTab}
      />

      <ScheduleDateDialog
        open={scheduleDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleScheduleCancel();
        }}
        onConfirm={handleScheduleConfirm}
        onCancel={handleScheduleCancel}
      />

      <FrameIoLinkDialog
        open={frameIoDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleFrameIoCancel();
        }}
        onConfirm={handleFrameIoConfirm}
        onCancel={handleFrameIoCancel}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected content will be permanently deleted.
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
    </DragDropContext>
  );
}

interface CreateClipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentContent: Content;
  onClipCreated: (clip: Content) => void;
}

function CreateClipDialog({ open, onOpenChange, parentContent, onClipCreated }: CreateClipDialogProps) {
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          clientId: parentContent.clientId,
          contentType: 'Short Form',
          status: 'Filmed',
          parentContentId: parentContent.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to create clip');

      const newClip = await response.json();
      toast.success('Clip created and linked to parent');
      onClipCreated(newClip);
      onOpenChange(false);
      setTitle('');
    } catch (error) {
      toast.error('Failed to create clip');
      console.error('Error creating clip:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white">Create Clip from {parentContent.contentType}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
            <p className="text-xs text-zinc-500 mb-1">Parent Content</p>
            <p className="text-sm text-white">{parentContent.title}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="clipTitle" className="text-zinc-300">Clip Title</Label>
            <Input
              id="clipTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Key moment from episode..."
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-zinc-700 text-zinc-300">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!title.trim() || isCreating} className="gap-2">
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
            {isCreating ? 'Creating...' : 'Create Clip'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ContentCardProps {
  content: Content;
  isDragging?: boolean;
  isUpdating?: boolean;
  onCreateClip?: (content: Content) => void;
  onClick?: () => void;
  onAddLink?: (content: Content) => void;
  selectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

function ContentCard({ content, isDragging, isUpdating, onCreateClip, onClick, onAddLink, selectMode, isSelected, onToggleSelect }: ContentCardProps) {
  const Icon = contentTypeIcons[content.contentType];
  const canCreateClips = content.contentType === 'YouTube' || content.contentType === 'Podcast';
  const hasChildClips = content.childClipIds && content.childClipIds.length > 0;
  const hasParent = !!content.parentContentId;

  return (
    <div
      className={cn(
        'group bg-zinc-800 rounded-lg p-3 transition-all',
        selectMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
        isDragging && 'shadow-lg shadow-black/50 rotate-2 scale-105',
        isUpdating && 'opacity-70',
        !isDragging && 'hover:bg-zinc-700/50',
        isSelected && 'ring-2 ring-blue-500 bg-blue-500/10'
      )}
      onClick={(e) => {
        if (selectMode) {
          e.stopPropagation();
          onToggleSelect?.();
        }
      }}
      onDoubleClick={(e) => {
        if (!selectMode) {
          e.stopPropagation();
          onClick?.();
        }
      }}
    >
      <div className="flex items-start gap-2">
        {selectMode ? (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect?.()}
            className="mt-0.5 border-zinc-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <GripVertical className={cn(
            'w-4 h-4 text-zinc-600 mt-0.5 transition-opacity',
            isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white truncate flex-1">{content.title}</p>
            {isUpdating && (
              <Loader2 className="w-3 h-3 text-zinc-400 animate-spin" />
            )}
            {!selectMode && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <button className="p-1 rounded hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-3 h-3 text-zinc-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-zinc-800 border-zinc-700">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onClick?.();
                    }}
                    className="cursor-pointer gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddLink?.(content);
                    }}
                    className="cursor-pointer gap-2"
                  >
                    <Link2 className="w-4 h-4" />
                    Add Video Link
                  </DropdownMenuItem>
                  {canCreateClips && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateClip?.(content);
                      }}
                      className="cursor-pointer gap-2"
                    >
                      <Scissors className="w-4 h-4" />
                      Create Short Form Clip
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className={cn(
              'p-1 rounded',
              content.contentType === 'Short Form'
                ? 'bg-blue-500/10'
                : content.contentType === 'YouTube'
                ? 'bg-red-500/10'
                : 'bg-purple-500/10'
            )}>
              <Icon className={cn(
                'w-3 h-3',
                content.contentType === 'Short Form'
                  ? 'text-blue-500'
                  : content.contentType === 'YouTube'
                  ? 'text-red-500'
                  : 'text-purple-500'
              )} />
            </div>
            {content.clientName && (
              <span className="text-xs text-zinc-500 truncate">{content.clientName}</span>
            )}
            {hasChildClips && (
              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30 gap-1">
                <Scissors className="w-2.5 h-2.5" />
                {content.childClipIds!.length} clips
              </Badge>
            )}
            {hasParent && (
              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/30 gap-1">
                <Link2 className="w-2.5 h-2.5" />
                Clip
              </Badge>
            )}
            {hasParent && content.podcastClipStyle && (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/30">
                {content.podcastClipStyle}
              </Badge>
            )}
          </div>
          {content.scheduledDate && (
            <p className="text-xs text-zinc-500 mt-2">
              {new Date(content.scheduledDate + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Schedule Date Dialog - shown when content is moved to Scheduled status
interface ScheduleDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (scheduledDate: string) => void;
  onCancel: () => void;
}

function ScheduleDateDialog({ open, onOpenChange, onConfirm, onCancel }: ScheduleDateDialogProps) {
  const [scheduledDate, setScheduledDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default to tomorrow
  const getDefaultDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const handleConfirm = async () => {
    const dateToUse = scheduledDate || getDefaultDate();
    if (!dateToUse) return;
    setIsSubmitting(true);
    await onConfirm(dateToUse);
    setScheduledDate('');
    setIsSubmitting(false);
  };

  const handleCancel = () => {
    setScheduledDate('');
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-yellow-500" />
            Schedule Content
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-zinc-400">
            Choose a date to schedule this content. The date will be synced to the calendar.
          </p>
          <div className="space-y-2">
            <Label htmlFor="scheduleDate" className="text-zinc-300">Scheduled Date</Label>
            <Input
              id="scheduleDate"
              type="date"
              value={scheduledDate || getDefaultDate()}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            className="border-zinc-700 text-zinc-300"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!scheduledDate && !getDefaultDate() || isSubmitting}
            className="gap-2 bg-yellow-600 hover:bg-yellow-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4" />
                Schedule
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Frame.io Link Dialog - shown when content is moved to Client Feedback without a Frame.io link
interface FrameIoLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (frameIoLink: string) => void;
  onCancel: () => void;
}

function FrameIoLinkDialog({ open, onOpenChange, onConfirm, onCancel }: FrameIoLinkDialogProps) {
  const [frameIoLink, setFrameIoLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Validate URL
  const validateUrl = (url: string): boolean => {
    if (!url.trim()) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleConfirm = async () => {
    if (!validateUrl(frameIoLink)) {
      setError('Please enter a valid URL');
      return;
    }
    setError('');
    setIsSubmitting(true);
    await onConfirm(frameIoLink.trim());
    setFrameIoLink('');
    setIsSubmitting(false);
  };

  const handleCancel = () => {
    setFrameIoLink('');
    setError('');
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Link2 className="w-5 h-5 text-purple-500" />
            Add Frame.io Link
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-zinc-400">
            A Frame.io link is required before sending content to the client for review.
          </p>
          <div className="space-y-2">
            <Label htmlFor="frameIoLink" className="text-zinc-300">Frame.io URL</Label>
            <Input
              id="frameIoLink"
              type="url"
              value={frameIoLink}
              onChange={(e) => {
                setFrameIoLink(e.target.value);
                if (error) setError('');
              }}
              placeholder="https://app.frame.io/reviews/..."
              className={cn(
                "bg-zinc-800 border-zinc-700 text-white",
                error && "border-red-500"
              )}
            />
            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}
          </div>
        </div>
        <div className="pt-4 mt-2 border-t border-zinc-800">
          <Button
            variant="outline"
            onClick={handleConfirm}
            disabled={!frameIoLink.trim() || isSubmitting}
            className="w-full border-zinc-700 text-zinc-300"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4 mr-2" />
                Save & Send to Client
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
