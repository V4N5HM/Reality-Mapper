import { NextRequest, NextResponse } from 'next/server';
import { notion, databases, getRichText } from '@/lib/notion/client';
import { clearTeamCache } from '@/lib/notion/team';
import type { WorkspaceType } from '@/types';
import bcrypt from 'bcryptjs';

// POST - Complete signup for a pre-approved (invited) email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body as {
      email: string;
      password: string;
    };

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
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

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
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

    // Check if email exists in database (was pre-invited by admin)
    const existingMembers = await notion.databases.query({
      database_id: databases.teamMembers,
      filter: {
        property: 'Email',
        email: {
          equals: email.toLowerCase(),
        },
      },
    });

    if (existingMembers.results.length === 0) {
      return NextResponse.json(
        { error: 'This email has not been invited. Please contact an admin to get an invite.' },
        { status: 403 }
      );
    }

    const invitedMember = existingMembers.results[0] as any;
    const existingPasswordHash = getRichText(invitedMember.properties['Password Hash']?.rich_text || []);

    // Check if account is already activated (has password)
    if (existingPasswordHash) {
      return NextResponse.json(
        { error: 'This account has already been activated. Please log in instead.' },
        { status: 409 }
      );
    }

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update the invited member with their password (activates the account)
    await notion.pages.update({
      page_id: invitedMember.id,
      properties: {
        'Password Hash': {
          rich_text: [{ text: { content: passwordHash } }],
        },
      },
    });

    // Clear team cache so the member appears with updated status
    clearTeamCache();

    return NextResponse.json({
      success: true,
      message: 'Account activated successfully. Please log in.',
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to activate account' },
      { status: 500 }
    );
  }
}
