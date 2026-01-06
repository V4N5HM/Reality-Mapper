import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { redirect } from 'next/navigation';
import { sessionOptions, SessionData } from '@/lib/auth/session';
import { getTeamMemberByEmail } from '@/lib/auth/team-users';
import { notion, databases, getRichText } from '@/lib/notion/client';
import { ProfileView } from '@/components/profile/profile-view';

export const dynamic = 'force-dynamic';

async function getProfileData() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.isLoggedIn || session.userType !== 'team') {
    redirect('/login');
  }

  const member = await getTeamMemberByEmail(session.email);
  if (!member) {
    redirect('/login');
  }

  // Get Fireflies user ID from Notion
  let firefliesUserId: string | null = null;
  let firefliesUserName: string | null = null;

  if (databases.teamMembers) {
    try {
      const existingMembers = await notion.databases.query({
        database_id: databases.teamMembers,
        filter: {
          property: 'Email',
          email: {
            equals: session.email.toLowerCase(),
          },
        },
      });

      if (existingMembers.results.length > 0) {
        const page = existingMembers.results[0] as any;
        firefliesUserId = getRichText(page.properties['Fireflies User ID']?.rich_text || []) || null;
        firefliesUserName = getRichText(page.properties['Fireflies User Name']?.rich_text || []) || null;
      }
    } catch (error) {
      console.error('Error fetching Fireflies user ID:', error);
    }
  }

  return {
    id: member.id,
    name: member.name,
    email: member.email,
    roles: member.roles,
    teamRole: member.teamRole,
    team: member.team,
    workspaceType: member.workspaceType,
    isAdmin: member.isAdmin,
    firefliesUserId,
    firefliesUserName,
  };
}

export default async function ProfilePage() {
  const profile = await getProfileData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="text-zinc-400">Manage your account settings</p>
      </div>

      {/* Profile View */}
      <div className="max-w-2xl">
        <ProfileView profile={profile} />
      </div>
    </div>
  );
}
