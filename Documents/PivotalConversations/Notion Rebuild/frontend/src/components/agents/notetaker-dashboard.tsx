'use client';

import { useState } from 'react';
import { Client, CaseNote } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Bot,
  MessageSquare,
  Mail,
  Phone,
  Play,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface NotetakerAgentDashboardProps {
  clients: Client[];
  clientsWithSlack: Client[];
  recentAutoNotes: CaseNote[];
  sourceStats: {
    slack: number;
    email: number;
    call: number;
  };
}

export function NotetakerAgentDashboard({
  clients,
  clientsWithSlack,
  recentAutoNotes,
  sourceStats,
}: NotetakerAgentDashboardProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunResult, setLastRunResult] = useState<{
    success: boolean;
    caseNotesCreated: number;
    tasksCreated: number;
    errors: number;
  } | null>(null);

  const handleRunAgent = async () => {
    setIsRunning(true);
    try {
      const response = await fetch('/api/agents/notetaker/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (result.success) {
        setLastRunResult({
          success: true,
          caseNotesCreated: result.summary.caseNotesCreated,
          tasksCreated: result.summary.tasksCreated,
          errors: result.summary.errors,
        });
        toast.success(
          `Agent completed: ${result.summary.caseNotesCreated} notes, ${result.summary.tasksCreated} tasks created`
        );
      } else {
        setLastRunResult({
          success: false,
          caseNotesCreated: 0,
          tasksCreated: 0,
          errors: 1,
        });
        toast.error('Agent run failed');
      }
    } catch (error) {
      toast.error('Failed to run agent');
      setLastRunResult({
        success: false,
        caseNotesCreated: 0,
        tasksCreated: 0,
        errors: 1,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Activity className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{clientsWithSlack.length}</p>
              <p className="text-sm text-zinc-400">Slack Channels</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <MessageSquare className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{sourceStats.slack}</p>
              <p className="text-sm text-zinc-400">Slack Notes (24h)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Phone className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{sourceStats.call}</p>
              <p className="text-sm text-zinc-400">Meeting Notes (24h)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Mail className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{sourceStats.email}</p>
              <p className="text-sm text-zinc-400">Email Notes (24h)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Control */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Bot className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-white">Notetaker Agent</CardTitle>
                <p className="text-sm text-zinc-400">
                  Automatically crawls Slack channels and processes meeting transcripts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  'gap-1',
                  isRunning
                    ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                    : 'bg-green-500/10 text-green-500 border-green-500/20'
                )}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Running
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    Ready
                  </>
                )}
              </Badge>
              <Button onClick={handleRunAgent} disabled={isRunning} className="gap-2">
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Run Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {/* Slack Crawler */}
            <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-purple-500" />
                <span className="font-medium text-white">Slack Crawler</span>
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs ml-auto">
                  Active
                </Badge>
              </div>
              <p className="text-sm text-zinc-400 mb-2">
                Monitors {clientsWithSlack.length} client channels for actionable messages
              </p>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Clock className="w-3 h-3" />
                Runs every hour
              </div>
            </div>

            {/* Meeting Webhook */}
            <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <div className="flex items-center gap-2 mb-3">
                <Phone className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-white">Meeting Transcripts</span>
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs ml-auto">
                  Active
                </Badge>
              </div>
              <p className="text-sm text-zinc-400 mb-2">
                Receives transcripts from Fathom & Fireflies via webhook
              </p>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <RefreshCw className="w-3 h-3" />
                Real-time via webhooks
              </div>
            </div>

            {/* Email Integration */}
            <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="w-4 h-4 text-yellow-500" />
                <span className="font-medium text-white">Email Integration</span>
                <Badge variant="outline" className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 text-xs ml-auto">
                  Coming Soon
                </Badge>
              </div>
              <p className="text-sm text-zinc-400 mb-2">
                Gmail/Outlook integration for client email threads
              </p>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <AlertCircle className="w-3 h-3" />
                Requires OAuth setup
              </div>
            </div>
          </div>

          {/* Last Run Result */}
          {lastRunResult && (
            <div
              className={cn(
                'mt-4 p-4 rounded-lg border',
                lastRunResult.success
                  ? 'bg-green-500/10 border-green-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              )}
            >
              <div className="flex items-center gap-2">
                {lastRunResult.success ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                <span className={lastRunResult.success ? 'text-green-500' : 'text-red-500'}>
                  Last Run: {lastRunResult.success ? 'Success' : 'Failed'}
                </span>
                {lastRunResult.success && (
                  <span className="text-zinc-400 text-sm ml-2">
                    Created {lastRunResult.caseNotesCreated} case notes and{' '}
                    {lastRunResult.tasksCreated} tasks
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook URLs */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Webhook URLs</CardTitle>
          <p className="text-sm text-zinc-400">
            Configure these URLs in your meeting tools to receive transcripts automatically
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Fathom Webhook</p>
                <code className="text-sm text-zinc-400">/api/webhooks/fathom</code>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://fathom.video/settings/integrations"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Configure
                </a>
              </Button>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Fireflies Webhook</p>
                <code className="text-sm text-zinc-400">/api/webhooks/fireflies</code>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://app.fireflies.ai/settings/integrations"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Configure
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients with Slack */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Monitored Clients</CardTitle>
          <p className="text-sm text-zinc-400">
            Clients with Slack channels configured for automatic monitoring
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {clientsWithSlack.length > 0 ? (
              clientsWithSlack.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-purple-500" />
                    <span className="font-medium text-white">{client.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-green-500/10 text-green-500 border-green-500/20"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Slack Connected
                    </Badge>
                    {client.slackChannel && (
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={client.slackChannel}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-zinc-500">
                No clients have Slack channels configured yet.
                <br />
                Add a Slack channel URL to a client to enable monitoring.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Auto-Generated Notes */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Recent Auto-Generated Notes (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentAutoNotes.length > 0 ? (
              recentAutoNotes.slice(0, 10).map((note) => {
                const SourceIcon =
                  note.source === 'Slack'
                    ? MessageSquare
                    : note.source === 'Email'
                    ? Mail
                    : Phone;
                return (
                  <div
                    key={note.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700"
                  >
                    <SourceIcon className="w-4 h-4 text-zinc-400" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{note.title}</p>
                      <p className="text-sm text-zinc-500">
                        {note.clientName} • {new Date(note.date).toLocaleString()}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        note.type === 'Client Request'
                          ? 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                          : note.type === 'Editing Guideline'
                          ? 'bg-green-500/10 text-green-500 border-green-500/20'
                          : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                      )}
                    >
                      {note.type}
                    </Badge>
                  </div>
                );
              })
            ) : (
              <p className="text-center py-8 text-zinc-500">
                No auto-generated notes in the last 24 hours.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
