import { NextRequest, NextResponse } from 'next/server';
import { verifyClientResetToken, setClientPassword, clearClientResetToken } from '@/lib/notion/client-users';
import { verifyTeamMemberResetToken, setTeamMemberPassword, clearTeamMemberResetToken } from '@/lib/auth/team-users';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token, password, userType } = body as {
      email: string;
      token: string;
      password: string;
      userType: 'team' | 'client';
    };

    // Validate required fields
    if (!email || !token || !password) {
      return NextResponse.json(
        { error: 'Email, token, and password are required' },
        { status: 400 }
      );
    }

    if (!userType || !['team', 'client'].includes(userType)) {
      return NextResponse.json(
        { error: 'Invalid user type' },
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

    if (userType === 'client') {
      // Verify the reset token
      const { valid, clientId } = await verifyClientResetToken(normalizedEmail, token);

      if (!valid || !clientId) {
        return NextResponse.json(
          { error: 'Invalid or expired reset token. Please request a new password reset.' },
          { status: 400 }
        );
      }

      // Set the new password
      const passwordSet = await setClientPassword(clientId, password);
      if (!passwordSet) {
        return NextResponse.json(
          { error: 'Failed to update password. Please try again.' },
          { status: 500 }
        );
      }

      // Clear the reset token
      await clearClientResetToken(clientId);

      return NextResponse.json({
        success: true,
        message: 'Password has been reset successfully. You can now log in.',
      });
    }

    if (userType === 'team') {
      // Verify the reset token
      const { valid, memberId } = await verifyTeamMemberResetToken(normalizedEmail, token);

      if (!valid || !memberId) {
        return NextResponse.json(
          { error: 'Invalid or expired reset token. Please request a new password reset.' },
          { status: 400 }
        );
      }

      // Set the new password
      const passwordSet = await setTeamMemberPassword(memberId, password);
      if (!passwordSet) {
        return NextResponse.json(
          { error: 'Failed to update password. Please try again.' },
          { status: 500 }
        );
      }

      // Clear the reset token
      await clearTeamMemberResetToken(memberId);

      return NextResponse.json({
        success: true,
        message: 'Password has been reset successfully. You can now log in.',
      });
    }

    return NextResponse.json(
      { error: 'Invalid user type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
