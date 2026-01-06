import { NextRequest, NextResponse } from 'next/server';
import { getTeamMembers, clearTeamCache } from '@/lib/notion/team';
import { notion } from '@/lib/notion/client';

// GET - Get all team members with their roles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const debug = searchParams.get('debug') === 'true';

    // Clear cache if debug mode to get fresh data
    if (debug) {
      clearTeamCache();
    }

    const members = await getTeamMembers();

    // In debug mode, also return raw Notion workspace users
    if (debug) {
      const notionUsers = await notion.users.list({});
      const workspaceUsers = notionUsers.results
        .filter((u): u is typeof u & { type: 'person'; person: { email: string } } =>
          u.type === 'person' && !!u.person?.email
        )
        .map(u => ({
          id: u.id,
          name: u.name,
          email: u.person.email,
        }));

      return NextResponse.json({
        success: true,
        members,
        count: members.length,
        debug: {
          workspaceUsers,
          message: 'Team members with placeholder IDs (team-member-X) are not in the Notion workspace',
        },
      });
    }

    return NextResponse.json({
      success: true,
      members,
      count: members.length,
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}
