'use client';

import { useMemo } from 'react';
import { usePortal } from '@/contexts/portal-context';
import { ClientCalendar } from './client-calendar';

export default function CalendarPage() {
    const { data } = usePortal();

    // Get only scheduled content from context
    const scheduledContent = useMemo(() => {
        if (!data) return [];
        return data.content.filter(c => c.scheduledDate);
    }, [data]);

    if (!data) {
        return <div className="p-8 text-zinc-400">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Content Calendar</h1>
                <p className="text-zinc-400">
                    View your upcoming scheduled content.
                </p>
            </div>

            <ClientCalendar content={scheduledContent} />
        </div>
    );
}
