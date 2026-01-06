import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/auth/session';
import { FirefliesClient } from '@/lib/integrations/fireflies-client';

// GET - Get all Fireflies users from the team account
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.userType !== 'team') {
      return NextResponse.json({ error: 'Only team members can access this' }, { status: 403 });
    }

    const globalApiKey = process.env.FIREFLIES_API_KEY;
    if (!globalApiKey) {
      return NextResponse.json({
        error: 'Fireflies is not configured',
      }, { status: 500 });
    }

    const client = new FirefliesClient(globalApiKey);
    const users = await client.getUsers();

    // Return simplified user list for selection
    const userList = users.map(u => ({
      id: u.user_id,
      name: u.name,
      email: u.email,
      transcriptCount: u.num_transcripts,
    }));

    return NextResponse.json({
      users: userList,
    });
  } catch (error) {
    console.error('Fireflies users GET error:', error);
    return NextResponse.json({ error: 'Failed to get Fireflies users' }, { status: 500 });
  }
}
