import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getClientByEmail, setClientResetToken } from '@/lib/notion/client-users';
import { getTeamMemberByEmail, getTeamMemberPageId, setTeamMemberResetToken } from '@/lib/auth/team-users';

// Generate a secure random token
function generateResetToken(): string {
  return randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, userType } = body as {
      email: string;
      userType: 'team' | 'client';
    };

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!userType || !['team', 'client'].includes(userType)) {
      return NextResponse.json(
        { error: 'Invalid user type' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Generate token and set expiry (1 hour)
    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    if (userType === 'client') {
      const client = await getClientByEmail(normalizedEmail);
      if (!client) {
        // Return success even if no account exists (security best practice)
        return NextResponse.json({
          success: true,
          message: 'If an account exists with that email, a reset link has been sent.',
        });
      }

      // Store the reset token
      const success = await setClientResetToken(client.id, token, expiresAt);
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to generate reset token. Please try again.' },
          { status: 500 }
        );
      }

      // In a real application, you would send an email here
      // For now, we'll return the token in development mode for testing
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}&type=client`;

      console.log(`[Password Reset] Client reset URL: ${resetUrl}`);

      // TODO: Send email with reset link
      // await sendEmail({
      //   to: normalizedEmail,
      //   subject: 'Reset Your Password',
      //   html: `Click here to reset your password: ${resetUrl}`,
      // });

      return NextResponse.json({
        success: true,
        message: 'If an account exists with that email, a reset link has been sent.',
        // Only include in development for testing
        ...(process.env.NODE_ENV === 'development' && { resetUrl }),
      });
    }

    if (userType === 'team') {
      const member = await getTeamMemberByEmail(normalizedEmail);
      if (!member) {
        // Return success even if no account exists (security best practice)
        return NextResponse.json({
          success: true,
          message: 'If an account exists with that email, a reset link has been sent.',
        });
      }

      const memberId = await getTeamMemberPageId(normalizedEmail);
      if (!memberId) {
        return NextResponse.json({
          success: true,
          message: 'If an account exists with that email, a reset link has been sent.',
        });
      }

      // Store the reset token
      const success = await setTeamMemberResetToken(memberId, token, expiresAt);
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to generate reset token. Please try again.' },
          { status: 500 }
        );
      }

      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}&type=team`;

      console.log(`[Password Reset] Team reset URL: ${resetUrl}`);

      // TODO: Send email with reset link

      return NextResponse.json({
        success: true,
        message: 'If an account exists with that email, a reset link has been sent.',
        // Only include in development for testing
        ...(process.env.NODE_ENV === 'development' && { resetUrl }),
      });
    }

    return NextResponse.json(
      { error: 'Invalid user type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
