import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn) {
      return NextResponse.json({ isLoggedIn: false });
    }

    // Return session data (exclude sensitive fields)
    return NextResponse.json({
      isLoggedIn: true,
      userId: session.userId,
      email: session.email,
      name: session.name,
      userType: session.userType,
      roles: session.roles,
      clientSlug: session.clientSlug,
      clientName: session.clientName,
      notionUserId: session.notionUserId,
    });
  } catch (error) {
    console.error('Session fetch error:', error);
    return NextResponse.json({ isLoggedIn: false });
  }
}
