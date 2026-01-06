import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/auth/session';
import { notion, databases } from '@/lib/notion/client';
import { clearTeamCache } from '@/lib/notion/team';
import type { TeamRole, TeamCategory, WorkspaceType } from '@/types';

// POST - Invite a new team member (admin only)
export async function POST(request: NextRequest) {
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
        { error: 'Only admins can invite team members' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, role, team, workspaceType } = body as {
      name: string;
      email: string;
      role?: TeamRole;
      team: TeamCategory[];
      workspaceType?: WorkspaceType;
    };

    // Validate required fields (role is now optional)
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate role (only if provided)
    const validRoles: TeamRole[] = ['Coordinator', 'Short Form Manager', 'YouTube Manager', 'Editor'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Validate team categories
    const validTeams: TeamCategory[] = ['Podcast', 'Personal Brand', 'Social Media', 'Production', 'Advertising'];
    if (team && team.length > 0) {
      const invalidTeams = team.filter(t => !validTeams.includes(t));
      if (invalidTeams.length > 0) {
        return NextResponse.json(
          { error: `Invalid team categories: ${invalidTeams.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Check if team members database exists
    if (!databases.teamMembers) {
      return NextResponse.json(
        { error: 'Team members database not configured' },
        { status: 500 }
      );
    }

    // Check if email already exists
    const existingMembers = await notion.databases.query({
      database_id: databases.teamMembers,
      filter: {
        property: 'Email',
        email: {
          equals: email.toLowerCase(),
        },
      },
    });

    if (existingMembers.results.length > 0) {
      return NextResponse.json(
        { error: 'A team member with this email already exists' },
        { status: 409 }
      );
    }

    // Determine workspace type
    // Personal Brand team gets full_dashboard, others get team_workspace
    let finalWorkspaceType: WorkspaceType = workspaceType || 'team_workspace';
    if (team && team.includes('Personal Brand')) {
      finalWorkspaceType = 'full_dashboard';
    }

    // Create the invited team member (without password - they'll set it on signup)
    const newMember = await notion.pages.create({
      parent: { database_id: databases.teamMembers },
      properties: {
        Name: {
          title: [{ text: { content: name } }],
        },
        Email: {
          email: email.toLowerCase(),
        },
        ...(role && {
          Role: {
            select: { name: role },
          },
        }),
        Team: {
          multi_select: (team || []).map(t => ({ name: t })),
        },
        'Workspace Type': {
          select: { name: finalWorkspaceType },
        },
        'Is Admin': {
          checkbox: false,
        },
        // Password Hash is left empty - user sets it on signup
      },
    });

    // Clear team cache
    clearTeamCache();

    return NextResponse.json({
      success: true,
      message: `Invite sent to ${email}. They can now activate their account.`,
      memberId: newMember.id,
    });
  } catch (error) {
    console.error('Invite error:', error);
    return NextResponse.json(
      { error: 'Failed to invite team member' },
      { status: 500 }
    );
  }
}

// GET - Get list of pending invites (admin only)
export async function GET(request: NextRequest) {
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
        { error: 'Only admins can view invites' },
        { status: 403 }
      );
    }

    if (!databases.teamMembers) {
      return NextResponse.json({ invites: [] });
    }

    // Query for team members without password (pending invites)
    const response = await notion.databases.query({
      database_id: databases.teamMembers,
    });

    const pendingInvites = response.results
      .filter((page: any) => {
        const passwordHash = page.properties['Password Hash']?.rich_text?.[0]?.plain_text;
        return !passwordHash; // No password = pending invite
      })
      .map((page: any) => ({
        id: page.id,
        name: page.properties.Name?.title?.[0]?.plain_text || '',
        email: page.properties.Email?.email || '',
        role: page.properties.Role?.select?.name || '',
        team: page.properties.Team?.multi_select?.map((t: any) => t.name) || [],
        workspaceType: page.properties['Workspace Type']?.select?.name || 'team_workspace',
        createdAt: page.created_time,
      }));

    return NextResponse.json({ invites: pendingInvites });
  } catch (error) {
    console.error('Get invites error:', error);
    return NextResponse.json(
      { error: 'Failed to get invites' },
      { status: 500 }
    );
  }
}

// DELETE - Revoke an invite (admin only)
export async function DELETE(request: NextRequest) {
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
        { error: 'Only admins can revoke invites' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const inviteId = searchParams.get('id');

    if (!inviteId) {
      return NextResponse.json(
        { error: 'Invite ID is required' },
        { status: 400 }
      );
    }

    // Archive the invite
    await notion.pages.update({
      page_id: inviteId,
      archived: true,
    });

    // Clear team cache
    clearTeamCache();

    return NextResponse.json({
      success: true,
      message: 'Invite revoked',
    });
  } catch (error) {
    console.error('Revoke invite error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke invite' },
      { status: 500 }
    );
  }
}
