import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/auth/session';
import { TeamReportDashboard } from '@/components/checkin/team-report-dashboard';

export const dynamic = 'force-dynamic';

async function checkAdminAccess() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.isLoggedIn || session.userType !== 'team') {
    redirect('/login');
  }

  if (!session.isAdmin) {
    redirect('/');
  }

  return true;
}

export default async function TeamReportPage() {
  await checkAdminAccess();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Team Report</h1>
        <p className="text-zinc-400">View team check-in analytics and insights</p>
      </div>

      {/* Team Report Dashboard */}
      <TeamReportDashboard />
    </div>
  );
}
