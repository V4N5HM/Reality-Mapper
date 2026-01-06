import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/auth/session';
import { getTeamMemberByEmail, getTeamMemberPasswordHash } from '@/lib/auth/team-users';
import { getClientByEmail, getClientPasswordHash } from '@/lib/notion/client-users';
import { clearTeamCache } from '@/lib/notion/team';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    // Clear team cache to ensure we get fresh data
    clearTeamCache();

    // First, check if email belongs to a team member
    const member = await getTeamMemberByEmail(normalizedEmail);

    if (member) {
      // Team member login
      const passwordHash = await getTeamMemberPasswordHash(normalizedEmail);

      if (!passwordHash) {
        return NextResponse.json({
          error: 'Account not activated. Please create your account first.',
          needsSignup: true,
        }, { status: 401 });
      }

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

    // If not a team member, check if email belongs to a client
    const client = await getClientByEmail(normalizedEmail);

    if (client) {
      // Check if client is active
      if (client.status === 'Churned') {
        return NextResponse.json({ error: 'Account is inactive' }, { status: 401 });
      }

      const passwordHash = await getClientPasswordHash(normalizedEmail);

      if (!passwordHash) {
        return NextResponse.json({
          error: 'Account not activated. Please create your account first.',
          needsSignup: true,
        }, { status: 401 });
      }

      const isValidPassword = await bcrypt.compare(password, passwordHash);
      if (!isValidPassword) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
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

    // Email not found in either team members or clients
    return NextResponse.json({
      error: 'No account found with this email address'
    }, { status: 401 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
