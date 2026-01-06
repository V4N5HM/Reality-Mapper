'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { PipelineBoard } from './pipeline-board';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Plus, Video, Youtube, Mic, Loader2, Filter, X, User, FileText, Link2, MessageSquare, Calendar, ExternalLink, Type, Image, ScrollText } from 'lucide-react';
import { ContentType, ContentStatus, Client, PipelineColumn } from '@/types';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserSelect } from '@/components/shared/user-select';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  roles?: string[];
  teamRole?: string;
  isAdmin?: boolean;
}

interface PipelineViewProps {
  shortForm: PipelineColumn[];
  youtube: PipelineColumn[];
  podcast: PipelineColumn[];
  clients: Client[];
  teamMembers?: TeamMember[];
}

const defaultStatuses: Record<ContentType, ContentStatus> = {
  'Short Form': 'Filmed',
  'YouTube': 'Filmed',
  'Podcast': 'Filmed',
};

// Helper to format date as YYYY-MM-DD
function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Find next available date that doesn't have content scheduled for this client and content type
async function findNextAvailableDate(clientId: string, contentType: string): Promise<string> {
  try {
    // Only fetch content with scheduled dates in the next 60 days for better performance
    const today = new Date();
    const dateFrom = formatDateKey(today);
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 60);
    const dateTo = formatDateKey(futureDate);

    // Fetch existing content for this client with date filter
    const params = new URLSearchParams({
      clientId,
      contentType,
      dateFrom,
      dateTo,
      limit: '100',
    });
    const response = await fetch(`/api/content?${params}`);
    if (!response.ok) throw new Error('Failed to fetch schedule');

    const existingContent = await response.json();

    // Get all scheduled dates for this content type
    const scheduledDates = new Set(
      existingContent
        .filter((c: any) => c.scheduledDate)
        .map((c: any) => c.scheduledDate)
    );

    // Start from tomorrow and find the first available date
    let candidateDate = new Date(today);
    candidateDate.setDate(candidateDate.getDate() + 1);

    // Look up to 60 days ahead to find an available slot
    for (let i = 0; i < 60; i++) {
      const dateStr = formatDateKey(candidateDate);
      if (!scheduledDates.has(dateStr)) {
        return dateStr;
      }
      candidateDate.setDate(candidateDate.getDate() + 1);
    }

    // Fallback to tomorrow if all dates are taken
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateKey(tomorrow);
  } catch (error) {
    console.error('Error finding available date:', error);
    // Fallback to tomorrow on error
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateKey(tomorrow);
  }
}

interface NotionUser {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

interface CreateContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  teamMembers: TeamMember[];
  defaultContentType?: ContentType;
  onContentCreated: () => void;
}

// Content type icons mapping
const contentTypeIcons = {
  'Short Form': Video,
  'YouTube': Youtube,
  'Podcast': Mic,
};

function CreateContentDialog({
  open,
  onOpenChange,
  clients,
  teamMembers,
  defaultContentType = 'Short Form',
  onContentCreated,
}: CreateContentDialogProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'attributes' | 'links' | 'notes'>('details');

  // Details tab state
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<ContentType>(defaultContentType);
  const [status, setStatus] = useState<ContentStatus>('Filmed');
  const [style, setStyle] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [assignedEditor, setAssignedEditor] = useState<NotionUser | null>(null);
  const [assignedStrategist, setAssignedStrategist] = useState<string>('');
  const [assignedCoordinator, setAssignedCoordinator] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [editingNotes, setEditingNotes] = useState('');

  // Attributes/Schedule tab state
  const [titleOptions, setTitleOptions] = useState('');
  const [description, setDescription] = useState('');
  const [transcription, setTranscription] = useState('');
  const [script, setScript] = useState('');
  const [copy, setCopy] = useState('');

  // Links tab state
  const [briefUrl, setBriefUrl] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [frameIoLink, setFrameIoLink] = useState('');
  const [sourceFileLink, setSourceFileLink] = useState('');
  const [dropboxLink, setDropboxLink] = useState('');

  // Notes tab state
  const [internalNotes, setInternalNotes] = useState('');
  const [clientFeedback, setClientFeedback] = useState('');

  const [isCreating, setIsCreating] = useState(false);

  // Get selected client name
  const selectedClient = clients.find(c => c.id === clientId);
  const Icon = contentTypeIcons[contentType];

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab('details');
      setTitle('');
      setContentType(defaultContentType);
      setStatus('Filmed');
      setStyle('');
      setScheduledDate('');
      setAssignedEditor(null);
      setAssignedStrategist('');
      setAssignedCoordinator('');
      setClientId('');
      setEditingNotes('');
      setTitleOptions('');
      setDescription('');
      setTranscription('');
      setScript('');
      setCopy('');
      setBriefUrl('');
      setDriveLink('');
      setFrameIoLink('');
      setSourceFileLink('');
      setDropboxLink('');
      setInternalNotes('');
      setClientFeedback('');
    }
  }, [open, defaultContentType]);

  const handleCreate = async () => {
    if (!title.trim() || !clientId) return;

    setIsCreating(true);
    try {
      // Auto-assign scheduled date if not provided and status is 'Filmed'
      let finalScheduledDate = scheduledDate;
      if (!finalScheduledDate && status === 'Filmed') {
        finalScheduledDate = await findNextAvailableDate(clientId, contentType);
      }

      const payload: Record<string, any> = {
        title: title.trim(),
        clientId,
        contentType,
        status,
        scheduledDate: finalScheduledDate || undefined,
      };

      // Add optional fields if provided
      if (assignedEditor?.id) payload.assignedEditor = assignedEditor.id;
      if (assignedStrategist) payload.assignedStrategist = assignedStrategist;
      if (assignedCoordinator) payload.assignedCoordinator = assignedCoordinator;
      if (style && contentType === 'Short Form') payload.style = style;
      if (editingNotes.trim()) payload.editingNotes = editingNotes.trim();
      if (titleOptions.trim()) payload.titleOptions = titleOptions.trim();
      if (description.trim()) payload.description = description.trim();
      if (transcription.trim()) payload.transcription = transcription.trim();
      if (script.trim()) payload.script = script.trim();
      if (copy.trim()) payload.copy = copy.trim();
      if (internalNotes.trim()) payload.internalNotes = internalNotes.trim();
      if (clientFeedback.trim()) payload.clientFeedback = clientFeedback.trim();
      if (briefUrl.trim()) payload.briefUrl = briefUrl.trim();
      if (driveLink.trim()) payload.driveLink = driveLink.trim();
      if (frameIoLink.trim()) payload.frameIoLink = frameIoLink.trim();
      if (sourceFileLink.trim()) payload.sourceFileLink = sourceFileLink.trim();
      if (dropboxLink.trim()) payload.dropboxLink = dropboxLink.trim();

      const response = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to create content');
      }

      const scheduledMsg = finalScheduledDate
        ? ` Scheduled for ${new Date(finalScheduledDate).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}.`
        : '';
      toast.success(`Content created successfully!${scheduledMsg}`);
      onContentCreated();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to create content');
      console.error('Error creating content:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header - matching content-detail-modal style */}
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              contentType === 'Short Form' ? 'bg-blue-500/10' :
              contentType === 'YouTube' ? 'bg-red-500/10' : 'bg-purple-500/10'
            }`}>
              <Icon className={`w-5 h-5 ${
                contentType === 'Short Form' ? 'text-blue-500' :
                contentType === 'YouTube' ? 'text-red-500' : 'text-purple-500'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-white text-lg">
                {title || 'New Content'}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {contentType}
                </Badge>
                {selectedClient && (
                  <span className="text-sm text-zinc-500">{selectedClient.name}</span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs - matching content-detail-modal structure exactly */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'details' | 'attributes' | 'links' | 'notes')} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="bg-zinc-800 w-full justify-start">
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
          </TabsList>

          <div className="flex-1 overflow-y-auto py-4">
            {/* Details Tab - matching content-detail-modal */}
            <TabsContent value="details" className="mt-0 space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-zinc-300">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Content title..."
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
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

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-zinc-300">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ContentStatus)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {contentType === 'Short Form' ? (
                      <>
                        <SelectItem value="Filmed" className="text-white">Filmed</SelectItem>
                        <SelectItem value="In Progress" className="text-white">In Progress</SelectItem>
                        <SelectItem value="PC Feedback" className="text-white">PC Feedback</SelectItem>
                        <SelectItem value="Client Feedback" className="text-white">Client Feedback</SelectItem>
                        <SelectItem value="Approved" className="text-white">Approved</SelectItem>
                        <SelectItem value="Not Approved" className="text-white">Not Approved</SelectItem>
                        <SelectItem value="Scheduled" className="text-white">Scheduled</SelectItem>
                        <SelectItem value="Posted" className="text-white">Posted</SelectItem>
                      </>
                    ) : contentType === 'YouTube' ? (
                      <>
                        <SelectItem value="Research" className="text-white">Research</SelectItem>
                        <SelectItem value="Brief" className="text-white">Brief</SelectItem>
                        <SelectItem value="Filmed" className="text-white">Filmed</SelectItem>
                        <SelectItem value="Edit" className="text-white">Edit</SelectItem>
                        <SelectItem value="Thumbnail Design" className="text-white">Thumbnail Design</SelectItem>
                        <SelectItem value="PC Review" className="text-white">PC Review</SelectItem>
                        <SelectItem value="Client Review" className="text-white">Client Review</SelectItem>
                        <SelectItem value="Final Review" className="text-white">Final Review</SelectItem>
                        <SelectItem value="To Schedule" className="text-white">To Schedule</SelectItem>
                        <SelectItem value="Scheduled" className="text-white">Scheduled</SelectItem>
                        <SelectItem value="Live" className="text-white">Live</SelectItem>
                        <SelectItem value="Complete" className="text-white">Complete</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="Guest Booked" className="text-white">Guest Booked</SelectItem>
                        <SelectItem value="Research" className="text-white">Research</SelectItem>
                        <SelectItem value="Brief" className="text-white">Brief</SelectItem>
                        <SelectItem value="Filmed" className="text-white">Filmed</SelectItem>
                        <SelectItem value="Edit" className="text-white">Edit</SelectItem>
                        <SelectItem value="Thumbnail Design" className="text-white">Thumbnail Design</SelectItem>
                        <SelectItem value="PC Review" className="text-white">PC Review</SelectItem>
                        <SelectItem value="Client Review" className="text-white">Client Review</SelectItem>
                        <SelectItem value="Final Review" className="text-white">Final Review</SelectItem>
                        <SelectItem value="To Schedule" className="text-white">To Schedule</SelectItem>
                        <SelectItem value="Scheduled" className="text-white">Scheduled</SelectItem>
                        <SelectItem value="Live" className="text-white">Live</SelectItem>
                        <SelectItem value="Complete" className="text-white">Complete</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Style - Only for Short Form */}
              {contentType === 'Short Form' && (
                <div className="space-y-2">
                  <Label className="text-zinc-300">Style</Label>
                  <Select value={style || '__none__'} onValueChange={(v) => setStyle(v === '__none__' ? '' : v)}>
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

              {/* Team Assignment - grid like the modal */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Assigned Editor
                  </Label>
                  <UserSelect
                    value={assignedEditor?.id}
                    onChange={(_: string | undefined, user: NotionUser | undefined) => setAssignedEditor(user || null)}
                    placeholder="Select editor..."
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Assigned Strategist
                  </Label>
                  <Select value={assignedStrategist || '__none__'} onValueChange={(v) => setAssignedStrategist(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Select strategist..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="__none__" className="text-zinc-400">None</SelectItem>
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
                  <Label className="text-zinc-300 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Assigned Coordinator
                  </Label>
                  <Select value={assignedCoordinator || '__none__'} onValueChange={(v) => setAssignedCoordinator(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Select coordinator..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="__none__" className="text-zinc-400">None</SelectItem>
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
                <div className="space-y-2">
                  <Label className="text-zinc-300">Client</Label>
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Select a client..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id} className="text-white">
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Editing Notes - in Details tab like the expanded view */}
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
            </TabsContent>

            {/* Schedule/Attributes Tab - matching content-detail-modal */}
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

              {/* Caption (Copy) */}
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

            {/* Links Tab - matching content-detail-modal with different links per content type */}
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
                    <Label htmlFor="dropboxLink" className="text-zinc-300">Dropbox Link (Asset)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="dropboxLink"
                        value={dropboxLink}
                        onChange={(e) => setDropboxLink(e.target.value)}
                        placeholder="https://dropbox.com/..."
                        className="bg-zinc-800 border-zinc-700 text-white flex-1"
                      />
                      {dropboxLink && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-zinc-700"
                          onClick={() => window.open(dropboxLink, '_blank')}
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
                    <Label htmlFor="dropboxLinkYT" className="text-zinc-300">Dropbox Link (Folder)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="dropboxLinkYT"
                        value={dropboxLink}
                        onChange={(e) => setDropboxLink(e.target.value)}
                        placeholder="https://dropbox.com/..."
                        className="bg-zinc-800 border-zinc-700 text-white flex-1"
                      />
                      {dropboxLink && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-zinc-700"
                          onClick={() => window.open(dropboxLink, '_blank')}
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

            {/* Notes Tab - matching content-detail-modal */}
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
          </div>
        </Tabs>

        <DialogFooter className="pt-4 border-t border-zinc-800">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-zinc-700 text-zinc-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || !clientId || isCreating}
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
                Create Content
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PipelineView({ shortForm, youtube, podcast, clients, teamMembers = [] }: PipelineViewProps) {
  const searchParams = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClientName, setSelectedClientName] = useState<string>('all');
  const [selectedEditor, setSelectedEditor] = useState<string>('all');

  // Get type and highlight from URL params
  const typeParam = searchParams.get('type');
  const highlightId = searchParams.get('highlight');

  // Determine tab based on URL type parameter
  const getTabFromType = (type: string | null): 'short-form' | 'youtube' | 'podcast' => {
    if (type === 'Short Form' || type === 'Short+Form') return 'short-form';
    if (type === 'YouTube') return 'youtube';
    if (type === 'Podcast') return 'podcast';
    return 'short-form';
  };

  const [activeTab, setActiveTab] = useState<'short-form' | 'youtube' | 'podcast'>(getTabFromType(typeParam));

  // Update tab when URL type parameter changes
  useEffect(() => {
    if (typeParam) {
      setActiveTab(getTabFromType(typeParam));
    }
  }, [typeParam]);

  // Use the clients prop for the dropdown (all Active clients from Notion)
  const clientOptions = useMemo(() => {
    return clients.map((c) => c.name).sort();
  }, [clients]);

  // Get unique editors from all content
  const allEditors = useMemo(() => {
    const editorMap = new Map<string, string>();
    [...shortForm, ...youtube, ...podcast].forEach((col) => {
      col.items.forEach((item) => {
        if (item.assignedEditor) {
          editorMap.set(item.assignedEditor.id, item.assignedEditor.name);
        }
      });
    });
    return Array.from(editorMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [shortForm, youtube, podcast]);

  // Filter columns by selected client name and editor
  const filterColumns = useCallback((columns: PipelineColumn[]): PipelineColumn[] => {
    return columns.map((col) => ({
      ...col,
      items: col.items.filter((item) => {
        const clientMatch = selectedClientName === 'all' || item.clientName === selectedClientName;
        const editorMatch = selectedEditor === 'all' || item.assignedEditor?.id === selectedEditor;
        return clientMatch && editorMatch;
      }),
    }));
  }, [selectedClientName, selectedEditor]);

  const filteredShortForm = useMemo(() => filterColumns(shortForm), [shortForm, filterColumns]);
  const filteredYoutube = useMemo(() => filterColumns(youtube), [youtube, filterColumns]);
  const filteredPodcast = useMemo(() => filterColumns(podcast), [podcast, filterColumns]);

  const counts = {
    shortForm: filteredShortForm.reduce((acc, col) => acc + col.items.length, 0),
    youtube: filteredYoutube.reduce((acc, col) => acc + col.items.length, 0),
    podcast: filteredPodcast.reduce((acc, col) => acc + col.items.length, 0),
  };

  const getDefaultContentType = (): ContentType => {
    switch (activeTab) {
      case 'short-form':
        return 'Short Form';
      case 'youtube':
        return 'YouTube';
      case 'podcast':
        return 'Podcast';
      default:
        return 'Short Form';
    }
  };

  const handleContentCreated = () => {
    // Refresh the page to get new data
    window.location.reload();
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Content Pipeline</h1>
            <p className="text-zinc-400">Manage content through production stages</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Client Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-500" />
              <Select value={selectedClientName} onValueChange={setSelectedClientName}>
                <SelectTrigger className="w-40 bg-zinc-900 border-zinc-700 text-white">
                  <SelectValue placeholder="Filter by client..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="all">All Clients</SelectItem>
                  {clientOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClientName !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedClientName('all')}
                  className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            {/* Editor Filter */}
            {allEditors.length > 0 && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-zinc-500" />
                <Select value={selectedEditor} onValueChange={setSelectedEditor}>
                  <SelectTrigger className="w-40 bg-zinc-900 border-zinc-700 text-white">
                    <SelectValue placeholder="Filter by editor..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="all">All Editors</SelectItem>
                    {allEditors.map((editor) => (
                      <SelectItem key={editor.id} value={editor.id}>
                        {editor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedEditor !== 'all' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEditor('all')}
                    className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
            <Button className="gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              New Content
            </Button>
          </div>
        </div>

        {/* Active Filter Badge */}
        {(selectedClientName !== 'all' || selectedEditor !== 'all') && (
          <div className="flex items-center gap-2">
            {selectedClientName !== 'all' && (
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                Client: {selectedClientName}
              </Badge>
            )}
            {selectedEditor !== 'all' && (
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                Editor: {allEditors.find(e => e.id === selectedEditor)?.name || selectedEditor}
              </Badge>
            )}
            <span className="text-xs text-zinc-500">
              Showing {counts.shortForm + counts.youtube + counts.podcast} items
            </span>
          </div>
        )}

        {/* Pipeline Tabs */}
        <Tabs
          defaultValue="short-form"
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="space-y-4"
        >
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="short-form" className="gap-2">
              <Video className="w-4 h-4" />
              Short Form
              <span className="ml-1 text-xs text-zinc-500">({counts.shortForm})</span>
            </TabsTrigger>
            <TabsTrigger value="youtube" className="gap-2">
              <Youtube className="w-4 h-4" />
              YouTube
              <span className="ml-1 text-xs text-zinc-500">({counts.youtube})</span>
            </TabsTrigger>
            <TabsTrigger value="podcast" className="gap-2">
              <Mic className="w-4 h-4" />
              Podcast
              <span className="ml-1 text-xs text-zinc-500">({counts.podcast})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="short-form" className="mt-4">
            <PipelineBoard
              columns={filteredShortForm}
              contentType="Short Form"
              clients={clients}
              teamMembers={teamMembers}
              highlightId={activeTab === 'short-form' ? highlightId : undefined}
            />
          </TabsContent>

          <TabsContent value="youtube" className="mt-4">
            <PipelineBoard
              columns={filteredYoutube}
              contentType="YouTube"
              clients={clients}
              teamMembers={teamMembers}
              highlightId={activeTab === 'youtube' ? highlightId : undefined}
            />
          </TabsContent>

          <TabsContent value="podcast" className="mt-4">
            <PipelineBoard
              columns={filteredPodcast}
              contentType="Podcast"
              clients={clients}
              teamMembers={teamMembers}
              highlightId={activeTab === 'podcast' ? highlightId : undefined}
            />
          </TabsContent>
        </Tabs>
      </div>

      <CreateContentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clients={clients}
        teamMembers={teamMembers}
        defaultContentType={getDefaultContentType()}
        onContentCreated={handleContentCreated}
      />
    </>
  );
}
