'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Content, Client } from '@/types';
import { ApprovalCard } from '@/components/portal/approval-card';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface ClientPortalApprovalsProps {
    initialContent: Content[];
    client: Client;
}

export function ClientPortalApprovals({ initialContent, client }: ClientPortalApprovalsProps) {
    const router = useRouter();
    const [content, setContent] = useState(initialContent);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleApprove = async (contentId: string) => {
        setProcessingId(contentId);
        try {
            // Find the content to get its type
            const contentItem = content.find(c => c.id === contentId);
            if (!contentItem) {
                throw new Error('Content not found');
            }

            // Determine the status based on content type
            // Short Form → "Approved", YouTube/Podcast → "Final Review"
            const contentType = contentItem.contentType;
            let newStatus: string;

            // CRITICAL: YouTube and Podcast go to "Final Review", Short Form goes to "Approved"
            if (contentType === 'YouTube' || contentType === 'Podcast') {
                newStatus = 'Final Review';
            } else {
                // Short Form or any other type
                newStatus = 'Approved';
            }

            // Show user what's happening with an alert (can't be missed)
            const debugMessage = `Content Type: "${contentType}"\nTarget Status: "${newStatus}"`;
            console.log(`[Client Portal] Approving content:`, {
                id: contentId,
                title: contentItem.title,
                contentType: contentType,
                contentTypeRaw: JSON.stringify(contentItem.contentType),
                currentStatus: contentItem.status,
                targetStatus: newStatus,
                isYouTube: contentType === 'YouTube',
                isPodcast: contentType === 'Podcast',
                isShortForm: contentType === 'Short Form',
            });

            const response = await fetch(`/api/content/${contentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('[Client Portal] Failed to approve:', errorData);
                toast.error(`Failed: ${JSON.stringify(errorData)}`);
                throw new Error('Failed to approve');
            }

            const updatedContent = await response.json();
            console.log('[Client Portal] Content updated successfully:', updatedContent);

            // Verify the status was actually set
            const newStatusFromResponse = updatedContent?.properties?.Status?.select?.name;
            console.log('[Client Portal] New status from Notion response:', newStatusFromResponse);

            setContent((prev) => prev.filter((c) => c.id !== contentId));

            // Show result message
            toast.success(`Content approved! Status: ${newStatusFromResponse || newStatus}`);

            // Refresh server data to sync with Notion
            router.refresh();
        } catch (error) {
            console.error('[Client Portal] Approval error:', error);
            toast.error('Failed to approve content');
        } finally {
            setProcessingId(null);
        }
    };

    const handleRequestChanges = async (contentId: string) => {
        setProcessingId(contentId);
        try {
            // Find the content to get its type
            const contentItem = content.find(c => c.id === contentId);
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

            setContent((prev) => prev.filter((c) => c.id !== contentId));
            toast.success('Changes requested! The team has been notified.');

            // Refresh server data to sync with Notion
            router.refresh();
        } catch (error) {
            toast.error('Failed to request changes');
        } finally {
            setProcessingId(null);
        }
    };

    if (content.length === 0) {
        return (
            <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="py-12 text-center">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">All Caught Up!</h3>
                    <p className="text-zinc-400">No content pending your approval.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2">
            {content.map((item) => (
                <ApprovalCard
                    key={item.id}
                    content={item}
                    onApprove={handleApprove}
                    onRequestChanges={handleRequestChanges}
                    isProcessing={processingId === item.id}
                />
            ))}
        </div>
    );
}
