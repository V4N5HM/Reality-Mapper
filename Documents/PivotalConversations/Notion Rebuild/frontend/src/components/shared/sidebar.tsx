'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Layers,
  Lightbulb,
  CheckSquare,
  CalendarDays,
  FileText,
  ChevronLeft,
  ChevronRight,
  Repeat,
  BarChart3,
  Bell,
  X,
  User,
  ClipboardCheck,
  UsersRound,
  UserCog,
  type LucideIcon,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import type { WorkspaceType } from '@/types';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  // Access control
  fullDashboardOnly?: boolean; // Only show for full_dashboard users
  adminOnly?: boolean; // Only show for admin users
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Schedule', href: '/schedule', icon: CalendarDays, fullDashboardOnly: true },
  { name: 'Pipeline', href: '/pipeline', icon: Layers, fullDashboardOnly: true },
  { name: 'Ideas', href: '/ideas', icon: Lightbulb, fullDashboardOnly: true },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Case Notes', href: '/case-notes', icon: FileText },
  { name: 'Alerts', href: '/alerts', icon: Bell },
  { name: 'Cadence', href: '/cadence', icon: Repeat },
  { name: 'Check-in', href: '/checkin', icon: ClipboardCheck },
  { name: 'Reports', href: '/reports', icon: BarChart3, fullDashboardOnly: true },
  { name: 'Team Report', href: '/team-report', icon: UsersRound, adminOnly: true },
  { name: 'Team', href: '/team', icon: UserCog, adminOnly: true },
];

const secondaryNavigation: NavItem[] = [
  { name: 'Profile', href: '/profile', icon: User },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  workspaceType?: WorkspaceType;
  isAdmin?: boolean;
}

export function Sidebar({ mobileOpen = false, onMobileClose, workspaceType = 'full_dashboard', isAdmin = false }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);

  // Filter navigation items based on access level
  const filteredNavigation = navigation.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.fullDashboardOnly && workspaceType !== 'full_dashboard') return false;
    return true;
  });

  // Close mobile sidebar on route change
  useEffect(() => {
    if (mobileOpen && onMobileClose) {
      onMobileClose();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Preserve date range query params when navigating
  const getHrefWithParams = (baseHref: string) => {
    const dateRange = searchParams.get('dateRange');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    if (!dateRange || dateRange === 'all-time') {
      return baseHref;
    }

    const params = new URLSearchParams();
    params.set('dateRange', dateRange);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);

    return `${baseHref}?${params.toString()}`;
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-6">
        <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src="/pivotalconversations_logo.jpeg"
            alt="Logo"
            fill
            className="object-cover"
            priority
          />
        </div>
        {/* Mobile close button */}
        {mobileOpen && onMobileClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMobileClose}
            className="md:hidden text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={getHrefWithParams(item.href)}
              prefetch={true}
              onClick={onMobileClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Secondary Navigation */}
      {secondaryNavigation.length > 0 && (
        <div className="px-2 py-4 border-t border-zinc-800">
          {secondaryNavigation.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={getHrefWithParams(item.href)}
                prefetch={true}
                onClick={onMobileClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </div>
      )}

      {/* Collapse Button - Desktop only */}
      <div className="hidden md:block px-2 py-4 border-t border-zinc-800">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center text-zinc-400 hover:text-white"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar - Desktop: always visible, Mobile: slide in/out */}
      <div
        className={cn(
          'flex flex-col h-screen bg-zinc-950 border-r border-zinc-800 transition-all duration-300',
          // Desktop styles
          'hidden md:flex',
          collapsed ? 'md:w-16' : 'md:w-64'
        )}
      >
        {sidebarContent}
      </div>

      {/* Mobile sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-zinc-950 border-r border-zinc-800 transition-transform duration-300 md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </div>
    </>
  );
}
