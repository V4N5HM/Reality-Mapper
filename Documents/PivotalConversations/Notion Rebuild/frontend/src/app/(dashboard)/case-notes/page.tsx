import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { unstable_cache } from 'next/cache';
import { SessionData, sessionOptions } from '@/lib/auth/session';
import { getCaseNotesPaginated } from '@/lib/notion/case-notes';
import { getClients } from '@/lib/notion/clients';
import { CaseNotesView } from '@/components/case-notes/case-notes-view';

// Natasha's email - Personal Brand team can see her meetings
const NATASHA_EMAIL = 'natasha@pivotalconversations.com.au';

// Cache the clients fetch for 30 seconds
const getCachedClients = unstable_cache(
  async () => {
    return getClients('Active');
  },
  ['case-notes-clients'],
  { revalidate: 30 }
);

// Cache case notes fetch - includes session filtering in the key
// Fetch only 25 initially for faster first load, users can load more
const getCachedCaseNotes = unstable_cache(
  async (filterKey: string, firefliesOwnerEmails: string[] | undefined, includeNonFireflies: boolean) => {
    return getCaseNotesPaginated({
      pageSize: 25,
      firefliesOwnerEmails,
      includeNonFireflies,
    });
  },
  ['case-notes-paginated'],
  { revalidate: 30 }
);

export default async function CaseNotesPage() {
  // Get the user's session to determine filtering
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  // Determine filtering based on team membership and admin status
  let firefliesOwnerEmails: string[] | undefined;
  let includeNonFireflies = false;
  let filterKey = 'all'; // Used for cache key

  if (session.isLoggedIn && session.userType === 'team') {
    const isPersonalBrand = session.team?.includes('Personal Brand');
    const isAdmin = session.isAdmin === true;

    // Admins can see all case notes (no filtering)
    if (isAdmin) {
      includeNonFireflies = true;
      filterKey = 'admin';
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
        filterKey = `pb-${session.email}`;
      } else {
        filterKey = `team-${session.email}`;
      }

      // Only apply filter if we have emails to filter by
      if (allowedEmails.length > 0) {
        firefliesOwnerEmails = allowedEmails;
      }
    }
  }

  // Fetch data in parallel with caching
  const [notesData, clients] = await Promise.all([
    getCachedCaseNotes(filterKey, firefliesOwnerEmails, includeNonFireflies),
    getCachedClients(),
  ]);

  return (
    <CaseNotesView
      initialNotes={notesData.caseNotes}
      initialNextCursor={notesData.nextCursor}
      initialHasMore={notesData.hasMore}
      clients={clients}
    />
  );
}
