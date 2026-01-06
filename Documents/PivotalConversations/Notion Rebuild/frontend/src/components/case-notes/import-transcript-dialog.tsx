'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Loader2,
  MessageSquare,
  Mail,
  Phone,
  FileText,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ListTodo,
  Plus,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImportTranscriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  slackChannelUrl?: string;
  onImportComplete?: (result: ImportResult) => void;
}

interface ActionItem {
  task: string;
  urgency: 'Urgent' | 'This Week' | 'This Month' | 'Backlog';
  assignee?: string;
}

interface ImportResult {
  success: boolean;
  caseNotesCreated: number;
  tasksCreated: number;
  message: string;
  actionItems?: ActionItem[];
  channelName?: string;
  messagesScanned?: number;
}

type ImportSource = 'slack-channel' | 'manual' | 'email' | 'meeting';

export function ImportTranscriptDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  slackChannelUrl,
  onImportComplete,
}: ImportTranscriptDialogProps) {
  const [activeTab, setActiveTab] = useState<ImportSource>('slack-channel');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Slack channel options
  const [slackUrl, setSlackUrl] = useState(slackChannelUrl || '');
  const [sinceDays, setSinceDays] = useState('7');
  const [filterActionable, setFilterActionable] = useState(true);

  // Manual transcript options
  const [manualTitle, setManualTitle] = useState('');
  const [manualTranscript, setManualTranscript] = useState('');
  const [manualParticipants, setManualParticipants] = useState('');

  // Email options
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailFrom, setEmailFrom] = useState('');

  // Meeting options
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingTranscript, setMeetingTranscript] = useState('');
  const [meetingParticipants, setMeetingParticipants] = useState('');

  // Common options
  const [createTasks, setCreateTasks] = useState(true);
  const [useAI, setUseAI] = useState(true); // Default to AI for better extraction

  // Action items state (for manual task creation from results)
  const [pendingActionItems, setPendingActionItems] = useState<ActionItem[]>([]);
  const [creatingTaskIndex, setCreatingTaskIndex] = useState<number | null>(null);
  const [createdTaskIndices, setCreatedTaskIndices] = useState<Set<number>>(new Set());

  const resetForm = () => {
    setImportResult(null);
    setSlackUrl(slackChannelUrl || '');
    setSinceDays('7');
    setFilterActionable(true);
    setManualTitle('');
    setManualTranscript('');
    setManualParticipants('');
    setEmailSubject('');
    setEmailBody('');
    setEmailFrom('');
    setMeetingTitle('');
    setMeetingTranscript('');
    setMeetingParticipants('');
    setPendingActionItems([]);
    setCreatingTaskIndex(null);
    setCreatedTaskIndices(new Set());
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportResult(null);

    try {
      let payload: Record<string, unknown>;
      let source: string;

      switch (activeTab) {
        case 'slack-channel':
          if (!slackUrl) {
            toast.error('Slack channel URL is required');
            setIsImporting(false);
            return;
          }
          source = 'slack-channel';
          payload = {
            channelUrl: slackUrl,
            clientId,
            clientName,
            sinceDays: parseInt(sinceDays),
            filterActionable,
          };
          break;

        case 'manual':
          if (!manualTitle || !manualTranscript) {
            toast.error('Title and transcript are required');
            setIsImporting(false);
            return;
          }
          source = 'manual';
          payload = {
            title: manualTitle,
            date: new Date().toISOString(),
            participants: manualParticipants,
            transcript: manualTranscript,
            clientId,
            clientName,
          };
          break;

        case 'email':
          if (!emailSubject || !emailBody) {
            toast.error('Subject and body are required');
            setIsImporting(false);
            return;
          }
          source = 'email';
          payload = {
            subject: emailSubject,
            messages: [
              {
                from: emailFrom || 'Unknown',
                to: [clientName],
                subject: emailSubject,
                body: emailBody,
                date: new Date().toISOString(),
              },
            ],
            clientId,
            clientName,
          };
          break;

        case 'meeting':
          if (!meetingTitle || !meetingTranscript) {
            toast.error('Title and transcript are required');
            setIsImporting(false);
            return;
          }
          source = 'manual';
          payload = {
            title: meetingTitle,
            date: new Date().toISOString(),
            participants: meetingParticipants,
            transcript: meetingTranscript,
            clientId,
            clientName,
          };
          break;

        default:
          setIsImporting(false);
          return;
      }

      const response = await fetch('/api/notetaker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          payload,
          createTasks,
          useAI,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      const importResult: ImportResult = {
        success: true,
        caseNotesCreated: result.caseNotesCreated || (result.caseNoteId ? 1 : 0),
        tasksCreated: result.tasksCreated || 0,
        message: result.message,
        actionItems: result.actionItems,
        channelName: result.channelName,
        messagesScanned: result.messagesScanned,
      };

      setImportResult(importResult);

      // If there are unconverted action items and auto-create tasks was off, show them
      if (result.actionItems && result.actionItems.length > 0 && !createTasks) {
        setPendingActionItems(result.actionItems);
      }

      toast.success(result.message);

      if (onImportComplete) {
        onImportComplete(importResult);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Import failed';
      toast.error(errorMessage);
      setImportResult({
        success: false,
        caseNotesCreated: 0,
        tasksCreated: 0,
        message: errorMessage,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleConvertActionItem = async (item: ActionItem, index: number) => {
    setCreatingTaskIndex(index);
    try {
      const response = await fetch('/api/slack/crawl/action-to-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: item.task,
          urgency: item.urgency,
          clientId,
          assignee: item.assignee,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      setCreatedTaskIndices(prev => new Set(prev).add(index));
      toast.success('Task created');

      if (onImportComplete) {
        onImportComplete({
          success: true,
          caseNotesCreated: 0,
          tasksCreated: 1,
          message: 'Task created from action item',
        });
      }
    } catch (error) {
      toast.error('Failed to create task');
    } finally {
      setCreatingTaskIndex(null);
    }
  };

  const urgencyColors: Record<string, string> = {
    'Urgent': 'bg-red-500/10 text-red-500 border-red-500/20',
    'This Week': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    'This Month': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'Backlog': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            Import Transcript for {clientName}
          </DialogTitle>
        </DialogHeader>

        {importResult ? (
          <div className="py-6 space-y-6">
            <div className="flex flex-col items-center gap-4">
              {importResult.success ? (
                <CheckCircle className="w-12 h-12 text-green-500" />
              ) : (
                <AlertCircle className="w-12 h-12 text-red-500" />
              )}
              <h3 className="text-lg font-medium text-white">
                {importResult.success ? 'Import Complete' : 'Import Failed'}
              </h3>
              <p className="text-zinc-400 text-center text-sm">{importResult.message}</p>
              {importResult.success && (
                <div className="flex gap-3">
                  {importResult.channelName && (
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                      #{importResult.channelName}
                    </Badge>
                  )}
                  {importResult.messagesScanned !== undefined && (
                    <Badge variant="outline" className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
                      {importResult.messagesScanned} messages scanned
                    </Badge>
                  )}
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                    {importResult.caseNotesCreated} Case Note{importResult.caseNotesCreated !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                    {importResult.tasksCreated} Task{importResult.tasksCreated !== 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
            </div>

            {/* Pending Action Items - allow manual conversion to tasks */}
            {pendingActionItems.length > 0 && (
              <div className="border-t border-zinc-800 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <ListTodo className="w-4 h-4 text-yellow-500" />
                  <h4 className="text-sm font-medium text-white">
                    Action Items Found ({pendingActionItems.length})
                  </h4>
                </div>
                <p className="text-xs text-zinc-500 mb-3">
                  Click the + button to convert an action item to a task
                </p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {pendingActionItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{item.task}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={cn('text-xs', urgencyColors[item.urgency])}>
                            {item.urgency}
                          </Badge>
                          {item.assignee && (
                            <span className="text-xs text-zinc-500">
                              Assigned to {item.assignee}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={cn(
                          "h-8 w-8 shrink-0",
                          createdTaskIndices.has(index)
                            ? "text-green-500"
                            : "text-zinc-400 hover:text-white"
                        )}
                        disabled={creatingTaskIndex === index || createdTaskIndices.has(index)}
                        onClick={() => handleConvertActionItem(item, index)}
                      >
                        {creatingTaskIndex === index ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : createdTaskIndices.has(index) ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleClose}>Close</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ImportSource)}>
              <TabsList className="grid grid-cols-4 bg-zinc-800">
                <TabsTrigger value="slack-channel" className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Slack
                </TabsTrigger>
                <TabsTrigger value="email" className="gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="meeting" className="gap-2">
                  <Phone className="w-4 h-4" />
                  Meeting
                </TabsTrigger>
                <TabsTrigger value="manual" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Manual
                </TabsTrigger>
              </TabsList>

              <TabsContent value="slack-channel" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="slackUrl" className="text-zinc-300">
                    Slack Channel URL
                  </Label>
                  <Input
                    id="slackUrl"
                    value={slackUrl}
                    onChange={(e) => setSlackUrl(e.target.value)}
                    placeholder="https://workspace.slack.com/archives/C12345678"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                  <p className="text-xs text-zinc-500">
                    Paste the Slack channel URL to extract messages
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Look Back Period</Label>
                    <Select value={sinceDays} onValueChange={setSinceDays}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="1">Last 24 hours</SelectItem>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="14">Last 14 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-300">Filter</Label>
                    <div className="flex items-center gap-2 h-10">
                      <Checkbox
                        id="filterActionable"
                        checked={filterActionable}
                        onCheckedChange={(checked) => setFilterActionable(checked as boolean)}
                      />
                      <label htmlFor="filterActionable" className="text-sm text-zinc-300">
                        Only actionable messages
                      </label>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="email" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="emailSubject" className="text-zinc-300">
                    Subject
                  </Label>
                  <Input
                    id="emailSubject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Email subject..."
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailFrom" className="text-zinc-300">
                    From
                  </Label>
                  <Input
                    id="emailFrom"
                    value={emailFrom}
                    onChange={(e) => setEmailFrom(e.target.value)}
                    placeholder="sender@example.com"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailBody" className="text-zinc-300">
                    Email Body
                  </Label>
                  <Textarea
                    id="emailBody"
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Paste the email content here..."
                    className="bg-zinc-800 border-zinc-700 text-white min-h-[200px]"
                  />
                </div>
              </TabsContent>

              <TabsContent value="meeting" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="meetingTitle" className="text-zinc-300">
                    Meeting Title
                  </Label>
                  <Input
                    id="meetingTitle"
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    placeholder="Weekly sync with client..."
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meetingParticipants" className="text-zinc-300">
                    Participants (comma-separated)
                  </Label>
                  <Input
                    id="meetingParticipants"
                    value={meetingParticipants}
                    onChange={(e) => setMeetingParticipants(e.target.value)}
                    placeholder="John, Jane, Client..."
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meetingTranscript" className="text-zinc-300">
                    Meeting Transcript
                  </Label>
                  <Textarea
                    id="meetingTranscript"
                    value={meetingTranscript}
                    onChange={(e) => setMeetingTranscript(e.target.value)}
                    placeholder="Paste the meeting transcript here (from Fathom, Fireflies, or manual notes)..."
                    className="bg-zinc-800 border-zinc-700 text-white min-h-[200px]"
                  />
                </div>
              </TabsContent>

              <TabsContent value="manual" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="manualTitle" className="text-zinc-300">
                    Title
                  </Label>
                  <Input
                    id="manualTitle"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="Note title..."
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manualParticipants" className="text-zinc-300">
                    Participants (optional)
                  </Label>
                  <Input
                    id="manualParticipants"
                    value={manualParticipants}
                    onChange={(e) => setManualParticipants(e.target.value)}
                    placeholder="John, Jane..."
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manualTranscript" className="text-zinc-300">
                    Content
                  </Label>
                  <Textarea
                    id="manualTranscript"
                    value={manualTranscript}
                    onChange={(e) => setManualTranscript(e.target.value)}
                    placeholder="Paste the content here..."
                    className="bg-zinc-800 border-zinc-700 text-white min-h-[200px]"
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Common Options */}
            <div className="border-t border-zinc-800 pt-4 mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="createTasks"
                    checked={createTasks}
                    onCheckedChange={(checked) => setCreateTasks(checked as boolean)}
                  />
                  <label htmlFor="createTasks" className="text-sm text-zinc-300">
                    Auto-create tasks from action items
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="useAI"
                    checked={useAI}
                    onCheckedChange={(checked) => setUseAI(checked as boolean)}
                  />
                  <label htmlFor="useAI" className="text-sm text-zinc-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-yellow-500" />
                    Use AI parsing
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} className="border-zinc-700 text-zinc-300">
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={isImporting} className="gap-2">
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  'Import & Process'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
