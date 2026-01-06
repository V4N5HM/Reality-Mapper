'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, LogOut, Menu, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CommandPalette } from './command-palette';
import { NotificationsDropdown } from './notifications-dropdown';
import { DateRangeFilter } from './date-range-filter';
import type { TeamRole } from '@/types';

interface SessionData {
  isLoggedIn: boolean;
  name?: string;
  email?: string;
  userType?: 'team' | 'client';
  roles?: string[];
  teamRole?: TeamRole;
}

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
  userName?: string;
  teamRole?: TeamRole;
}

export function Header({ title, onMenuClick, userName, teamRole }: HeaderProps) {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => setSession(data))
      .catch(() => setSession({ isLoggedIn: false }));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Get user initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="h-14 md:h-16 border-b border-zinc-800 bg-zinc-950 px-4 md:px-6 flex items-center justify-between">
      {/* Left side - Menu button (mobile) + Title or Search */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className="md:hidden text-zinc-400 hover:text-white -ml-2"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {title ? (
          <h1 className="text-lg md:text-xl font-semibold text-white truncate">{title}</h1>
        ) : (
          <div className="hidden sm:block">
            <CommandPalette />
          </div>
        )}
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-1.5 md:gap-3">
        {/* Date Range Filter - Hidden on small mobile */}
        <div className="hidden sm:block">
          <DateRangeFilter />
        </div>

        {/* Quick Add - Show icon only on mobile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-2 px-2 md:px-3">
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">New</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>New Client</DropdownMenuItem>
            <DropdownMenuItem>New Content</DropdownMenuItem>
            <DropdownMenuItem>New Idea</DropdownMenuItem>
            <DropdownMenuItem>New Task</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>New Case Note</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <NotificationsDropdown />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 md:h-9 md:w-9 rounded-full">
              <Avatar className="h-8 w-8 md:h-9 md:w-9">
                <AvatarFallback className="bg-zinc-800 text-white text-xs md:text-sm">
                  {getInitials(session?.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{session?.name || 'My Account'}</p>
                {session?.email && (
                  <p className="text-xs text-zinc-400 truncate">{session.email}</p>
                )}
                {session?.roles && session.roles.length > 0 && (
                  <p className="text-xs text-zinc-500">{session.roles.join(', ')}</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* Profile link */}
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center">
                <User className="w-4 h-4 mr-2" />
                Profile
              </Link>
            </DropdownMenuItem>
            {/* Mobile-only: Date Range access */}
            <div className="sm:hidden px-2 py-1.5">
              <DateRangeFilter />
            </div>
            <DropdownMenuSeparator className="sm:hidden" />
            <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-400">
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
