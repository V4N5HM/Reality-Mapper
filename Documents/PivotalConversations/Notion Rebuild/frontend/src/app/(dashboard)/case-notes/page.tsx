import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/auth/session';
import { getCaseNotesPaginated } from '@/lib/notion/case-notes';
import { getClients } from '@/lib/notion/clients';
import { CaseNotesView } from '@/components/case-notes/case-notes-view';

// Force dynamic rendering since we use cookies for session
export const dynamic = 'force-dynamic';

// Natasha's email - Personal Brand team can see her meetings
const NATASHA_EMAIL = 'natasha@pivotalconversations.com.au';

export default async function CaseNotesPage() {
  try {
    // Get the user's session to determine filtering
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    // Determine filtering based on team membership and admin status
    let firefliesOwnerEmails: string[] | undefined;
    let includeNonFireflies = false;

    if (session.isLoggedIn && session.userType === 'team') {
      const isPersonalBrand = session.team?.includes('Personal Brand');
      const isAdmin = session.isAdmin === true;

      // Admins can see all case notes (no filtering)
      if (isAdmin) {
        includeNonFireflies = true;
        // Don't set firefliesOwnerEmails - admin sees everything
      } else {
        // Build the list of Fireflies owner emails this user can see
        const allowedEmails: string[] = [];

        // Always include the user's own email for their own Fireflies meetings
        if (session.email) {
          allowedEmails.push(session.email.toLowerCase());
        }

        // Personal Brand team members can also see Natasha's Fireflies meetings
        // AND they can see all non-Fireflies notes (Slack, Email, Manual)
        if (isPersonalBrand) {
          allowedEmails.push(NATASHA_EMAIL.toLowerCase());
          includeNonFireflies = true;
        }

        // Only apply filter if we have emails to filter by
        if (allowedEmails.length > 0) {
          firefliesOwnerEmails = allowedEmails;
        }
      }
    }

    // Fetch data in parallel with error handling
    const [notesData, clients] = await Promise.all([
      getCaseNotesPaginated({
        pageSize: 25,
        firefliesOwnerEmails,
        includeNonFireflies,
      }).catch((err) => {
        console.error('[Case Notes Page] Error fetching case notes:', err);
        return { caseNotes: [], nextCursor: null, hasMore: false };
      }),
      getClients('Active').catch((err) => {
        console.error('[Case Notes Page] Error fetching clients:', err);
        return [];
      }),
    ]);

    return (
      <CaseNotesView
        initialNotes={notesData.caseNotes}
        initialNextCursor={notesData.nextCursor}
        initialHasMore={notesData.hasMore}
        clients={clients}
      />
    );
  } catch (error) {
    console.error('[Case Notes Page] Unexpected error:', error);
    // Return empty state on error to prevent page crash
    return (
      <CaseNotesView
        initialNotes={[]}
        initialNextCursor={null}
        initialHasMore={false}
        clients={[]}
      />
    );
  }
}
