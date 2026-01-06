'use client';

import { useMemo } from 'react';
import { usePortal } from '@/contexts/portal-context';
import { ClientIdeasView } from './client-ideas-view';

export default function IdeasPage() {
    const { data } = usePortal();

    // Compute filtered ideas from context
    const { pendingIdeas, approvedIdeas, usedIdeas, rejectedIdeas } = useMemo(() => {
        if (!data) {
            return { pendingIdeas: [], approvedIdeas: [], usedIdeas: [], rejectedIdeas: [] };
        }

        const ideas = data.ideas;

        // Filter ideas by status (case-insensitive to handle Notion variations)
        // Pending = ideas that need client approval (Needs Review, Reviewing statuses)
        const pendingStatuses = ['needs review', 'reviewing', 'ideas', 'not started', 'in progress'];
        const pending = ideas.filter((idea) =>
            pendingStatuses.includes(idea.status?.toLowerCase() || '')
        );

        // Approved = ideas approved by client, awaiting filming
        const approvedStatuses = ['approved', 'done'];
        const approved = ideas.filter((idea) =>
            approvedStatuses.includes(idea.status?.toLowerCase() || '') && !idea.linkedContentId
        );

        // Used = ideas that have been converted to content
        const usedStatuses = ['used', 'recorded'];
        const used = ideas.filter((idea) =>
            idea.linkedContentId || usedStatuses.includes(idea.status?.toLowerCase() || '')
        );

        // Rejected = ideas that have been rejected by client
        const rejected = ideas.filter((idea) =>
            idea.status?.toLowerCase() === 'not approved'
        );

        return {
            pendingIdeas: pending,
            approvedIdeas: approved,
            usedIdeas: used,
            rejectedIdeas: rejected,
        };
    }, [data]);

    if (!data) {
        return <div className="p-8 text-zinc-400">Loading...</div>;
    }

    // If no Content Bank client ID found, show error
    if (!data.contentBankClientId) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Content Ideas</h1>
                    <p className="text-zinc-400">
                        Unable to load ideas. Client not found in Content Bank.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Content Ideas</h1>
                <p className="text-zinc-400">
                    Review and approve content ideas. Approved ideas will be filmed and scheduled.
                </p>
            </div>

            <ClientIdeasView
                clientId={data.client.id}
                contentBankClientId={data.contentBankClientId}
                pendingIdeas={pendingIdeas}
                approvedIdeas={approvedIdeas}
                usedIdeas={usedIdeas}
                rejectedIdeas={rejectedIdeas}
            />
        </div>
    );
}
