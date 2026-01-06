'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Lightbulb,
  Calendar,
  BarChart3,
  Menu,
  X,
  LogOut,
  User,
} from 'lucide-react';

interface PortalHeaderProps {
  clientSlug: string;
  clientName: string;
  hasReport?: boolean;
}

export function PortalHeader({ clientSlug, clientName, hasReport = false }: PortalHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const baseUrl = `/portal/${clientSlug}`;

  const links = [
    {
      href: baseUrl,
      label: 'Dashboard',
      icon: LayoutDashboard,
      active: pathname === baseUrl,
    },
    {
      href: `${baseUrl}/ideas`,
      label: 'Ideas',
      icon: Lightbulb,
      active: pathname.startsWith(`${baseUrl}/ideas`),
    },
    {
      href: `${baseUrl}/schedule`,
      label: 'Schedule',
      icon: Calendar,
      active: pathname.startsWith(`${baseUrl}/schedule`),
    },
    // Only show Report tab if client has a report configured
    ...(hasReport
      ? [
          {
            href: `${baseUrl}/report`,
            label: 'Report',
            icon: BarChart3,
            active: pathname.startsWith(`${baseUrl}/report`),
          },
        ]
      : []),
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-8">
            <Link href={baseUrl} className="flex items-center gap-2 md:gap-3">
              <div className="relative w-8 h-8 md:w-10 md:h-10 rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src="/pivotalconversations_logo.jpeg"
                  alt="Logo"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <span className="font-bold text-base md:text-xl text-white truncate max-w-[150px] md:max-w-none">
                {clientName}
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {links.map((link) => {
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href}>
                    <Button
                      variant="ghost"
                      className={cn(
                        'gap-2 text-zinc-400 hover:text-white hover:bg-zinc-800',
                        link.active && 'bg-zinc-800 text-white'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {link.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop Profile */}
            <Link href={`${baseUrl}/profile`}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'hidden md:flex gap-2 text-zinc-400 hover:text-white',
                  pathname.startsWith(`${baseUrl}/profile`) && 'bg-zinc-800 text-white'
                )}
              >
                <User className="w-4 h-4" />
                Profile
              </Button>
            </Link>

            {/* Desktop Logout */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="hidden md:flex gap-2 text-zinc-400 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-zinc-400 hover:text-white"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-zinc-800 bg-zinc-950 px-4 py-3 space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      link.active
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {link.label}
                  </div>
                </Link>
              );
            })}
            <div className="border-t border-zinc-800 pt-2 mt-2">
              <Link
                href={`${baseUrl}/profile`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <div
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    pathname.startsWith(`${baseUrl}/profile`)
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  )}
                >
                  <User className="w-5 h-5" />
                  Profile
                </div>
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-zinc-800/50 w-full"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
