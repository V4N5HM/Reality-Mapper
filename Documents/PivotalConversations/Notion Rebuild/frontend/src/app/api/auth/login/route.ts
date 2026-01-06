import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/auth/session';
import { getTeamMemberByEmail, getTeamMemberPasswordHash } from '@/lib/auth/team-users';
import { getClientByEmail } from '@/lib/notion/client-users';
import { clearTeamCache } from '@/lib/notion/team';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, userType } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    // Team member login
    if (userType === 'team') {
      if (!password) {
        return NextResponse.json({ error: 'Password is required' }, { status: 400 });
      }

      // Clear team cache to ensure we get fresh data (important for newly invited members)
      clearTeamCache();

      // Check if email is an authorized team member
      const member = await getTeamMemberByEmail(normalizedEmail);
      if (!member) {
        return NextResponse.json({ error: 'Not an authorized team member' }, { status: 401 });
      }

      // Get the password hash for verification
      const passwordHash = await getTeamMemberPasswordHash(normalizedEmail);

      if (!passwordHash) {
        // Member exists but has no password set (hardcoded member without password in Notion)
        return NextResponse.json({
          error: 'No password set for this account. Please contact an admin or use the signup page.'
        }, { status: 401 });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, passwordHash);
      if (!isValidPassword) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }

      // Create session for team member
      session.isLoggedIn = true;
      session.userType = 'team';
      session.userId = normalizedEmail;
      session.email = normalizedEmail;
      session.name = member.name;
      session.notionUserId = member.id;
      session.roles = member.roles;
      // New role system fields
      session.teamRole = member.teamRole;
      session.team = member.team;
      session.workspaceType = member.workspaceType;
      session.isAdmin = member.isAdmin;
      await session.save();

      return NextResponse.json({
        success: true,
        redirect: '/',
        user: {
          name: member.name,
          email: normalizedEmail,
          userType: 'team',
          roles: member.roles,
          teamRole: member.teamRole,
          team: member.team,
          workspaceType: member.workspaceType,
          isAdmin: member.isAdmin,
        },
      });
    }

    // Client login
    if (userType === 'client') {
      // Check if email belongs to a client
      const client = await getClientByEmail(normalizedEmail);
      if (!client) {
        return NextResponse.json({ error: 'No client account found for this email' }, { status: 401 });
      }

      // Check if client is active
      if (client.status === 'Churned') {
        return NextResponse.json({ error: 'Client account is inactive' }, { status: 401 });
      }

      // Create session for client
      session.isLoggedIn = true;
      session.userType = 'client';
      session.userId = client.id;
      session.email = normalizedEmail;
      session.name = client.name;
      session.clientId = client.id;
      session.clientSlug = client.slug;
      session.clientName = client.name;
      await session.save();

      return NextResponse.json({
        success: true,
        redirect: `/portal/${client.slug}`,
        user: {
          name: client.name,
          email: normalizedEmail,
          userType: 'client',
          clientSlug: client.slug,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid user type' }, { status: 400 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
