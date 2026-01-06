import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/auth/session';
import { getTeamMemberByEmail } from '@/lib/auth/team-users';
import { notion, databases } from '@/lib/notion/client';
import { clearTeamCache } from '@/lib/notion/team';
import bcrypt from 'bcryptjs';

// Hardcoded team member emails that cannot be deleted
const PROTECTED_EMAILS = [
  'natasha@pivotalconversations.ai',
  'kyle@pivotalconversations.io',
  'eddie@pivotalconversations.ai',
  'vansh@pivotalconversations.io',
  'olivia@pivotalconversations.io',
];

// GET - Get current user profile
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.userType !== 'team') {
      return NextResponse.json({ error: 'Only team members can access profile' }, { status: 403 });
    }

    // Get team member data
    const member = await getTeamMemberByEmail(session.email);
    if (!member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: member.id,
      name: member.name,
      email: member.email,
      roles: member.roles,
      teamRole: member.teamRole,
      team: member.team,
      workspaceType: member.workspaceType,
      isAdmin: member.isAdmin,
    });
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 });
  }
}

// PATCH - Update profile (name, password)
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.userType !== 'team') {
      return NextResponse.json({ error: 'Only team members can update profile' }, { status: 403 });
    }

    const body = await request.json();
    const { name, currentPassword, newPassword } = body;

    // Get current member data
    const member = await getTeamMemberByEmail(session.email);
    if (!member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    // For Notion-based users (new signups), we can update their record
    // For hardcoded users, we can only update name in the session
    if (!databases.teamMembers) {
      // No team members database - just update session for hardcoded users
      if (name) {
        session.name = name;
        await session.save();
      }
      return NextResponse.json({
        success: true,
        message: 'Profile updated',
        name: name || session.name,
      });
    }

    // Find the Notion page for this user (if they're in the database)
    const existingMembers = await notion.databases.query({
      database_id: databases.teamMembers,
      filter: {
        property: 'Email',
        email: {
          equals: session.email.toLowerCase(),
        },
      },
    });

    if (existingMembers.results.length === 0) {
      // User is hardcoded, not in database - just update session name
      if (name) {
        session.name = name;
        await session.save();
      }
      return NextResponse.json({
        success: true,
        message: 'Profile updated (session only)',
        name: name || session.name,
      });
    }

    const pageId = existingMembers.results[0].id;
    const properties: any = {};

    // Update name if provided
    if (name) {
      properties.Name = {
        title: [{ text: { content: name } }],
      };
    }

    // Update password if provided
    if (newPassword) {
      // Verify current password first (if user has one stored)
      const page = existingMembers.results[0] as any;
      const storedHash = page.properties['Password Hash']?.rich_text?.[0]?.plain_text;

      if (storedHash) {
        if (!currentPassword) {
          return NextResponse.json(
            { error: 'Current password is required' },
            { status: 400 }
          );
        }

        const isValid = await bcrypt.compare(currentPassword, storedHash);
        if (!isValid) {
          return NextResponse.json(
            { error: 'Current password is incorrect' },
            { status: 401 }
          );
        }
      }

      // Hash and store new password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);
      properties['Password Hash'] = {
        rich_text: [{ text: { content: passwordHash } }],
      };
    }

    // Update Notion page if there are changes
    if (Object.keys(properties).length > 0) {
      await notion.pages.update({
        page_id: pageId,
        properties,
      });
    }

    // Update session name if changed
    if (name) {
      session.name = name;
      await session.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated',
      name: name || session.name,
    });
  } catch (error) {
    console.error('Profile PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

// DELETE - Delete user account
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (session.userType !== 'team') {
      return NextResponse.json({ error: 'Only team members can delete their profile' }, { status: 403 });
    }

    const email = session.email.toLowerCase();

    // Check if this is a protected (hardcoded) account
    if (PROTECTED_EMAILS.some(e => e.toLowerCase() === email)) {
      return NextResponse.json(
        { error: 'This account cannot be deleted. Contact an administrator.' },
        { status: 403 }
      );
    }

    // Check if team members database exists
    if (!databases.teamMembers) {
      return NextResponse.json(
        { error: 'Cannot delete account - database not configured' },
        { status: 500 }
      );
    }

    // Find the Notion page for this user
    const existingMembers = await notion.databases.query({
      database_id: databases.teamMembers,
      filter: {
        property: 'Email',
        email: {
          equals: email,
        },
      },
    });

    if (existingMembers.results.length === 0) {
      return NextResponse.json(
        { error: 'Account not found in database' },
        { status: 404 }
      );
    }

    const pageId = existingMembers.results[0].id;

    // Archive the Notion page (soft delete)
    await notion.pages.update({
      page_id: pageId,
      archived: true,
    });

    // Clear team cache so the user won't appear in lists
    clearTeamCache();

    // Destroy the session
    session.destroy();

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Profile DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
