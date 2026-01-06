'use client';

import { useMemo } from 'react';
import { usePortal } from '@/contexts/portal-context';
import { ClientPortalApprovals } from './client-portal-approvals';

export default function ApprovalsPage() {
    const { data } = usePortal();

    // Get content pending approval from context
    const pendingApproval = useMemo(() => {
        if (!data) return [];
        return data.content.filter((c) =>
            ['Client Feedback', 'Client Review'].includes(c.status)
        );
    }, [data]);

    if (!data) {
        return <div className="p-8 text-zinc-400">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Pending Approvals</h1>
                <p className="text-zinc-400">
                    Review and approve content before it goes live.
                </p>
            </div>

            <ClientPortalApprovals initialContent={pendingApproval} client={data.client} />
        </div>
    );
}
