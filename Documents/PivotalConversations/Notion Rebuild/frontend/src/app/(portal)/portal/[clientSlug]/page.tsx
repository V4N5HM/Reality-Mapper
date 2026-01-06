'use client';

import { useMemo } from 'react';
import { usePortal } from '@/contexts/portal-context';
import { ClientPortalDashboard } from '@/components/portal/client-portal-dashboard';

export default function ClientPortalPage() {
  const { data } = usePortal();

  // Compute derived data from context
  const { pendingApproval, upcomingContent, deliverables } = useMemo(() => {
    if (!data) {
      return { pendingApproval: [], upcomingContent: [], deliverables: { shortForm: { delivered: 0, target: 0 }, youtube: { delivered: 0, target: 0 }, podcast: { delivered: 0, target: 0 } } };
    }

    const content = data.content;

    // Get content pending approval (in Client Feedback or Client Review status)
    const pending = content.filter((c) =>
      ['Client Feedback', 'Client Review'].includes(c.status)
    );

    // Get upcoming scheduled content
    const today = new Date();
    const upcoming = content
      .filter((c) => {
        if (!c.scheduledDate) return false;
        const date = new Date(c.scheduledDate);
        return date >= today && ['Filmed', 'In Progress', 'Approved', 'Scheduled', 'To Schedule'].includes(c.status);
      })
      .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())
      .slice(0, 10);

    // Calculate deliverables this month
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();

    const getMonthlyDelivered = (type: string, statuses: string[]) =>
      content.filter((c) => {
        if (c.contentType !== type || !c.scheduledDate) return false;
        const date = new Date(c.scheduledDate);
        return (
          date.getMonth() === thisMonth &&
          date.getFullYear() === thisYear &&
          statuses.includes(c.status)
        );
      }).length;

    // Get package targets from context
    const pkg = data.clientPackage;

    return {
      pendingApproval: pending,
      upcomingContent: upcoming,
      deliverables: {
        shortForm: {
          delivered: getMonthlyDelivered('Short Form', ['Posted']),
          target: pkg?.shortFormPerMonth || 0,
        },
        youtube: {
          delivered: getMonthlyDelivered('YouTube', ['Live', 'Complete']),
          target: pkg?.youtubePerMonth || 0,
        },
        podcast: {
          delivered: getMonthlyDelivered('Podcast', ['Live', 'Complete']),
          target: pkg?.podcastPerMonth || 0,
        },
      },
    };
  }, [data]);

  if (!data) {
    return <div className="p-8 text-zinc-400">Loading...</div>;
  }

  return (
    <ClientPortalDashboard
      client={data.client}
      pendingApproval={pendingApproval}
      upcomingContent={upcomingContent}
      deliverables={deliverables}
      packageName={data.clientPackage?.name}
    />
  );
}
