'use client';

import { useState, useEffect } from 'react';
import { Content, ContentStatus, ContentType, Client, NotionUser } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Video,
  Youtube,
  Mic,
  Calendar,
  Link2,
  FileText,
  ExternalLink,
  Save,
  Loader2,
  Scissors,
  Clock,
  User,
  MessageSquare,
  StickyNote,
  Trash2,
  AlertTriangle,
  Type,
  Image,
  ScrollText,
  Plus,
  X,
} from 'lucide-react';
import { UserSelect } from '@/components/shared/user-select';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  roles?: string[];
  teamRole?: string;
  isAdmin?: boolean;
}

interface ContentDetailModalProps {
  content: Content | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (content: Content) => void;
  onDelete?: (contentId: string) => void;
  clients?: Client[];
  teamMembers?: TeamMember[];
  defaultTab?: 'details' | 'attributes' | 'links' | 'notes' | 'clips';
  simplifiedStatuses?: boolean; // When true, show only 4 simplified statuses (Filmed, In Progress, Scheduled, Live)
}

// Simplified schedule statuses - only 4 options
const scheduleStatuses: ContentStatus[] = ['Filmed', 'In Progress', 'Scheduled', 'Live'];

// Short Form pipeline stages that map to "In Progress" in schedule view
// (everything between In Progress and Not Approved, inclusive)
const shortFormInProgressStages = ['In Progress', 'PC Feedback', 'Client Feedback', 'Approved', 'To Schedule', 'Not Approved'];

// YouTube/Podcast pipeline stages that map to "In Progress" in schedule view
// (everything between Edit and To Schedule, inclusive)
const ytPodcastInProgressStages = ['Edit', 'Thumbnail Design', 'PC Review', 'Client Review', 'Approved', 'To Schedule'];

// YouTube/Podcast pipeline stages that map to "Live" in schedule view
// (Live and everything after)
const ytPodcastLiveStages = ['Live', 'Live: 24 Hour Review', 'Live: 48 Hour Review', 'Live: 5 Day Review', 'Complete'];

// Map simplified status to actual pipeline status based on content type
function mapScheduleStatusToPipeline(scheduleStatus: ContentStatus, contentType: ContentType): ContentStatus {
  switch (scheduleStatus) {
    case 'Filmed':
      return 'Filmed';
    case 'In Progress':
      // Map to first "in progress" stage for each content type
      return contentType === 'Short Form' ? 'In Progress' : 'Edit';
    case 'Scheduled':
      // Short Form: "Posted" is the scheduled state
      // YouTube/Podcast: "Scheduled" is the scheduled state
      return contentType === 'Short Form' ? 'Posted' : 'Scheduled';
    case 'Live':
      // Short Form: "Posted" is the live state (same as scheduled)
      // YouTube/Podcast: "Live" is the live state
      return contentType === 'Short Form' ? 'Posted' : 'Live';
    default:
      return scheduleStatus;
  }
}

// Map pipeline status to simplified schedule status for display
// scheduledDate is optional - if provided and in the future, Short Form "Posted" shows as "Scheduled"
function mapPipelineStatusToSchedule(pipelineStatus: ContentStatus, contentType: ContentType, scheduledDate?: string | null): ContentStatus {
  // Filmed stage - same for all content types
  if (pipelineStatus === 'Filmed') {
    return 'Filmed';
  }

  if (contentType === 'Short Form') {
    // Short Form: In Progress through Not Approved = "In Progress"
    if (shortFormInProgressStages.includes(pipelineStatus)) {
      return 'In Progress';
    }
    // Short Form: Posted = "Scheduled" if date is in future, "Live" if date has passed
    if (pipelineStatus === 'Posted') {
      if (scheduledDate && scheduledDate.trim()) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const schedDate = new Date(scheduledDate);
        // Only compare if we have a valid date
        if (!isNaN(schedDate.getTime())) {
          schedDate.setHours(0, 0, 0, 0);
          // If scheduled date is in the future or today, show as "Scheduled"
          if (schedDate >= today) {
            return 'Scheduled';
          }
        }
      }
      // Date has passed or no date - show as "Live"
      return 'Live';
    }
  } else {
    // YouTube/Podcast: Edit through To Schedule = "In Progress"
    if (ytPodcastInProgressStages.includes(pipelineStatus)) {
      return 'In Progress';
    }
    // YouTube/Podcast: Scheduled = "Scheduled"
    if (pipelineStatus === 'Scheduled') {
      return 'Scheduled';
    }
    // YouTube/Podcast: Live and after = "Live"
    if (ytPodcastLiveStages.includes(pipelineStatus)) {
      return 'Live';
    }
  }

  // Fallback for any unmapped statuses
  return 'In Progress';
}

const contentTypeIcons = {
  'Short Form': Video,
  'YouTube': Youtube,
  'Podcast': Mic,
};

const shortFormStages: ContentStatus[] = [
  'Filmed', 'In Progress', 'PC Feedback', 'Client Feedback',
  'Approved', 'To Schedule', 'Not Approved', 'Posted'
];

const youtubeStages: ContentStatus[] = [
  'Research', 'Brief', 'Filmed', 'Edit', 'Thumbnail Design',
  'PC Review', 'Client Review', 'Final Review', 'To Schedule', 'Scheduled',
  'Live', 'Live: 24 Hour Review', 'Live: 48 Hour Review', 'Live: 5 Day Review', 'Complete'
];

const podcastStages: ContentStatus[] = [
  'Guest Booked', 'Research', 'Brief', 'Filmed', 'Edit',
  'Thumbnail Design', 'PC Review', 'Client Review', 'Final Review',
  'To Schedule', 'Scheduled', 'Live', 'Live: 24 Hour Review', 'Live: 48 Hour Review',
  'Live: 5 Day Review', 'Complete'
];

function getStagesForType(type: ContentType): ContentStatus[] {
  switch (type) {
    case 'Short Form': return shortFormStages;
    case 'YouTube': return youtubeStages;
    case 'Podcast': return podcastStages;
    default: return shortFormStages;
  }
}

// Interface for clip draft in the create clips dialog
interface ClipDraft {
  id: string;
  title: string;
  transcription: string;
  timestamp: string;
  podcastClipStyle: string; // Podcast Clip Style for clips from YouTube/Podcast
}

export function ContentDetailModal({
  content,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  clients,
  teamMembers = [],
  defaultTab = 'details',
  simplifiedStatuses = false,
}: ContentDetailModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [childClips, setChildClips] = useState<Content[]>([]);
  const [parentContent, setParentContent] = useState<{ id: string; title: string; contentType: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Create clip dialog state
  const [showCreateClipDialog, setShowCreateClipDialog] = useState(false);
  const [isCreatingClip, setIsCreatingClip] = useState(false);
  const [clipDrafts, setClipDrafts] = useState<ClipDraft[]>([
    { id: '1', title: '', transcription: '', timestamp: '', podcastClipStyle: '' }
  ]);

  // Form state - Details
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<ContentStatus>('Filmed');
  const [contentType, setContentType] = useState<ContentType>('Short Form');
  const [scheduledDate, setScheduledDate] = useState('');
  const [assignedEditor, setAssignedEditor] = useState<NotionUser | null>(null);
  const [assignedStrategist, setAssignedStrategist] = useState<string>('');
  const [assignedCoordinator, setAssignedCoordinator] = useState<string>('');
  const [style, setStyle] = useState<string>('');

  // Form state - Attributes
  const [titleOptions, setTitleOptions] = useState('');
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [transcription, setTranscription] = useState('');
  const [script, setScript] = useState('');
  const [copy, setCopy] = useState('');

  // Form state - Links
  const [briefUrl, setBriefUrl] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [frameIoLink, setFrameIoLink] = useState('');
  const [sourceFileDropLink, setSourceFileDropLink] = useState('');

  // Form state - Notes
  const [clientFeedback, setClientFeedback] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState('');

  // Form state - Clip specific
  const [podcastClipStyle, setPodcastClipStyle] = useState<string>('');

  // Initialize form when content changes
  useEffect(() => {
    if (content) {
      // Details
      setTitle(content.title || '');
      setStatus(content.status || 'Filmed');
      setContentType(content.contentType || 'Short Form');
      setScheduledDate(content.scheduledDate?.split('T')[0] || '');
      setAssignedEditor(content.assignedEditor || null);
      setAssignedStrategist(content.assignedStrategist || '');
      setAssignedCoordinator(content.assignedCoordinator || '');
      setStyle(content.style || '');

      // Attributes
      setTitleOptions(content.titleOptions || '');
      setThumbnails(content.thumbnails || []);
      setDescription(content.description || '');
      setTranscription(content.transcription || '');
      setScript(content.script || '');
      setCopy(content.copy || '');

      // Links
      setBriefUrl(content.briefUrl || '');
      setDriveLink(content.driveLink || '');
      setFrameIoLink(content.frameIoLink || '');
      setSourceFileDropLink(content.sourceFileDropLink || '');

      // Notes
      setClientFeedback(content.clientFeedback || '');
      setInternalNotes(content.internalNotes || '');
      setEditingNotes(content.editingNotes || '');

      // Clip specific
      setPodcastClipStyle(content.podcastClipStyle || '');

      // Fetch child clips if this is YouTube or Podcast
      if (content.contentType === 'YouTube' || content.contentType === 'Podcast') {
        fetchChildClips(content.id);
      } else {
        setChildClips([]);
      }

      // Fetch parent content if this is a clip (has parentContentId)
      if (content.parentContentId) {
        fetchParentContent(content.parentContentId);
      } else {
        setParentContent(null);
      }
    }
  }, [content]);

  const fetchParentContent = async (parentId: string) => {
    try {
      const response = await fetch(`/api/content/${parentId}`);
      if (response.ok) {
        const data = await response.json();
        // Extract title from Notion page response
        const title = data.properties?.Title?.title?.[0]?.text?.content || 'Unknown';
        const contentType = data.properties?.['Content Type']?.select?.name || 'Unknown';
        setParentContent({ id: parentId, title, contentType });
      }
    } catch (error) {
      console.error('Error fetching parent content:', error);
      setParentContent(null);
    }
  };

  const fetchChildClips = async (parentId: string) => {
    try {
      const response = await fetch(`/api/content/${parentId}/children`);
      if (response.ok) {
        const clips = await response.json();
        setChildClips(clips);
      }
    } catch (error) {
      console.error('Error fetching child clips:', error);
    }
  };

  const addClipDraft = () => {
    setClipDrafts(prev => [
      ...prev,
      { id: String(Date.now()), title: '', transcription: '', timestamp: '', podcastClipStyle: '' }
    ]);
  };

  const removeClipDraft = (id: string) => {
    if (clipDrafts.length <= 1) return; // Keep at least one
    setClipDrafts(prev => prev.filter(clip => clip.id !== id));
  };

  const updateClipDraft = (id: string, field: keyof ClipDraft, value: string) => {
    setClipDrafts(prev =>
      prev.map(clip => clip.id === id ? { ...clip, [field]: value } : clip)
    );
  };

  const handleCreateClips = async () => {
    if (!content) return;

    // Filter clips with titles
    const validClips = clipDrafts.filter(clip => clip.title.trim());
    if (validClips.length === 0) {
      toast.error('Please add at least one clip with a title');
      return;
    }

    setIsCreatingClip(true);
    let successCount = 0;
    let failCount = 0;

    try {
      // Create all clips in parallel
      // Clips from YouTube/Podcast start as "In Progress" instead of "Filmed"
      const createPromises = validClips.map(async (clip) => {
        try {
          const response = await fetch('/api/content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: clip.title.trim(),
              clientId: content.clientId,
              contentType: 'Short Form',
              status: 'In Progress', // Clips from YouTube/Podcast go to In Progress
              parentContentId: content.id,
              clipTranscription: clip.transcription.trim() || undefined,
              clipTimestamp: clip.timestamp.trim() || undefined,
              podcastClipStyle: clip.podcastClipStyle.trim() || undefined,
            }),
          });

          if (!response.ok) throw new Error('Failed to create clip');
          successCount++;
        } catch (error) {
          failCount++;
          console.error('Error creating clip:', error);
        }
      });

      await Promise.all(createPromises);

      if (successCount > 0) {
        toast.success(`${successCount} clip${successCount > 1 ? 's' : ''} created successfully`);
      }
      if (failCount > 0) {
        toast.error(`Failed to create ${failCount} clip${failCount > 1 ? 's' : ''}`);
      }

      // Reset form and close dialog
      setClipDrafts([{ id: '1', title: '', transcription: '', timestamp: '', podcastClipStyle: '' }]);
      setShowCreateClipDialog(false);

      // Refresh child clips list
      fetchChildClips(content.id);
    } catch (error) {
      toast.error('Failed to create clips');
      console.error('Error creating clips:', error);
    } finally {
      setIsCreatingClip(false);
    }
  };

  const handleSave = async () => {
    if (!content) return;

    setIsLoading(true);
    try {
      // Build payload with only changed/relevant fields
      const payload: Record<string, any> = {
        // Always send these core fields
        title,
        status,
      };

      // Only send contentType if it changed
      if (content && contentType !== content.contentType) {
        payload.contentType = contentType;
      }

      // Only include optional fields if they have values
      if (scheduledDate) payload.scheduledDate = scheduledDate;
      if (assignedEditor?.id) payload.assignedEditor = assignedEditor.id;
      if (assignedStrategist) payload.assignedStrategist = assignedStrategist;
      if (assignedCoordinator) payload.assignedCoordinator = assignedCoordinator;
      if (style && contentType === 'Short Form') payload.style = style;

      // Attributes - only send if not empty
      if (titleOptions) payload.titleOptions = titleOptions;
      if (thumbnails.some(t => t.trim())) payload.thumbnails = thumbnails.filter(t => t.trim());
      if (description) payload.description = description;
      if (transcription) payload.transcription = transcription;
      if (script) payload.script = script;
      if (copy) payload.copy = copy;

      // Links - only send if not empty
      if (briefUrl) payload.briefUrl = briefUrl;
      if (driveLink) payload.driveLink = driveLink;
      if (frameIoLink) payload.frameIoLink = frameIoLink;
      if (sourceFileDropLink) payload.sourceFileDropLink = sourceFileDropLink;

      // Notes - only send if not empty
      if (clientFeedback) payload.clientFeedback = clientFeedback;
      if (internalNotes) payload.internalNotes = internalNotes;
      if (editingNotes) payload.editingNotes = editingNotes;

      // Clip-specific fields - only for clips from YouTube/Podcast
      if (content.parentContentId && podcastClipStyle) payload.podcastClipStyle = podcastClipStyle;

      const response = await fetch(`/api/content/${content.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', errorData);
        // Show detailed error message for validation errors (e.g., invalid URLs)
        const errorMessage = errorData.details || errorData.error || 'Failed to update';
        throw new Error(errorMessage);
      }

      toast.success('Content updated successfully');
      onUpdate?.({
        ...content,
        title,
        status,
        contentType,
        scheduledDate: scheduledDate || undefined,
        assignedEditor: assignedEditor || undefined,
        assignedStrategist: assignedStrategist || undefined,
        assignedCoordinator: assignedCoordinator || undefined,
        style: (contentType === 'Short Form' && style) ? style : undefined,
        titleOptions: titleOptions || undefined,
        thumbnails: thumbnails.filter(t => t.trim()),
        description: description || undefined,
        transcription: transcription || undefined,
        script: script || undefined,
        copy: copy || undefined,
        briefUrl: briefUrl || undefined,
        driveLink: driveLink || undefined,
        frameIoLink: frameIoLink || undefined,
        sourceFileDropLink: sourceFileDropLink || undefined,
        clientFeedback: clientFeedback || undefined,
        internalNotes: internalNotes || undefined,
        editingNotes: editingNotes || undefined,
        podcastClipStyle: (content.parentContentId && podcastClipStyle) ? podcastClipStyle : undefined,
      });
    } catch (error: any) {
      // Show the specific error message (e.g., "Drive Link is invalid...")
      toast.error(error.message || 'Failed to update content');
      console.error('Error updating content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!content) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/content/${content.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

      toast.success('Content deleted');
      onDelete?.(content.id);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to delete content');
      console.error('Error deleting content:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!content) return null;

  const Icon = contentTypeIcons[contentType];
  const stages = getStagesForType(contentType);
  const clientName = clients?.find(c => c.id === content.clientId)?.name || content.clientName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              contentType === 'Short Form' ? 'bg-blue-500/10' :
                contentType === 'YouTube' ? 'bg-red-500/10' : 'bg-purple-500/10'
            )}>
              <Icon className={cn(
                'w-5 h-5',
                contentType === 'Short Form' ? 'text-blue-500' :
                  contentType === 'YouTube' ? 'text-red-500' : 'text-purple-500'
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-white text-lg">{content.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={cn(
                  "text-xs",
                  contentType !== content.contentType && "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                )}>
                  {contentType}
                  {contentType !== content.contentType && " (changed)"}
                </Badge>
                {clientName && (
                  <span className="text-sm text-zinc-500">{clientName}</span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} key={defaultTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="bg-zinc-800 w-full justify-start flex-wrap">
            <TabsTrigger value="details" className="gap-2">
              <FileText className="w-4 h-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="attributes" className="gap-2">
              <Calendar className="w-4 h-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="links" className="gap-2">
              <Link2 className="w-4 h-4" />
              Links
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Notes
            </TabsTrigger>
            {(contentType === 'YouTube' || contentType === 'Podcast') && (
              <TabsTrigger value="clips" className="gap-2">
                <Scissors className="w-4 h-4" />
                Clips ({childClips.length})
              </TabsTrigger>
            )}
          </TabsList>

          <div className="flex-1 overflow-y-auto py-4">
            <TabsContent value="details" className="mt-0 space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-zinc-300">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-zinc-300">Status</Label>
                <Select
                  value={simplifiedStatuses ? mapPipelineStatusToSchedule(status, contentType, scheduledDate) : status}
                  onValueChange={(v) => {
                    // If using simplified statuses, map back to pipeline status
                    if (simplifiedStatuses) {
                      const pipelineStatus = mapScheduleStatusToPipeline(v as ContentStatus, contentType);
                      setStatus(pipelineStatus);
                    } else {
                      setStatus(v as ContentStatus);
                    }
                  }}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {(simplifiedStatuses ? scheduleStatuses : stages).map((stage) => (
                      <SelectItem key={stage} value={stage} className="text-white">
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Content Type */}
              <div className="space-y-2">
                <Label className="text-zinc-300">Content Type</Label>
                <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="Short Form" className="text-white">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-blue-500" />
                        Short Form
                      </div>
                    </SelectItem>
                    <SelectItem value="YouTube" className="text-white">
                      <div className="flex items-center gap-2">
                        <Youtube className="w-4 h-4 text-red-500" />
                        YouTube
                      </div>
                    </SelectItem>
                    <SelectItem value="Podcast" className="text-white">
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-purple-500" />
                        Podcast
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Style - Only for Short Form */}
              {contentType === 'Short Form' && (
                <div className="space-y-2">
                  <Label className="text-zinc-300">Style</Label>
                  <Select
                    value={style || '__none__'}
                    onValueChange={(v) => setStyle(v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Select style..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="__none__" className="text-zinc-400">None</SelectItem>
                      <SelectItem value="Reaction" className="text-white">Reaction</SelectItem>
                      <SelectItem value="Podcast clip" className="text-white">Podcast clip</SelectItem>
                      <SelectItem value="Storytelling" className="text-white">Storytelling</SelectItem>
                      <SelectItem value="Educational" className="text-white">Educational</SelectItem>
                      <SelectItem value="Carousel" className="text-white">Carousel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Podcast Clip Style - Only for clips from YouTube/Podcast */}
              {content?.parentContentId && (
                <div className="space-y-2">
                  <Label className="text-zinc-300">Podcast Clip Style</Label>
                  <Select
                    value={podcastClipStyle || '__none__'}
                    onValueChange={(v) => setPodcastClipStyle(v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Select clip style..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="__none__" className="text-zinc-400">None</SelectItem>
                      {/* Podcast Clip Style options will be added later */}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Scheduled Date */}
              <div className="space-y-2">
                <Label htmlFor="scheduledDate" className="text-zinc-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Scheduled Date
                </Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>

              <Separator className="bg-zinc-800" />

              {/* Team Assignment */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assignedEditor" className="text-zinc-300 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Assigned Editor
                  </Label>
                  <UserSelect
                    value={assignedEditor?.id}
                    onChange={(_, user) => setAssignedEditor(user || null)}
                    placeholder="Select editor..."
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assignedStrategist" className="text-zinc-300 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Assigned Strategist
                  </Label>
                  <Select
                    value={assignedStrategist || '__none__'}
                    onValueChange={(v) => setAssignedStrategist(v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Select strategist..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="__none__" className="text-zinc-400">None</SelectItem>
                      {/* Filter to only show strategists: Natasha and Kyle */}
                      {teamMembers
                        .filter((member) =>
                          member.name.toLowerCase().includes('natasha') ||
                          member.name.toLowerCase().includes('kyle')
                        )
                        .map((member) => (
                          <SelectItem key={member.id} value={member.name} className="text-white">
                            {member.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Additional Team Assignment */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assignedCoordinator" className="text-zinc-300 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Assigned Coordinator
                  </Label>
                  <Select
                    value={assignedCoordinator || '__none__'}
                    onValueChange={(v) => setAssignedCoordinator(v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Select coordinator..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="__none__" className="text-zinc-400">None</SelectItem>
                      {/* Filter to only show coordinators: Eddie */}
                      {teamMembers
                        .filter((member) => member.name.toLowerCase().includes('eddie'))
                        .map((member) => (
                          <SelectItem key={member.id} value={member.name} className="text-white">
                            {member.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Editing Notes */}
              <div className="space-y-2">
                <Label htmlFor="editingNotes" className="text-zinc-300 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Editing Notes
                </Label>
                <Textarea
                  id="editingNotes"
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder="Notes for the editor..."
                  className="bg-zinc-800 border-zinc-700 text-white min-h-[80px]"
                />
              </div>

              {/* Metadata */}
              <div className="rounded-lg border border-zinc-800 p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Created
                  </span>
                  <span className="text-zinc-300">
                    {new Date(content.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Updated
                  </span>
                  <span className="text-zinc-300">
                    {new Date(content.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                {content.ideaSourceId && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500 flex items-center gap-2">
                      <StickyNote className="w-4 h-4" />
                      From Idea
                    </span>
                    <Badge variant="outline" className="text-xs">Linked</Badge>
                  </div>
                )}
                {content.parentContentId && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500 flex items-center gap-2">
                      {parentContent?.contentType === 'Podcast' ? (
                        <Mic className="w-4 h-4" />
                      ) : parentContent?.contentType === 'YouTube' ? (
                        <Youtube className="w-4 h-4" />
                      ) : (
                        <Link2 className="w-4 h-4" />
                      )}
                      Clip from {parentContent?.contentType || 'Content'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto py-1 px-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                      onClick={() => {
                        // Use the actual contentType from parentContent, fallback to YouTube only if unknown
                        const pipelineType = parentContent?.contentType || 'YouTube';
                        window.location.href = `/pipeline?type=${pipelineType}&highlight=${content.parentContentId}`;
                      }}
                    >
                      {parentContent?.title || 'View Parent'}
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="attributes" className="mt-0 space-y-4">
              {/* Title Options */}
              <div className="space-y-2">
                <Label htmlFor="titleOptions" className="text-zinc-300 flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  Title Options
                </Label>
                <Textarea
                  id="titleOptions"
                  value={titleOptions}
                  onChange={(e) => setTitleOptions(e.target.value)}
                  placeholder="Alternative title options..."
                  className="bg-zinc-800 border-zinc-700 text-white min-h-[80px]"
                />
              </div>

              {/* Thumbnails - Multiple URLs */}
              <div className="space-y-2">
                <Label className="text-zinc-300 flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Thumbnails
                </Label>
                <div className="space-y-2">
                  {thumbnails.map((thumb, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={thumb}
                        onChange={(e) => {
                          const newThumbs = [...thumbnails];
                          newThumbs[index] = e.target.value;
                          setThumbnails(newThumbs);
                        }}
                        placeholder="https://..."
                        className="bg-zinc-800 border-zinc-700 text-white flex-1"
                      />
                      {thumb && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-zinc-700"
                          onClick={() => window.open(thumb, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-zinc-700 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => {
                          const newThumbs = thumbnails.filter((_, i) => i !== index);
                          setThumbnails(newThumbs);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-zinc-700 text-zinc-400 hover:text-zinc-300"
                    onClick={() => setThumbnails([...thumbnails, ''])}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Thumbnail
                  </Button>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-zinc-300">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Video description..."
                  className="bg-zinc-800 border-zinc-700 text-white min-h-[100px]"
                />
              </div>

              {/* Transcription */}
              <div className="space-y-2">
                <Label htmlFor="transcription" className="text-zinc-300">Transcription</Label>
                <Textarea
                  id="transcription"
                  value={transcription}
                  onChange={(e) => setTranscription(e.target.value)}
                  placeholder="Video transcription..."
                  className="bg-zinc-800 border-zinc-700 text-white min-h-[100px]"
                />
              </div>

              {/* Script */}
              <div className="space-y-2">
                <Label htmlFor="script" className="text-zinc-300 flex items-center gap-2">
                  <ScrollText className="w-4 h-4" />
                  Script
                </Label>
                <Textarea
                  id="script"
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="Video script..."
                  className="bg-zinc-800 border-zinc-700 text-white min-h-[100px]"
                />
              </div>

              {/* Caption (formerly Copy) */}
              <div className="space-y-2">
                <Label htmlFor="copy" className="text-zinc-300">Caption</Label>
                <Textarea
                  id="copy"
                  value={copy}
                  onChange={(e) => setCopy(e.target.value)}
                  placeholder="Social caption text..."
                  className="bg-zinc-800 border-zinc-700 text-white min-h-[100px]"
                />
              </div>
            </TabsContent>

            <TabsContent value="links" className="mt-0 space-y-4">
              {/* Short Form Links */}
              {contentType === 'Short Form' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="driveLink" className="text-zinc-300">Source File Link (Asset)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="driveLink"
                        value={driveLink}
                        onChange={(e) => setDriveLink(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="bg-zinc-800 border-zinc-700 text-white flex-1"
                      />
                      {driveLink && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-zinc-700"
                          onClick={() => window.open(driveLink, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sourceFileDropLink" className="text-zinc-300">Dropbox Link (Asset)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="sourceFileDropLink"
                        value={sourceFileDropLink}
                        onChange={(e) => setSourceFileDropLink(e.target.value)}
                        placeholder="https://dropbox.com/..."
                        className="bg-zinc-800 border-zinc-700 text-white flex-1"
                      />
                      {sourceFileDropLink && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-zinc-700"
                          onClick={() => window.open(sourceFileDropLink, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="frameIoLink" className="text-zinc-300">Frame.io Link (Asset)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="frameIoLink"
                        value={frameIoLink}
                        onChange={(e) => setFrameIoLink(e.target.value)}
                        placeholder="https://app.frame.io/..."
                        className="bg-zinc-800 border-zinc-700 text-white flex-1"
                      />
                      {frameIoLink && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-zinc-700"
                          onClick={() => window.open(frameIoLink, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* YouTube / Podcast Links */}
              {(contentType === 'YouTube' || contentType === 'Podcast') && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="driveLink" className="text-zinc-300">Source Files Link (Folder)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="driveLink"
                        value={driveLink}
                        onChange={(e) => setDriveLink(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="bg-zinc-800 border-zinc-700 text-white flex-1"
                      />
                      {driveLink && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-zinc-700"
                          onClick={() => window.open(driveLink, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="briefUrl" className="text-zinc-300">Briefs Link (Folder)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="briefUrl"
                        value={briefUrl}
                        onChange={(e) => setBriefUrl(e.target.value)}
                        placeholder="https://..."
                        className="bg-zinc-800 border-zinc-700 text-white flex-1"
                      />
                      {briefUrl && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-zinc-700"
                          onClick={() => window.open(briefUrl, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sourceFileDropLink" className="text-zinc-300">Dropbox Link (Folder)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="sourceFileDropLink"
                        value={sourceFileDropLink}
                        onChange={(e) => setSourceFileDropLink(e.target.value)}
                        placeholder="https://dropbox.com/..."
                        className="bg-zinc-800 border-zinc-700 text-white flex-1"
                      />
                      {sourceFileDropLink && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-zinc-700"
                          onClick={() => window.open(sourceFileDropLink, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="frameIoLink" className="text-zinc-300">Frame.io Link (Folder)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="frameIoLink"
                        value={frameIoLink}
                        onChange={(e) => setFrameIoLink(e.target.value)}
                        placeholder="https://app.frame.io/..."
                        className="bg-zinc-800 border-zinc-700 text-white flex-1"
                      />
                      {frameIoLink && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-zinc-700"
                          onClick={() => window.open(frameIoLink, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="notes" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientFeedback" className="text-zinc-300">Client Feedback</Label>
                <Textarea
                  id="clientFeedback"
                  value={clientFeedback}
                  onChange={(e) => setClientFeedback(e.target.value)}
                  placeholder="Client feedback notes..."
                  className="bg-zinc-800 border-zinc-700 text-white min-h-[120px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="internalNotes" className="text-zinc-300">Internal Notes</Label>
                <Textarea
                  id="internalNotes"
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Internal team notes..."
                  className="bg-zinc-800 border-zinc-700 text-white min-h-[120px]"
                />
              </div>
            </TabsContent>

            {(contentType === 'YouTube' || contentType === 'Podcast') && (
              <TabsContent value="clips" className="mt-0 space-y-4">
                {/* Create Clip Button */}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
                    onClick={() => setShowCreateClipDialog(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Clip
                  </Button>
                </div>

                {childClips.length === 0 ? (
                  <div className="text-center py-8">
                    <Scissors className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-zinc-500">No clips created from this content yet</p>
                    <p className="text-xs text-zinc-600 mt-1">
                      Click &quot;Create Clip&quot; to add a Short Form clip
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {childClips.map((clip) => (
                      <div
                        key={clip.id}
                        className="p-3 rounded-lg bg-zinc-800 border border-zinc-700"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded bg-blue-500/10">
                              <Video className="w-4 h-4 text-blue-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{clip.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-xs">
                                  {clip.status}
                                </Badge>
                                {clip.clipTimestamp && (
                                  <span className="text-xs text-zinc-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {clip.clipTimestamp}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {clip.scheduledDate && (
                              <span className="text-xs text-zinc-500">
                                {new Date(clip.scheduledDate).toLocaleDateString()}
                              </span>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700"
                              onClick={() => {
                                // Navigate to Short Form pipeline with this clip highlighted
                                window.location.href = `/pipeline?type=Short+Form&highlight=${clip.id}`;
                              }}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View in Pipeline
                            </Button>
                          </div>
                        </div>

                        {/* Show transcription if available */}
                        {clip.clipTranscription && (
                          <div className="mt-2 pt-2 border-t border-zinc-700">
                            <p className="text-xs text-zinc-500 mb-1">Transcription:</p>
                            <p className="text-xs text-zinc-400 line-clamp-3">
                              {clip.clipTranscription}
                            </p>
                          </div>
                        )}

                        {/* Show link to clip if it has a drive/dropbox link */}
                        {(clip.driveLink || clip.sourceFileDropLink) && (
                          <div className="mt-2 pt-2 border-t border-zinc-700 flex gap-2">
                            {clip.driveLink && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-zinc-400 hover:text-white"
                                onClick={() => window.open(clip.driveLink, '_blank')}
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Source File
                              </Button>
                            )}
                            {clip.sourceFileDropLink && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-zinc-400 hover:text-white"
                                onClick={() => window.open(clip.sourceFileDropLink, '_blank')}
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Dropbox
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Create Clips Dialog - Supports Multiple Clips */}
                {showCreateClipDialog && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                      className="absolute inset-0 bg-black/50"
                      onClick={() => setShowCreateClipDialog(false)}
                    />
                    <div className="relative bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Create Clips</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setShowCreateClipDialog(false)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <p className="text-sm text-zinc-500 mb-4">
                        Create Short Form clips from this {contentType}. Each clip will be added to the Short Form pipeline and linked back to this content.
                      </p>

                      {/* Scrollable clips container */}
                      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                        {clipDrafts.map((clip, index) => (
                          <div
                            key={clip.id}
                            className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-zinc-400">
                                Clip {index + 1}
                              </span>
                              {clipDrafts.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  onClick={() => removeClipDraft(clip.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label className="text-zinc-300 text-xs">Clip Title *</Label>
                              <Input
                                value={clip.title}
                                onChange={(e) => updateClipDraft(clip.id, 'title', e.target.value)}
                                placeholder="Enter clip title..."
                                className="bg-zinc-800 border-zinc-700 text-white h-9"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label className="text-zinc-300 text-xs flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Timestamp
                                </Label>
                                <Input
                                  value={clip.timestamp}
                                  onChange={(e) => updateClipDraft(clip.id, 'timestamp', e.target.value)}
                                  placeholder="e.g., 12:30 - 15:45"
                                  className="bg-zinc-800 border-zinc-700 text-white h-9"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-zinc-300 text-xs">Podcast Clip Style</Label>
                                <Select
                                  value={clip.podcastClipStyle || '__none__'}
                                  onValueChange={(value) => updateClipDraft(clip.id, 'podcastClipStyle', value === '__none__' ? '' : value)}
                                >
                                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-9">
                                    <SelectValue placeholder="Select style..." />
                                  </SelectTrigger>
                                  <SelectContent className="bg-zinc-800 border-zinc-700">
                                    <SelectItem value="__none__" className="text-zinc-400">None</SelectItem>
                                    {/* Style options will be added later */}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-zinc-300 text-xs">Transcription</Label>
                              <Textarea
                                value={clip.transcription}
                                onChange={(e) => updateClipDraft(clip.id, 'transcription', e.target.value)}
                                placeholder="Clip transcription..."
                                className="bg-zinc-800 border-zinc-700 text-white min-h-[60px] text-sm"
                              />
                            </div>
                          </div>
                        ))}

                        {/* Add Another Clip Button */}
                        <Button
                          variant="outline"
                          className="w-full border-dashed border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
                          onClick={addClipDraft}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Another Clip
                        </Button>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-800">
                        <span className="text-sm text-zinc-500">
                          {clipDrafts.filter(c => c.title.trim()).length} clip{clipDrafts.filter(c => c.title.trim()).length !== 1 ? 's' : ''} to create
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setClipDrafts([{ id: '1', title: '', transcription: '', timestamp: '', podcastClipStyle: '' }]);
                              setShowCreateClipDialog(false);
                            }}
                            className="border-zinc-700 text-zinc-300"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleCreateClips}
                            disabled={isCreatingClip || !clipDrafts.some(c => c.title.trim())}
                            className="gap-2"
                          >
                            {isCreatingClip ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                            Create {clipDrafts.filter(c => c.title.trim()).length} Clip{clipDrafts.filter(c => c.title.trim()).length !== 1 ? 's' : ''}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            )}
          </div>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          <div>
            {!showDeleteConfirm ? (
              <Button
                variant="ghost"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400">Confirm delete?</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  No
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-zinc-700 text-zinc-300"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading} className="gap-2">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
