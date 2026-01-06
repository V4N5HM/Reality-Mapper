'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, Mic, CheckCircle, AlertCircle, ListTodo } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TranscriptUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  clientName?: string;
  onNoteCreated?: () => void;
}

interface ProcessingResult {
  success: boolean;
  caseNoteId?: string;
  tasksCreated?: number;
  clientMatched?: boolean;
  parsedNote?: {
    title: string;
    type: string;
    actionItems: string[];
  };
  error?: string;
}

export function TranscriptUploadDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  onNoteCreated,
}: TranscriptUploadDialogProps) {
  const [meetingTitle, setMeetingTitle] = useState('');
  const [transcript, setTranscript] = useState('');
  const [source, setSource] = useState<'fireflies' | 'fathom' | 'manual'>('manual');
  const [participants, setParticipants] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [createTasks, setCreateTasks] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);

  const resetForm = () => {
    setMeetingTitle('');
    setTranscript('');
    setSource('manual');
    setParticipants('');
    setMeetingDate(new Date().toISOString().split('T')[0]);
    setCreateTasks(true);
    setResult(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!transcript.trim()) {
      toast.error('Please enter a transcript');
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/notetaker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          payload: {
            title: meetingTitle || 'Meeting Transcript',
            transcript: transcript.trim(),
            participants: participants
              .split(',')
              .map((p) => p.trim())
              .filter(Boolean),
            date: meetingDate,
            clientId, // Pass the client ID if we're in client context
          },
          createTasks,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process transcript');
      }

      setResult({
        success: true,
        caseNoteId: data.caseNoteId,
        tasksCreated: data.tasksCreated,
        clientMatched: data.clientMatched,
        parsedNote: data.parsedNote,
      });

      toast.success('Transcript processed successfully');
      onNoteCreated?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process transcript';
      setResult({ success: false, error: message });
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Upload Meeting Transcript
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Paste a meeting transcript to automatically create a case note and extract action items.
          </DialogDescription>
        </DialogHeader>

        {result?.success ? (
          // Success State
          <div className="py-6 space-y-4">
            <div className="flex items-center justify-center">
              <div className="p-4 rounded-full bg-green-500/10">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-medium text-white">Transcript Processed</h3>
              <p className="text-sm text-zinc-400">
                Case note created successfully
                {result.clientMatched ? '' : ' (no client matched)'}
              </p>
            </div>

            {/* Summary */}
            <div className="space-y-3 p-4 rounded-lg bg-zinc-800 border border-zinc-700">
              {result.parsedNote && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Title</span>
                    <span className="text-sm text-white">{result.parsedNote.title}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Type</span>
                    <Badge variant="outline" className="text-xs">
                      {result.parsedNote.type}
                    </Badge>
                  </div>
                </>
              )}
              {result.tasksCreated !== undefined && result.tasksCreated > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Tasks Created</span>
                  <Badge
                    variant="outline"
                    className="text-xs bg-green-500/10 text-green-500 border-green-500/20 gap-1"
                  >
                    <ListTodo className="w-3 h-3" />
                    {result.tasksCreated} tasks
                  </Badge>
                </div>
              )}
              {result.parsedNote?.actionItems && result.parsedNote.actionItems.length > 0 && (
                <div className="pt-2 border-t border-zinc-700">
                  <p className="text-xs text-zinc-500 mb-2">Extracted Action Items:</p>
                  <ul className="space-y-1">
                    {result.parsedNote.actionItems.slice(0, 5).map((item, i) => (
                      <li key={i} className="text-xs text-zinc-300 flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                    {result.parsedNote.actionItems.length > 5 && (
                      <li className="text-xs text-zinc-500">
                        +{result.parsedNote.actionItems.length - 5} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => setResult(null)} variant="outline" className="border-zinc-700">
                Upload Another
              </Button>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          // Form State
          <div className="space-y-4 py-4">
            {/* Client Context */}
            {clientName && (
              <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                <p className="text-xs text-zinc-500 mb-1">Creating note for</p>
                <p className="text-sm font-medium text-white">{clientName}</p>
              </div>
            )}

            {/* Source Selection */}
            <div className="space-y-2">
              <Label className="text-zinc-300">Transcript Source</Label>
              <Select value={source} onValueChange={(v) => setSource(v as typeof source)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="manual">Manual Input</SelectItem>
                  <SelectItem value="fireflies">Fireflies.ai Export</SelectItem>
                  <SelectItem value="fathom">Fathom Export</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Meeting Title */}
            <div className="space-y-2">
              <Label htmlFor="meetingTitle" className="text-zinc-300">
                Meeting Title
              </Label>
              <Input
                id="meetingTitle"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="e.g., Weekly Client Sync - John Smith"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            {/* Meeting Date */}
            <div className="space-y-2">
              <Label htmlFor="meetingDate" className="text-zinc-300">
                Meeting Date
              </Label>
              <Input
                id="meetingDate"
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            {/* Participants (for client matching) */}
            {!clientId && (
              <div className="space-y-2">
                <Label htmlFor="participants" className="text-zinc-300">
                  Participants (comma-separated)
                </Label>
                <Input
                  id="participants"
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                  placeholder="e.g., John Smith, Jane Doe"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
                <p className="text-xs text-zinc-500">
                  Used to match the transcript to a client automatically
                </p>
              </div>
            )}

            {/* Transcript */}
            <div className="space-y-2">
              <Label htmlFor="transcript" className="text-zinc-300">
                Transcript
              </Label>
              <Textarea
                id="transcript"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste the meeting transcript here..."
                className="bg-zinc-800 border-zinc-700 text-white min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-zinc-500">
                The system will automatically extract action items and determine the note type
              </p>
            </div>

            {/* Create Tasks Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800 border border-zinc-700">
              <div className="space-y-0.5">
                <Label className="text-zinc-300">Auto-create tasks</Label>
                <p className="text-xs text-zinc-500">
                  Automatically create tasks from detected action items
                </p>
              </div>
              <Switch checked={createTasks} onCheckedChange={setCreateTasks} />
            </div>

            {/* Error State */}
            {result?.error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-400">{result.error}</p>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-zinc-700 text-zinc-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!transcript.trim() || isProcessing}
                className="gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Process Transcript
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
