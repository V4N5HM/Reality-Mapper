'use client';

import { useMemo } from 'react';
import { usePortal } from '@/contexts/portal-context';
import { ClientScheduleView } from './client-schedule-view';

export default function SchedulePage() {
    const { data } = usePortal();

    // Filter to only scheduled content (has a scheduled date)
    const scheduledContent = useMemo(() => {
        if (!data) return [];
        return data.content.filter((c) => c.scheduledDate);
    }, [data]);

    if (!data) {
        return <div className="p-8 text-zinc-400">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Content Schedule</h1>
                <p className="text-zinc-400">
                    View your upcoming content schedule and track production progress.
                </p>
            </div>

            <ClientScheduleView content={scheduledContent} clientId={data.client.id} />
        </div>
    );
}
