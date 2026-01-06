import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/auth/session';
import { DashboardShell } from '@/components/shared/dashboard-shell';

async function getSessionData() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return {
    workspaceType: session.workspaceType || 'full_dashboard',
    isAdmin: session.isAdmin || false,
    userName: session.name || '',
    teamRole: session.teamRole,
  };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionData = await getSessionData();

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardShell
        workspaceType={sessionData.workspaceType}
        isAdmin={sessionData.isAdmin}
        userName={sessionData.userName}
        teamRole={sessionData.teamRole}
      >
        {children}
      </DashboardShell>
    </Suspense>
  );
}

// Simple skeleton for initial load
function DashboardSkeleton() {
  return (
    <div className="flex h-screen bg-zinc-950">
      {/* Sidebar skeleton - hidden on mobile */}
      <div className="hidden md:block w-64 h-screen bg-zinc-950 border-r border-zinc-800" />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header skeleton */}
        <div className="h-14 md:h-16 border-b border-zinc-800 bg-zinc-950" />
        {/* Content skeleton */}
        <div className="flex-1 p-4 md:p-6" />
      </div>
    </div>
  );
}
