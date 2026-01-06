'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Client, Content, ClientDeliverables } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ApprovalCard } from '@/components/portal/approval-card';
import {
  CheckCircle2,
  Calendar,
  Video,
  Youtube,
  Mic,
  Clock,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ClientPortalDashboardProps {
  client: Client;
  pendingApproval: Content[];
  upcomingContent: Content[];
  deliverables: ClientDeliverables;
  packageName?: string;
}

const contentTypeIcons = {
  'Short Form': Video,
  'YouTube': Youtube,
  'Podcast': Mic,
};

const contentTypeColors = {
  'Short Form': 'bg-blue-500/10 text-blue-500',
  'YouTube': 'bg-red-500/10 text-red-500',
  'Podcast': 'bg-purple-500/10 text-purple-500',
};

export function ClientPortalDashboard({
  client,
  pendingApproval: initialPendingApproval,
  upcomingContent,
  deliverables,
  packageName,
}: ClientPortalDashboardProps) {
  const router = useRouter();
  const [pendingApproval, setPendingApproval] = useState(initialPendingApproval);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (contentId: string) => {
    setProcessingId(contentId);
    try {
      // Find the content to get its type
      const contentItem = pendingApproval.find(c => c.id === contentId);
      if (!contentItem) {
        throw new Error('Content not found');
      }

      // Determine the status based on content type
      // Short Form → "Approved", YouTube/Podcast → "Final Review"
      const contentType = contentItem.contentType;
      let newStatus: string;

      if (contentType === 'YouTube' || contentType === 'Podcast') {
        newStatus = 'Final Review';
      } else {
        // Short Form or any other type
        newStatus = 'Approved';
      }

      const response = await fetch(`/api/content/${contentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to approve');

      setPendingApproval((prev) => prev.filter((c) => c.id !== contentId));
      toast.success(`Content approved! Status: ${newStatus}`);

      // Refresh server data to sync with Notion
      router.refresh();
    } catch (error) {
      toast.error('Failed to approve content');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRequestChanges = async (contentId: string) => {
    setProcessingId(contentId);
    try {
      // Find the content to get its type
      const contentItem = pendingApproval.find(c => c.id === contentId);
      if (!contentItem) {
        throw new Error('Content not found');
      }

      // Determine the status based on content type
      // Short Form → "In Progress", YouTube/Podcast → "Edit"
      const newStatus = contentItem.contentType === 'Short Form' ? 'In Progress' : 'Edit';

      // Update content status
      const response = await fetch(`/api/content/${contentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (!response.ok) throw new Error('Failed to request changes');

      // Send Slack notification to pivotal-alerts (not client channel - those are read-only)
      try {
        await fetch('/api/slack/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // Send to default pivotal-alerts channel (no channel specified = default)
            text: `🔄 Changes requested by ${client.name} for "${contentItem.title}" (${contentItem.contentType}). Content moved back to ${newStatus}.`,
          }),
        });
      } catch (slackError) {
        // Don't fail if Slack notification fails
        console.error('Failed to send Slack notification:', slackError);
      }

      setPendingApproval((prev) => prev.filter((c) => c.id !== contentId));
      toast.success('Changes requested! The team has been notified.');

      // Refresh server data to sync with Notion
      router.refresh();
    } catch (error) {
      toast.error('Failed to request changes');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="bg-zinc-950 min-h-screen">
      {/* Main Content */}
      <div className="p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Welcome Header */}
          <div>
            <h1 className="text-2xl font-bold text-white">Welcome, {client.name}</h1>
            <p className="text-zinc-400">
              {packageName || 'Standard Package'} • {pendingApproval.length} items pending your review
            </p>
          </div>

          {/* Deliverables Progress */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg text-white">Deliverables This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Short Form', data: deliverables.shortForm, color: 'bg-blue-500', icon: Video },
                  { label: 'YouTube', data: deliverables.youtube, color: 'bg-red-500', icon: Youtube },
                  { label: 'Podcast', data: deliverables.podcast, color: 'bg-purple-500', icon: Mic },
                ].map((item) => {
                  const Icon = item.icon;
                  const progress = item.data.target > 0
                    ? Math.min((item.data.delivered / item.data.target) * 100, 100)
                    : 0;
                  const isOnTrack = item.data.target === 0 || item.data.delivered >= item.data.target * 0.5;

                  return (
                    <div key={item.label}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={cn('w-4 h-4', item.color.replace('bg-', 'text-'))} />
                        <span className="text-sm text-zinc-400">{item.label}</span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-bold text-white">
                          {item.data.delivered}
                          <span className="text-sm text-zinc-500">/{item.data.target || '-'}</span>
                        </span>
                        {!isOnTrack && item.data.target > 0 && (
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', item.color)}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Pending Approval Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                <h2 className="text-lg font-semibold text-white">
                  Pending Your Approval ({pendingApproval.length})
                </h2>
              </div>
              <Link href={`/portal/${client.name.toLowerCase().replace(/\s+/g, '-')}/approvals`}>
                <Button variant="ghost" className="text-zinc-400 hover:text-white">
                  View All <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {pendingApproval.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {pendingApproval.slice(0, 4).map((content) => (
                  <ApprovalCard
                    key={content.id}
                    content={content}
                    onApprove={handleApprove}
                    onRequestChanges={handleRequestChanges}
                    isProcessing={processingId === content.id}
                  />
                ))}
              </div>
            ) : (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">All Caught Up!</h3>
                  <p className="text-zinc-400">No content pending your approval.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Upcoming Content */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-white">Upcoming Content</h2>
              </div>
              <Link href={`/portal/${client.name.toLowerCase().replace(/\s+/g, '-')}/calendar`}>
                <Button variant="ghost" className="text-zinc-400 hover:text-white">
                  View Calendar <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-0">
                {upcomingContent.length === 0 ? (
                  <div className="py-12 text-center">
                    <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                    <p className="text-zinc-500">No upcoming content scheduled.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800">
                    {upcomingContent.map((content) => {
                      const Icon = contentTypeIcons[content.contentType] || Video;
                      return (
                        <div key={content.id} className="flex items-center gap-4 p-4">
                          <div className="text-center min-w-[60px]">
                            <div className="text-2xl font-bold text-white">
                              {new Date(content.scheduledDate!).getDate()}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {new Date(content.scheduledDate!).toLocaleDateString('en-US', { month: 'short' })}
                            </div>
                          </div>
                          <div className={cn('p-2 rounded-lg', contentTypeColors[content.contentType] || 'bg-zinc-500/10 text-zinc-500')}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{content.title}</p>
                            <p className="text-xs text-zinc-500">{content.contentType}</p>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn('text-xs',
                              content.status === 'Approved' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                content.status === 'Scheduled' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                  'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                            )}
                          >
                            {content.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
