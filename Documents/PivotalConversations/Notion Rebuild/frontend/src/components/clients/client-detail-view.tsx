'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Client, Content, Task, CaseNote, Idea, BrainDocument, ContentType, TaskStatus, TaskUrgency, Package, ClientStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Layers,
  Lightbulb,
  CheckSquare,
  Brain,
  FileText,
  Video,
  Youtube,
  Mic,
  ExternalLink,
  MessageSquare,
  Mail,
  Phone,
  PenLine,
  Plus,
  Loader2,
  Link as LinkIcon,
  Download,
  File,
  Tag,
  Trash2,
  BookOpen,
  Palette,
  Target,
  Users,
  Scissors,
  Settings,
  Save,
  AlertTriangle,
  TrendingUp,
  Clock,
  Calendar,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { LoadingState } from '@/components/shared/loading-state';
import { ContentDetailModal } from '@/components/content/content-detail-modal';
import { KnowledgeBaseTab } from './knowledge-base-tab';
import { AcuityBookingsList } from '@/components/acuity/acuity-bookings-list';
import { AddCaseNoteDialog } from '@/components/case-notes/add-case-note-dialog';
import { ImportTranscriptDialog } from '@/components/case-notes/import-transcript-dialog';
import { CaseNotesGroupedView } from '@/components/case-notes/case-notes-grouped-view';
import { GenerateCadenceTasksDialog } from '@/components/cadence/generate-cadence-tasks-dialog';
import { IdeaDetailModal } from '@/components/ideas/idea-detail-modal';
import { ClientReportTab } from './client-report-tab';

interface ClientDetailViewProps {
  client: Client;
  content: Content[];
  tasks: Task[];
  caseNotes: CaseNote[];
  ideas: Idea[];
  brainDocs: BrainDocument[];
  clientPackage?: Package | null;
}

const BRAIN_DOCUMENT_TYPES = [
  'Brand Guidelines',
  'Voice & Tone',
  'Content Strategy',
  'Reference Material',
  'Script Template',
  'Editing Style',
  'Visual Guidelines',
  'Competitor Analysis',
  'Audience Research',
  'Other',
] as const;

const docTypeIcons: Record<string, typeof FileText> = {
  'Brand Guidelines': Palette,
  'Voice & Tone': BookOpen,
  'Content Strategy': Target,
  'Reference Material': FileText,
  'Script Template': FileText,
  'Editing Style': Scissors,
  'Visual Guidelines': Palette,
  'Competitor Analysis': Target,
  'Audience Research': Users,
  'Other': FileText,
};

const docTypeColors: Record<string, string> = {
  'Brand Guidelines': 'bg-purple-500/10 text-purple-500',
  'Voice & Tone': 'bg-blue-500/10 text-blue-500',
  'Content Strategy': 'bg-green-500/10 text-green-500',
  'Reference Material': 'bg-zinc-500/10 text-zinc-400',
  'Script Template': 'bg-yellow-500/10 text-yellow-500',
  'Editing Style': 'bg-pink-500/10 text-pink-500',
  'Visual Guidelines': 'bg-orange-500/10 text-orange-500',
  'Competitor Analysis': 'bg-red-500/10 text-red-500',
  'Audience Research': 'bg-cyan-500/10 text-cyan-500',
  'Other': 'bg-zinc-500/10 text-zinc-400',
};

const statusColors: Record<string, string> = {
  Active: 'bg-green-500/10 text-green-500 border-green-500/20',
  Onboarding: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Paused: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  Churned: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const contentStatusColors: Record<string, string> = {
  'To Shoot': 'bg-zinc-500/10 text-zinc-400',
  'In Progress': 'bg-blue-500/10 text-blue-500',
  'Edit': 'bg-blue-500/10 text-blue-500',
  'PC Feedback': 'bg-purple-500/10 text-purple-500',
  'PC Review': 'bg-purple-500/10 text-purple-500',
  'Client Feedback': 'bg-pink-500/10 text-pink-500',
  'Client Review': 'bg-pink-500/10 text-pink-500',
  'Approved': 'bg-green-500/10 text-green-500',
  'Scheduled': 'bg-yellow-500/10 text-yellow-500',
  'Posted': 'bg-green-500/10 text-green-500',
  'Live': 'bg-green-500/10 text-green-500',
  'Complete': 'bg-green-500/10 text-green-500',
};

const contentTypeIcons = {
  'Short Form': Video,
  'YouTube': Youtube,
  'Podcast': Mic,
};

const caseNoteSourceIcons = {
  'Slack': MessageSquare,
  'Email': Mail,
  'Call': Phone,
  'Manual': PenLine,
};

const caseNoteTypeColors: Record<string, string> = {
  'Internal Note': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'Client Request': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  'Editing Guideline': 'bg-green-500/10 text-green-500 border-green-500/20',
};

const ideaStatusColors: Record<string, string> = {
  'Not started': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'In Progress': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  'Needs Review': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  'Reviewing': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  'Approved': 'bg-green-500/10 text-green-500 border-green-500/20',
  'Not Approved': 'bg-red-500/10 text-red-500 border-red-500/20',
  'Done': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

interface EditClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  onClientUpdated: (client: Client) => void;
  onClientDeleted?: () => void;
}

function EditClientDialog({ open, onOpenChange, client, onClientUpdated, onClientDeleted }: EditClientDialogProps) {
  const [name, setName] = useState(client.name);
  const [status, setStatus] = useState<ClientStatus>(client.status);
  const [slackChannel, setSlackChannel] = useState(client.slackChannel || '');
  const [accountManager, setAccountManager] = useState(client.accountManager || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          status,
          slackChannel: slackChannel || null,
          accountManager: accountManager || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to update client');

      const updatedClient = {
        ...client,
        name: name.trim(),
        status,
        slackChannel: slackChannel || undefined,
        accountManager: accountManager || undefined,
      };

      toast.success('Client updated successfully');
      onClientUpdated(updatedClient);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update client');
      console.error('Error updating client:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete client');

      toast.success('Client deleted');
      onOpenChange(false);
      onClientDeleted?.();
    } catch (error) {
      toast.error('Failed to delete client');
      console.error('Error deleting client:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Client</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="clientName" className="text-zinc-300">Client Name</Label>
            <Input
              id="clientName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ClientStatus)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Onboarding">Onboarding</SelectItem>
                <SelectItem value="Paused">Paused</SelectItem>
                <SelectItem value="Churned">Churned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountManager" className="text-zinc-300">Account Manager</Label>
            <Input
              id="accountManager"
              value={accountManager}
              onChange={(e) => setAccountManager(e.target.value)}
              placeholder="Account manager name..."
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slackChannel" className="text-zinc-300">Slack Channel URL</Label>
            <Input
              id="slackChannel"
              value={slackChannel}
              onChange={(e) => setSlackChannel(e.target.value)}
              placeholder="https://..."
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
        </div>

        <DialogFooter className="flex items-center">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2 mr-auto">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">Delete client and all data?</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Delete'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 mr-auto"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Client
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-zinc-700 text-zinc-300">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving || isDeleting} className="gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CreateContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onContentCreated: (content: Content) => void;
}

interface CreateBrainDocDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onDocCreated: (doc: BrainDocument) => void;
}

function CreateBrainDocDialog({ open, onOpenChange, clientId, onDocCreated }: CreateBrainDocDialogProps) {
  const [name, setName] = useState('');
  const [documentType, setDocumentType] = useState<string>('Reference Material');
  const [url, setUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

      const response = await fetch('/api/brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          clientId,
          documentType,
          url: url || undefined,
          fileUrl: fileUrl || undefined,
          summary: summary || undefined,
          tags: tags.length > 0 ? tags : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create document');
      }

      const newDoc = await response.json();
      toast.success('Document added to Brain');
      onDocCreated(newDoc);
      onOpenChange(false);
      setName('');
      setUrl('');
      setFileUrl('');
      setSummary('');
      setTagsInput('');
    } catch (error) {
      toast.error('Failed to create document');
      console.error('Error creating document:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Add to Brain</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-300">Document Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Brand Voice Guide"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {BRAIN_DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url" className="text-zinc-300">Link URL (Optional)</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fileUrl" className="text-zinc-300">File URL (Optional)</Label>
            <Input
              id="fileUrl"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary" className="text-zinc-300">Summary (Optional)</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief description..."
              className="bg-zinc-800 border-zinc-700 text-white min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags" className="text-zinc-300">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g., branding, social, reference"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-zinc-700 text-zinc-300">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || isCreating} className="gap-2">
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isCreating ? 'Adding...' : 'Add Document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateContentDialog({ open, onOpenChange, clientId, onContentCreated }: CreateContentDialogProps) {
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<ContentType>('Short Form');
  const [scheduledDate, setScheduledDate] = useState('');
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
          clientId,
          contentType,
          status: 'Filmed',
          scheduledDate: scheduledDate || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create content');
      }

      const newContent = await response.json();
      toast.success('Content created successfully');
      onContentCreated(newContent);
      onOpenChange(false);
      setTitle('');
      setScheduledDate('');
    } catch (error) {
      toast.error('Failed to create content');
      console.error('Error creating content:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white">Create New Content</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
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

          <div className="space-y-2">
            <Label htmlFor="scheduledDate" className="text-zinc-300">Scheduled Date (Optional)</Label>
            <Input
              id="scheduledDate"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-zinc-700 text-zinc-300">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!title.trim() || isCreating} className="gap-2">
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ClientDetailView({ client: initialClient, content: initialContent, tasks: initialTasks, caseNotes: initialCaseNotes, ideas: initialIdeas, brainDocs: initialBrainDocs, clientPackage }: ClientDetailViewProps) {
  const router = useRouter();
  const [client, setClient] = useState(initialClient);
  const [content, setContent] = useState(initialContent);
  const [tasks, setTasks] = useState(initialTasks);
  const [caseNotes, setCaseNotes] = useState(initialCaseNotes);
  const [brainDocs, setBrainDocs] = useState(initialBrainDocs);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [brainDialogOpen, setBrainDialogOpen] = useState(false);
  const [editClientDialogOpen, setEditClientDialogOpen] = useState(false);
  const [addNoteDialogOpen, setAddNoteDialogOpen] = useState(false);
  const [importTranscriptDialogOpen, setImportTranscriptDialogOpen] = useState(false);
  const [cadenceDialogOpen, setCadenceDialogOpen] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [contentDetailOpen, setContentDetailOpen] = useState(false);

  // Ideas state
  const [ideas, setIdeas] = useState(initialIdeas);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [ideaDetailOpen, setIdeaDetailOpen] = useState(false);

  // Case notes task creation state
  const [creatingTaskForNote, setCreatingTaskForNote] = useState<string | null>(null);
  const [createdTaskNotes, setCreatedTaskNotes] = useState<Set<string>>(new Set());

  const pendingTasks = tasks.filter((t) => t.status !== 'Complete');
  const completedTasks = tasks.filter((t) => t.status === 'Complete');

  // Calculate deliverables
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();

  const shortFormContent = content.filter((c) => c.contentType === 'Short Form');
  const youtubeContent = content.filter((c) => c.contentType === 'YouTube');
  const podcastContent = content.filter((c) => c.contentType === 'Podcast');

  const getMonthlyCount = (items: typeof content, statuses: string[]) =>
    items.filter((c) => {
      if (!c.scheduledDate) return false;
      const date = new Date(c.scheduledDate);
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear && statuses.includes(c.status);
    }).length;

  const deliverables = {
    shortForm: {
      delivered: getMonthlyCount(shortFormContent, ['Posted']),
      target: clientPackage?.shortFormPerMonth || 0
    },
    youtube: {
      delivered: getMonthlyCount(youtubeContent, ['Live', 'Complete']),
      target: clientPackage?.youtubePerMonth || 0
    },
    podcast: {
      delivered: getMonthlyCount(podcastContent, ['Live', 'Complete']),
      target: clientPackage?.podcastPerMonth || 0
    },
  };

  // Pipeline health check - count items in active production (not Posted/Live/Complete)
  const activeStatuses = ['To Shoot', 'In Progress', 'Edit', 'PC Feedback', 'PC Review', 'Client Feedback', 'Client Review', 'Approved', 'Scheduled', 'To Schedule', 'Research', 'Brief', 'Thumbnail Design', 'Filmed', 'Final Review', 'Guest Booked'];
  const scheduledStatuses = ['Scheduled', 'To Schedule', 'Approved'];

  const pipelineHealth = {
    shortForm: {
      inProduction: shortFormContent.filter(c => activeStatuses.includes(c.status)).length,
      scheduled: shortFormContent.filter(c => scheduledStatuses.includes(c.status)).length,
    },
    youtube: {
      inProduction: youtubeContent.filter(c => activeStatuses.includes(c.status)).length,
      scheduled: youtubeContent.filter(c => scheduledStatuses.includes(c.status)).length,
    },
    podcast: {
      inProduction: podcastContent.filter(c => activeStatuses.includes(c.status)).length,
      scheduled: podcastContent.filter(c => scheduledStatuses.includes(c.status)).length,
    },
  };

  const totalScheduled = pipelineHealth.shortForm.scheduled + pipelineHealth.youtube.scheduled + pipelineHealth.podcast.scheduled;
  const pipelineIsHealthy = totalScheduled >= 5;

  // Timeline alert helper - checks if content is at risk based on schedule
  const getTimelineAlert = (item: Content): { type: 'urgent' | 'warning' | null; message: string } => {
    if (!item.scheduledDate) return { type: null, message: '' };

    const scheduledDate = new Date(item.scheduledDate);
    const now = new Date();
    const daysUntilScheduled = Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Skip if already posted/live/complete
    const completedStatuses = ['Posted', 'Live', 'Complete'];
    if (completedStatuses.includes(item.status)) return { type: null, message: '' };

    // Different thresholds based on content type
    if (item.contentType === 'Short Form') {
      // Short Form: 5 days ahead rule
      if (daysUntilScheduled < 0) {
        return { type: 'urgent', message: `${Math.abs(daysUntilScheduled)} days overdue` };
      } else if (daysUntilScheduled < 2) {
        return { type: 'urgent', message: `Due in ${daysUntilScheduled} days` };
      } else if (daysUntilScheduled < 5) {
        return { type: 'warning', message: `${daysUntilScheduled} days until scheduled` };
      }
    } else {
      // YouTube/Podcast: 72hr (3 days) rule
      if (daysUntilScheduled < 0) {
        return { type: 'urgent', message: `${Math.abs(daysUntilScheduled)} days overdue` };
      } else if (daysUntilScheduled < 1) {
        return { type: 'urgent', message: 'Due within 24hr' };
      } else if (daysUntilScheduled < 3) {
        return { type: 'urgent', message: `${daysUntilScheduled} days until release` };
      } else if (daysUntilScheduled < 7) {
        return { type: 'warning', message: `${daysUntilScheduled} days until release` };
      }
    }

    return { type: null, message: '' };
  };

  // Get content with timeline issues for alert display
  const contentWithAlerts = content.filter(c => getTimelineAlert(c).type !== null);
  const urgentAlerts = contentWithAlerts.filter(c => getTimelineAlert(c).type === 'urgent');

  const handleCompleteTask = async (taskId: string) => {
    setCompletingTaskId(taskId);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Complete' }),
      });

      if (!response.ok) throw new Error('Failed to complete task');

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'Complete' as TaskStatus } : t))
      );
      toast.success('Task completed');
    } catch (error) {
      toast.error('Failed to complete task');
    } finally {
      setCompletingTaskId(null);
    }
  };

  const handleContentCreated = (newContent: Content) => {
    setContent((prev) => [newContent, ...prev]);
  };

  const handleBrainDocCreated = (newDoc: BrainDocument) => {
    setBrainDocs((prev) => [newDoc, ...prev]);
  };

  const handleClientUpdated = (updatedClient: Client) => {
    setClient(updatedClient);
  };

  const handleOpenContentDetail = (contentItem: Content) => {
    setSelectedContent(contentItem);
    setContentDetailOpen(true);
  };

  const handleContentUpdate = (updatedContent: Content) => {
    setContent((prev) =>
      prev.map((c) => (c.id === updatedContent.id ? updatedContent : c))
    );
  };

  const handleContentDelete = (contentId: string) => {
    setContent((prev) => prev.filter((c) => c.id !== contentId));
  };

  const handleDeleteBrainDoc = async (docId: string) => {
    setDeletingDocId(docId);
    try {
      const response = await fetch(`/api/brain/${docId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete document');

      setBrainDocs((prev) => prev.filter((d) => d.id !== docId));
      toast.success('Document removed from Brain');
    } catch (error) {
      toast.error('Failed to delete document');
    } finally {
      setDeletingDocId(null);
    }
  };

  const handleOpenIdeaDetail = (idea: Idea) => {
    setSelectedIdea(idea);
    setIdeaDetailOpen(true);
  };

  const handleCreateTaskFromNote = async (note: CaseNote) => {
    setCreatingTaskForNote(note.id);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: note.title,
          clientId: note.clientId || client.id,
          urgency: 'This Week',
          description: note.fullNote,
          caseNoteId: note.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to create task');

      const newTask = await response.json();
      setTasks((prev) => [newTask, ...prev]);
      setCreatedTaskNotes((prev) => new Set(prev).add(note.id));
      toast.success('Task created from case note');
    } catch (error) {
      toast.error('Failed to create task');
      console.error('Error creating task:', error);
    } finally {
      setCreatingTaskForNote(null);
    }
  };

  const handleCreateTaskFromActionItem = async (note: CaseNote, actionItem: string, urgency: TaskUrgency, assignee?: string) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: actionItem,
          clientId: note.clientId || client.id,
          urgency: urgency,
          description: `From case note: ${note.title}`,
          caseNoteId: note.id,
          assignee: assignee || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to create task');

      const newTask = await response.json();
      setTasks((prev) => [newTask, ...prev]);
    } catch (error) {
      console.error('Error creating task from action item:', error);
      throw error; // Re-throw so the UI can show error state
    }
  };

  const handleIdeaUpdate = (updatedIdea: Idea) => {
    setIdeas((prev) =>
      prev.map((i) => (i.id === updatedIdea.id ? updatedIdea : i))
    );
  };

  const handleIdeaDelete = (ideaId: string) => {
    setIdeas((prev) => prev.filter((i) => i.id !== ideaId));
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{client.name}</h1>
              <Badge variant="outline" className={cn('text-xs', statusColors[client.status])}>
                {client.status}
              </Badge>
            </div>
            <p className="text-zinc-400">
              {clientPackage?.name || client.packageName || 'No package'} • Since{' '}
              {client.startDate ? new Date(client.startDate).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <Button onClick={() => setContentDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Content
          </Button>
          <Button variant="outline" onClick={() => setEditClientDialogOpen(true)} className="gap-2">
            <Settings className="w-4 h-4" />
            Edit
          </Button>
          {client.slackChannel && (
            <Button variant="outline" size="sm" asChild>
              <a href={client.slackChannel} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Slack
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href={`/portal/${client.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`} target="_blank">
              <ExternalLink className="w-4 h-4 mr-2" />
              Client Portal
            </Link>
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Layers className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{content.length}</p>
                <p className="text-sm text-zinc-400">Content</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{ideas.length}</p>
                <p className="text-sm text-zinc-400">Ideas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckSquare className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{pendingTasks.length}</p>
                <p className="text-sm text-zinc-400">Open Tasks</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Brain className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{brainDocs.length}</p>
                <p className="text-sm text-zinc-400">Brain Docs</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Deliverables Progress & Pipeline Health */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg text-white">Deliverables This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: 'Short Form', data: deliverables.shortForm, color: 'bg-blue-500' },
                  { label: 'YouTube', data: deliverables.youtube, color: 'bg-red-500' },
                  { label: 'Podcast', data: deliverables.podcast, color: 'bg-purple-500' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-zinc-400">{item.label}</span>
                      <span className="text-sm font-medium text-white">
                        {item.data.delivered}/{item.data.target || '-'}
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', item.color)}
                        style={{
                          width: `${item.data.target > 0 ? Math.min((item.data.delivered / item.data.target) * 100, 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className={cn('bg-zinc-900 border-zinc-800', !pipelineIsHealthy && 'border-yellow-500/50')}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-white">Pipeline Health</CardTitle>
                {!pipelineIsHealthy ? (
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Low Pipeline
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Healthy
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!pipelineIsHealthy && (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-sm text-yellow-500">
                      Only {totalScheduled} items scheduled. Aim for at least 5 items in the pipeline.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4 text-center">
                  {[
                    { label: 'Short Form', scheduled: pipelineHealth.shortForm.scheduled, inProduction: pipelineHealth.shortForm.inProduction },
                    { label: 'YouTube', scheduled: pipelineHealth.youtube.scheduled, inProduction: pipelineHealth.youtube.inProduction },
                    { label: 'Podcast', scheduled: pipelineHealth.podcast.scheduled, inProduction: pipelineHealth.podcast.inProduction },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1">
                      <p className="text-xs text-zinc-500">{item.label}</p>
                      <p className="text-xl font-bold text-white">{item.scheduled}</p>
                      <p className="text-xs text-zinc-400">scheduled</p>
                      <p className="text-xs text-zinc-500">{item.inProduction} in production</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline Alerts */}
        {urgentAlerts.length > 0 && (
          <Card className="bg-zinc-900 border-red-500/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <CardTitle className="text-lg text-white">Timeline Alerts</CardTitle>
                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 ml-auto">
                  {urgentAlerts.length} urgent
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {urgentAlerts.slice(0, 5).map((item) => {
                  const alert = getTimelineAlert(item);
                  const Icon = contentTypeIcons[item.contentType];
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 cursor-pointer hover:bg-red-500/15 transition-colors"
                      onClick={() => handleOpenContentDetail(item)}
                    >
                      <Icon className="w-4 h-4 text-red-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{item.title}</p>
                        <p className="text-xs text-red-400">{alert.message}</p>
                      </div>
                      <Badge variant="outline" className={cn('text-xs', contentStatusColors[item.status] || 'bg-zinc-500/10 text-zinc-400')}>
                        {item.status}
                      </Badge>
                      <Clock className="w-4 h-4 text-red-400" />
                    </div>
                  );
                })}
                {urgentAlerts.length > 5 && (
                  <p className="text-xs text-zinc-500 text-center pt-2">
                    +{urgentAlerts.length - 5} more items need attention
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Tabs */}
        <Tabs defaultValue="content" className="space-y-4">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="content">Content ({content.length})</TabsTrigger>
            <TabsTrigger value="ideas">Ideas ({ideas.length})</TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({pendingTasks.length})</TabsTrigger>
            <TabsTrigger value="case-notes">Case Notes ({caseNotes.length})</TabsTrigger>
            <TabsTrigger value="knowledge-base">Knowledge Base</TabsTrigger>
            <TabsTrigger value="brain">Documents ({brainDocs.length})</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="report">Report</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {content.map((item) => {
                const Icon = contentTypeIcons[item.contentType];
                const alert = getTimelineAlert(item);
                return (
                  <Card
                    key={item.id}
                    className={cn(
                      "bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer",
                      alert.type === 'urgent' && "border-red-500/50 hover:border-red-500"
                    )}
                    onClick={() => handleOpenContentDetail(item)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="p-2 rounded-lg bg-zinc-800 shrink-0">
                            <Icon className="w-4 h-4 text-zinc-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-white truncate">{item.title}</h3>
                            <p className="text-xs text-zinc-400">{item.contentType}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={cn('text-xs shrink-0', contentStatusColors[item.status])}>
                          {item.status}
                        </Badge>
                      </div>

                      {item.scheduledDate && (
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.scheduledDate).toLocaleDateString()}
                          {alert.message && (
                            <span className={cn(
                              "ml-auto font-medium",
                              alert.type === 'urgent' ? "text-red-400" : "text-yellow-500"
                            )}>
                              {alert.message}
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="ideas" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ideas.map((idea) => (
                <Card
                  key={idea.id}
                  className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
                  onClick={() => handleOpenIdeaDetail(idea)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-2 rounded-lg bg-yellow-500/10 shrink-0">
                          <Lightbulb className="w-4 h-4 text-yellow-500" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium text-white truncate">{idea.title}</h3>
                          <p className="text-xs text-zinc-400 truncate">
                            {idea.hook || 'No hook defined'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn('text-xs shrink-0', ideaStatusColors[idea.status])}>
                        {idea.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {ideas.length === 0 && (
                <div className="col-span-full text-center py-12 text-zinc-500">
                  No ideas found for this client.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Tasks</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCadenceDialogOpen(true)}>
                  <Clock className="w-4 h-4 mr-2" />
                  Generate Cadence Tasks
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {pendingTasks.map((task) => (
                <Card key={task.id} className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-zinc-400 hover:text-green-500"
                      onClick={() => handleCompleteTask(task.id)}
                      disabled={completingTaskId === task.id}
                    >
                      {completingTaskId === task.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <CheckSquare className="w-5 h-5" />
                      )}
                    </Button>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{task.task}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs bg-zinc-800 text-zinc-400 border-zinc-700">
                          {task.assignedTo || 'Unassigned'}
                        </Badge>
                        {task.dueDate && (
                          <span className="text-xs text-zinc-500">
                            Due {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {pendingTasks.length === 0 && (
                <p className="text-center py-8 text-zinc-500">No open tasks</p>
              )}

              {completedTasks.length > 0 && (
                <>
                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-zinc-800" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-black px-2 text-zinc-500">Completed</span>
                    </div>
                  </div>
                  <div className="space-y-2 opacity-60">
                    {completedTasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                        <CheckSquare className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-zinc-400 line-through">{task.task}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="case-notes" className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setImportTranscriptDialogOpen(true)} className="gap-2">
                <Download className="w-4 h-4" />
                Import Transcript
              </Button>
              <Button onClick={() => setAddNoteDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Note
              </Button>
            </div>
            <CaseNotesGroupedView
              notes={caseNotes}
              onCreateTask={handleCreateTaskFromNote}
              onCreateTaskFromActionItem={handleCreateTaskFromActionItem}
            />
          </TabsContent>

          <TabsContent value="knowledge-base">
            <KnowledgeBaseTab clientId={client.id} clientName={client.name} />
          </TabsContent>

          <TabsContent value="brain" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setBrainDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Document
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {brainDocs.map((doc) => {
                const Icon = docTypeIcons[doc.documentType] || FileText;
                const colorClass = docTypeColors[doc.documentType] || 'bg-zinc-500/10 text-zinc-400';

                return (
                  <Card key={doc.id} className="bg-zinc-900 border-zinc-800 group relative">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn("p-2 rounded-lg shrink-0", colorClass)}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-medium text-white truncate">{doc.name}</h3>
                            <p className="text-xs text-zinc-400">{doc.documentType}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteBrainDoc(doc.id)}
                          disabled={deletingDocId === doc.id}
                        >
                          {deletingDocId === doc.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </Button>
                      </div>

                      {doc.summary && (
                        <p className="text-sm text-zinc-400 line-clamp-2">
                          {doc.summary}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 pt-2">
                        {doc.url && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-1 rounded-full transition-colors"
                          >
                            <LinkIcon className="w-3 h-3" />
                            Link
                          </a>
                        )}
                        {doc.fileUrl && (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 bg-purple-500/10 px-2 py-1 rounded-full transition-colors"
                          >
                            <File className="w-3 h-3" />
                            File
                          </a>
                        )}
                      </div>

                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-2 border-t border-zinc-800">
                          {doc.tags.map(tag => (
                            <span key={tag} className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {brainDocs.length === 0 && (
                <div className="col-span-full text-center py-12 text-zinc-500">
                  No documents in Brain yet.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4">
            <AcuityBookingsList clientId={client.id} clientName={client.name} />
          </TabsContent>

          <TabsContent value="report" className="space-y-4">
            <ClientReportTab clientName={client.name} />
          </TabsContent>

        </Tabs>
      </div>

      <CreateContentDialog
        open={contentDialogOpen}
        onOpenChange={setContentDialogOpen}
        clientId={client.id}
        onContentCreated={handleContentCreated}
      />

      <CreateBrainDocDialog
        open={brainDialogOpen}
        onOpenChange={setBrainDialogOpen}
        clientId={client.id}
        onDocCreated={handleBrainDocCreated}
      />

      <EditClientDialog
        open={editClientDialogOpen}
        onOpenChange={setEditClientDialogOpen}
        client={client}
        onClientUpdated={handleClientUpdated}
        onClientDeleted={() => router.push('/clients')}
      />

      <ContentDetailModal
        content={selectedContent}
        open={contentDetailOpen}
        onOpenChange={setContentDetailOpen}
        onUpdate={handleContentUpdate}
        onDelete={handleContentDelete}
      />

      <AddCaseNoteDialog
        open={addNoteDialogOpen}
        onOpenChange={setAddNoteDialogOpen}
        clientId={client.id}
        clientName={client.name}
        onNoteCreated={async () => {
          // Refresh case notes from the API
          try {
            const response = await fetch(`/api/case-notes?clientId=${client.id}`);
            if (response.ok) {
              const updatedNotes = await response.json();
              setCaseNotes(updatedNotes);
            }
          } catch (error) {
            console.error('Error refreshing case notes:', error);
          }
        }}
      />

      <ImportTranscriptDialog
        open={importTranscriptDialogOpen}
        onOpenChange={setImportTranscriptDialogOpen}
        clientId={client.id}
        clientName={client.name}
        slackChannelUrl={client.slackChannel}
        onImportComplete={async () => {
          // Refresh case notes and tasks from the API
          try {
            const [notesResponse, tasksResponse] = await Promise.all([
              fetch(`/api/case-notes?clientId=${client.id}`),
              fetch(`/api/tasks?clientId=${client.id}`),
            ]);
            if (notesResponse.ok) {
              const updatedNotes = await notesResponse.json();
              setCaseNotes(updatedNotes);
            }
            if (tasksResponse.ok) {
              const updatedTasks = await tasksResponse.json();
              setTasks(updatedTasks);
            }
          } catch (error) {
            console.error('Error refreshing data:', error);
          }
        }}
      />

      <GenerateCadenceTasksDialog
        open={cadenceDialogOpen}
        onOpenChange={setCadenceDialogOpen}
        clientId={client.id}
        clientName={client.name}
        onTasksGenerated={() => {
          // Refresh tasks - in a real app you'd refetch
          toast.success('Tasks generated - refresh to see updates');
        }}
      />

      <IdeaDetailModal
        idea={selectedIdea}
        open={ideaDetailOpen}
        onOpenChange={setIdeaDetailOpen}
        onUpdate={handleIdeaUpdate}
        onDelete={handleIdeaDelete}
      />
    </>
  );
}
