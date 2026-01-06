import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getTeamMembers } from '@/lib/notion/team';

// Create Gmail transporter using App Password
function getEmailTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Gmail credentials not configured');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured');
    return true; // Allow in development
  }

  return authHeader === `Bearer ${cronSecret}`;
}

// Generate the email HTML with Pivotal branding
function generateEmailHtml(memberName: string, checkinUrl: string): string {
  const firstName = memberName.split(' ')[0];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Check-in Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header with Logo -->
          <tr>
            <td style="background-color: #000000; padding: 30px 40px; text-align: center;">
              <img src="https://personalbrandpc.vercel.app/pivotalconversations_logo.jpeg" alt="Pivotal Conversations" width="180" style="max-width: 180px; height: auto;">
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 24px 0; font-size: 28px; font-weight: 700; color: #000000; line-height: 1.3;">
                ✨ Your Daily Update
              </h1>

              <p style="margin: 0 0 24px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                Hey ${firstName}!
              </p>

              <p style="margin: 0 0 32px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                Time for your end-of-day check-in. Take a moment to reflect on your day and share your updates with the team.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 32px auto;">
                <tr>
                  <td style="border-radius: 8px; background-color: #FF0022;">
                    <a href="${checkinUrl}" target="_blank" style="display: inline-block; padding: 16px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      👉 Click here to complete your daily update 👈
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 0 0; font-size: 14px; color: #666666; line-height: 1.6;">
                If you are on leave today, please ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 24px 40px; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #333333; font-weight: 500;">
                Best,
              </p>
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #333333;">
                - <strong>Pivotal Conversations</strong> Team
              </p>
              <p style="margin: 0; font-size: 12px; color: #999999;">
                This message was sent to ${memberName}. If you don't want to receive these emails in the future, please contact your admin.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// GET - Send daily check-in reminder emails to all team members
// Should run at 4:45pm Melbourne time daily (Monday-Friday)
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('[Cron] Gmail credentials not configured');
    return NextResponse.json(
      { error: 'Email service not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD.' },
      { status: 500 }
    );
  }

  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const results: { sent: string[]; failed: string[] } = { sent: [], failed: [] };

    // Get Melbourne time to check if it's a weekend
    const melbourneTime = new Date(today.toLocaleString('en-US', { timeZone: 'Australia/Melbourne' }));
    const dayOfWeek = melbourneTime.getDay();

    // Skip weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json({
        success: true,
        message: 'Skipped - weekend',
        date: todayStr,
      });
    }

    // Get all team members
    const teamMembers = await getTeamMembers();
    const checkinUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/checkin`
      : 'https://personalbrandpc.vercel.app/checkin';

    const transporter = getEmailTransporter();

    for (const member of teamMembers) {
      try {
        const emailHtml = generateEmailHtml(member.name, checkinUrl);

        await transporter.sendMail({
          from: `"Pivotal Conversations" <${process.env.GMAIL_USER}>`,
          to: member.email,
          subject: 'Daily Update Reminder - Pivotal Conversations',
          html: emailHtml,
        });

        results.sent.push(member.name);
        console.log(`[Cron] Check-in email sent to ${member.name} (${member.email})`);
      } catch (emailError) {
        console.error(`[Cron] Failed to send email to ${member.name}:`, emailError);
        results.failed.push(`${member.name} (${member.email})`);
      }
    }

    return NextResponse.json({
      success: true,
      date: todayStr,
      emailsSent: results.sent.length,
      emailsFailed: results.failed.length,
      details: results,
    });
  } catch (error) {
    console.error('[Cron] Check-in email error:', error);
    return NextResponse.json(
      { error: 'Failed to send check-in emails' },
      { status: 500 }
    );
  }
}

// POST - Manual trigger to send email to specific team member or all
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return NextResponse.json(
      { error: 'Email service not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { email, teamMemberId, preview } = body;

    const teamMembers = await getTeamMembers();
    const checkinUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/checkin`
      : 'https://personalbrandpc.vercel.app/checkin';

    // If preview mode, return the HTML without sending
    if (preview) {
      const member = teamMembers[0];
      return NextResponse.json({
        success: true,
        preview: true,
        html: generateEmailHtml(member?.name || 'Team Member', checkinUrl),
      });
    }

    // Filter to specific member if provided
    let targetMembers = teamMembers;
    if (email) {
      targetMembers = teamMembers.filter(m => m.email.toLowerCase() === email.toLowerCase());
    } else if (teamMemberId) {
      targetMembers = teamMembers.filter(m => m.id === teamMemberId);
    }

    if (targetMembers.length === 0) {
      return NextResponse.json(
        { error: 'No matching team members found' },
        { status: 404 }
      );
    }

    const transporter = getEmailTransporter();
    const results: string[] = [];

    for (const member of targetMembers) {
      const emailHtml = generateEmailHtml(member.name, checkinUrl);

      await transporter.sendMail({
        from: `"Pivotal Conversations" <${process.env.GMAIL_USER}>`,
        to: member.email,
        subject: 'Daily Update Reminder - Pivotal Conversations',
        html: emailHtml,
      });

      results.push(member.name);
    }

    return NextResponse.json({
      success: true,
      emailsSent: results,
    });
  } catch (error) {
    console.error('[Cron] Manual email trigger error:', error);
    return NextResponse.json(
      { error: 'Failed to send check-in emails' },
      { status: 500 }
    );
  }
}
