import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/auth/session';
import { getClientById } from '@/lib/notion/client-users';
import { ClientProfileView } from './client-profile-view';

interface PageProps {
  params: Promise<{ clientSlug: string }>;
}

export default async function ClientProfilePage({ params }: PageProps) {
  const { clientSlug } = await params;
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  // Get client info
  let clientInfo = null;
  if (session.clientId) {
    clientInfo = await getClientById(session.clientId);
  }

  return (
    <ClientProfileView
      clientSlug={clientSlug}
      clientName={session.clientName || session.name || 'Client'}
      clientEmail={session.email || ''}
      hasPassword={clientInfo?.hasPassword || false}
      isTeamMember={session.userType === 'team'}
    />
  );
}
