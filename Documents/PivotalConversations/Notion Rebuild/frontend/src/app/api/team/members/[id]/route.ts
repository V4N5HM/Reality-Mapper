import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/auth/session';
import { notion, databases } from '@/lib/notion/client';
import { clearTeamCache } from '@/lib/notion/team';

// Protected emails that cannot be deleted (core team)
const PROTECTED_EMAILS = [
  'natasha@pivotalconversations.ai',
  'kyle@pivotalconversations.io',
  'eddie@pivotalconversations.ai',
  'vansh@pivotalconversations.io',
  'olivia@pivotalconversations.io',
];

// DELETE - Delete a team member (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    // Check authentication
    if (!session.isLoggedIn || session.userType !== 'team') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status
    if (!session.isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can delete team members' },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    // Check if team members database exists
    if (!databases.teamMembers) {
      return NextResponse.json(
        { error: 'Team members database not configured' },
        { status: 500 }
      );
    }

    // Get the member to check if it's protected
    try {
      const page = await notion.pages.retrieve({ page_id: id });
      const email = (page as any).properties?.Email?.email?.toLowerCase();

      if (email && PROTECTED_EMAILS.some(e => e.toLowerCase() === email)) {
        return NextResponse.json(
          { error: 'This team member cannot be deleted' },
          { status: 403 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      );
    }

    // Archive (delete) the team member
    await notion.pages.update({
      page_id: id,
      archived: true,
    });

    // Clear team cache
    clearTeamCache();

    return NextResponse.json({
      success: true,
      message: 'Team member removed successfully',
    });
  } catch (error) {
    console.error('Delete team member error:', error);
    return NextResponse.json(
      { error: 'Failed to delete team member' },
      { status: 500 }
    );
  }
}
