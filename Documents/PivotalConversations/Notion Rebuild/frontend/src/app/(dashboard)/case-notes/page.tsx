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
  // Default empty state for errors
  const emptyState = {
    notes: [] as any[],
    nextCursor: null as string | null,
    hasMore: false,
    clients: [] as any[],
  };

  try {
    // Get the user's session to determine filtering
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    // Determine filtering based on team membership and admin status
    let firefliesOwnerEmails: string[] | undefined;
    let includeNonFireflies = false;

    // Log session info for debugging
    console.log('[Case Notes Page] Session:', {
      isLoggedIn: session.isLoggedIn,
      userType: session.userType,
      email: session.email,
      isAdmin: session.isAdmin,
      team: session.team,
    });

    if (session.isLoggedIn && session.userType === 'team') {
      const isPersonalBrand = session.team?.includes('Personal Brand');
      const isAdmin = session.isAdmin === true;

      // Admins can see all case notes (no filtering)
      if (isAdmin) {
        includeNonFireflies = true;
        console.log('[Case Notes Page] Admin user - showing all notes');
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

        console.log('[Case Notes Page] Non-admin user filter:', {
          isPersonalBrand,
          firefliesOwnerEmails,
          includeNonFireflies,
        });
      }
    }

    // Fetch data in parallel with error handling
    let notesData = { caseNotes: [] as any[], nextCursor: null as string | null, hasMore: false };
    let clients: any[] = [];

    try {
      notesData = await getCaseNotesPaginated({
        pageSize: 25,
        firefliesOwnerEmails,
        includeNonFireflies,
      });
    } catch (err) {
      console.error('[Case Notes Page] Error fetching case notes:', err);
    }

    try {
      clients = await getClients('Active');
    } catch (err) {
      console.error('[Case Notes Page] Error fetching clients:', err);
    }

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
        initialNotes={emptyState.notes}
        initialNextCursor={emptyState.nextCursor}
        initialHasMore={emptyState.hasMore}
        clients={emptyState.clients}
      />
    );
  }
}
