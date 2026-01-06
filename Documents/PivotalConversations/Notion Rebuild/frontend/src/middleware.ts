import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/auth/session';

// Routes that don't require authentication
const publicRoutes = ['/login', '/signup', '/api/auth/login', '/api/auth/logout', '/api/auth/signup'];

// API routes that bypass auth (webhooks, cron jobs, admin utilities)
const bypassRoutes = ['/api/cron/', '/api/webhooks/', '/api/slack/', '/api/admin/', '/api/debug/'];

// Full dashboard routes - require team member with full_dashboard access
// These are restricted from team_workspace users
const fullDashboardOnlyRoutes = [
  '/pipeline',
  '/ideas',
  '/schedule',
  '/reports',
  '/brain',
];

// Admin-only routes - require isAdmin
const adminOnlyRoutes = [
  '/team-report',
];

// Routes accessible to all team members (both full_dashboard and team_workspace)
const commonTeamRoutes = [
  '/',
  '/clients',
  '/tasks',
  '/case-notes',
  '/cadence',
  '/bookings',
  '/agents',
  '/settings',
  '/alerts',
  '/profile',
  '/checkin',
];

// All dashboard routes (union of all team routes)
const dashboardRoutes = [
  ...fullDashboardOnlyRoutes,
  ...adminOnlyRoutes,
  ...commonTeamRoutes,
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next();
  }

  // Allow bypass routes (webhooks, cron)
  if (bypassRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') // files with extensions
  ) {
    return NextResponse.next();
  }

  // Get session from cookie
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  // Not logged in - redirect to login
  if (!session.isLoggedIn) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check dashboard routes - team members only
  const isDashboardRoute = dashboardRoutes.some(
    route => pathname === route || pathname.startsWith(route + '/')
  );

  if (isDashboardRoute && session.userType !== 'team') {
    // Redirect clients to their portal
    if (session.clientSlug) {
      return NextResponse.redirect(new URL(`/portal/${session.clientSlug}`, request.url));
    }
    // No client slug - back to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Role-based access control for team members
  if (session.userType === 'team') {
    // Check admin-only routes
    const isAdminRoute = adminOnlyRoutes.some(
      route => pathname === route || pathname.startsWith(route + '/')
    );
    if (isAdminRoute && !session.isAdmin) {
      // Non-admins can't access admin routes - redirect to home
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Check full dashboard routes for team_workspace users
    const isFullDashboardRoute = fullDashboardOnlyRoutes.some(
      route => pathname === route || pathname.startsWith(route + '/')
    );
    if (isFullDashboardRoute && session.workspaceType === 'team_workspace') {
      // team_workspace users can't access full dashboard routes - redirect to tasks
      return NextResponse.redirect(new URL('/tasks', request.url));
    }
  }

  // Check portal routes
  if (pathname.startsWith('/portal/')) {
    const slugMatch = pathname.match(/^\/portal\/([^\/]+)/);
    const requestedSlug = slugMatch?.[1];

    // Team members can access any portal
    if (session.userType === 'team') {
      return response;
    }

    // Clients can only access their own portal
    if (session.userType === 'client' && session.clientSlug !== requestedSlug) {
      return NextResponse.redirect(new URL(`/portal/${session.clientSlug}`, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Match all routes except static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
