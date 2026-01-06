import { NextRequest, NextResponse } from 'next/server';
import { getClientByEmail, setClientPassword, getClientPasswordHash } from '@/lib/notion/client-users';

// POST - Complete signup for a client with email in the database
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

    // Check if email exists in clients database
    const client = await getClientByEmail(normalizedEmail);
    if (!client) {
      return NextResponse.json(
        { error: 'No client account found for this email. Contact your account manager to get added.' },
        { status: 403 }
      );
    }

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
  } catch (error) {
    console.error('Client signup error:', error);
    return NextResponse.json(
      { error: 'Failed to activate account' },
      { status: 500 }
    );
  }
}
