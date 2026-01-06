'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import type { WorkspaceType, TeamRole } from '@/types';

interface DashboardShellProps {
  children: React.ReactNode;
  workspaceType?: WorkspaceType;
  isAdmin?: boolean;
  userName?: string;
  teamRole?: TeamRole;
}

export function DashboardShell({
  children,
  workspaceType = 'full_dashboard',
  isAdmin = false,
  userName = '',
  teamRole,
}: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        workspaceType={workspaceType}
        isAdmin={isAdmin}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          onMenuClick={() => setMobileMenuOpen(true)}
          userName={userName}
          teamRole={teamRole}
        />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
