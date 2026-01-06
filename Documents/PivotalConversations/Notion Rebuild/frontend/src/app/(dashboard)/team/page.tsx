import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { redirect } from 'next/navigation';
import { sessionOptions, SessionData } from '@/lib/auth/session';
import { getTeamMembers } from '@/lib/notion/team';
import { TeamManagement } from '@/components/team/team-management';

export const dynamic = 'force-dynamic';

async function getTeamData() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.isLoggedIn || session.userType !== 'team') {
    redirect('/login');
  }

  // Only admins can access this page
  if (!session.isAdmin) {
    redirect('/');
  }

  const members = await getTeamMembers();

  return {
    members,
    isAdmin: session.isAdmin,
  };
}

export default async function TeamPage() {
  const { members, isAdmin } = await getTeamData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Team Management</h1>
        <p className="text-zinc-400">Manage team members and invitations</p>
      </div>

      {/* Team Management Component */}
      <TeamManagement members={members} isAdmin={isAdmin} />
    </div>
  );
}
