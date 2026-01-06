import { NextRequest, NextResponse } from 'next/server';
import { notion, databases, getRichText } from '@/lib/notion/client';
import { clearTeamCache } from '@/lib/notion/team';
import { getClientByEmail, setClientPassword, getClientPasswordHash } from '@/lib/notion/client-users';
import bcrypt from 'bcryptjs';

// POST - Complete signup for a pre-approved (invited) email
// Auto-detects whether the user is a team member or client
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

    const normalizedEmail = email.toLowerCase().trim();

    // First, check if email belongs to a team member
    if (databases.teamMembers) {
      const existingMembers = await notion.databases.query({
        database_id: databases.teamMembers,
        filter: {
          property: 'Email',
          email: {
            equals: normalizedEmail,
          },
        },
      });

      if (existingMembers.results.length > 0) {
        // Team member signup flow
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
      }
    }

    // If not a team member, check if email belongs to a client
    const client = await getClientByEmail(normalizedEmail);
    if (client) {
      // Check if client is active
      if (client.status === 'Churned') {
        return NextResponse.json(
          { error: 'This client account is inactive.' },
          { status: 403 }
        );
      }

      // Check if account already has a password
      const existingPasswordHash = await getClientPasswordHash(normalizedEmail);
      if (existingPasswordHash) {
        return NextResponse.json(
          { error: 'This account has already been activated. Please log in instead.' },
          { status: 409 }
        );
      }

      // Set the password for the client
      const success = await setClientPassword(client.id, password);
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to activate account. Please try again.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Account activated successfully. Please log in.',
      });
    }

    // Email not found in either database
    return NextResponse.json(
      { error: 'No account found with this email. Team members need an invite, clients need to be added by their account manager.' },
      { status: 403 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to activate account' },
      { status: 500 }
    );
  }
}
