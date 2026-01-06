import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/auth/session';
import { getCheckins, getTeamCheckinStats } from '@/lib/notion/checkins';
import { getTeamMembers } from '@/lib/notion/team';
import Anthropic from '@anthropic-ai/sdk';
import type { TeamCheckinReport } from '@/types';

// GET team check-in report (admin only)
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn || session.userType !== 'team') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can see team reports
    if (!session.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const generateInsights = searchParams.get('insights') === 'true';

    // Default to last 7 days if no dates provided
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get team members
    const teamMembers = await getTeamMembers();
    const teamMemberIds = teamMembers.map(m => m.id);

    // Get check-in stats
    const stats = await getTeamCheckinStats({
      startDate: start,
      endDate: end,
      teamMemberIds,
    });

    // Calculate completion rate
    const dayCount = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const expectedCheckins = dayCount * teamMembers.length;
    const completionRate = expectedCheckins > 0
      ? Math.round((stats.completedCheckins / expectedCheckins) * 100)
      : 0;

    // Build member stats
    const byMember = Array.from(stats.byMember.entries()).map(([memberId, data]) => {
      // Find most common sentiment
      const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
      data.sentiments.forEach(s => {
        if (s in sentimentCounts) sentimentCounts[s as keyof typeof sentimentCounts]++;
      });
      const dominantSentiment = Object.entries(sentimentCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'neutral';

      return {
        memberId,
        memberName: data.name,
        checkins: data.checkins,
        avgQuality: Math.round(data.avgQuality * 10) / 10,
        sentiment: dominantSentiment,
      };
    });

    // Add team members with zero check-ins
    teamMembers.forEach(member => {
      if (!stats.byMember.has(member.id)) {
        byMember.push({
          memberId: member.id,
          memberName: member.name,
          checkins: 0,
          avgQuality: 0,
          sentiment: 'neutral',
        });
      }
    });

    const report: TeamCheckinReport = {
      period: { start, end: end },
      totalCheckins: stats.totalCheckins,
      completionRate,
      avgQualityScore: Math.round(stats.avgQualityScore * 10) / 10,
      sentimentBreakdown: stats.sentimentBreakdown,
      byMember,
    };

    // Generate AI insights if requested
    if (generateInsights && stats.completedCheckins > 0) {
      try {
        const insights = await generateTeamInsights(report, start, end);
        report.aiInsights = insights;
      } catch (err) {
        console.error('[TeamReport] Failed to generate insights:', err);
      }
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error('[TeamReport] Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

// Generate AI insights from team check-in data
async function generateTeamInsights(
  report: TeamCheckinReport,
  startDate: string,
  endDate: string
): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Get detailed check-ins for the period
  const checkins = await getCheckins({
    startDate,
    endDate,
    limit: 100,
  });

  // Build context for AI
  const checkinSummaries = checkins.map(c => ({
    member: c.teamMemberName,
    date: c.date,
    outcomes: c.outcomesToday?.slice(0, 200),
    challenges: c.challenges?.slice(0, 200),
    learnings: c.learnings?.slice(0, 100),
  }));

  // Calculate overall pulse
  const { positive, neutral, negative } = report.sentimentBreakdown;
  const total = positive + neutral + negative;
  let overallPulse = 'Neutral';
  if (total > 0) {
    const positiveRatio = positive / total;
    const negativeRatio = negative / total;
    if (positiveRatio >= 0.6) overallPulse = 'High';
    else if (negativeRatio >= 0.4) overallPulse = 'Low';
  }

  const prompt = `As a team manager, provide a brief justification for the following 3 metrics based on the check-in data from ${startDate} to ${endDate}.

METRICS TO JUSTIFY:
1. Completion Rate: ${report.completionRate}%
2. Quality: ${report.avgQualityScore}/10
3. Pulse: ${overallPulse} (${positive} positive, ${neutral} neutral, ${negative} negative)

DATA:
- Total check-ins submitted: ${report.totalCheckins}

Individual Performance:
${report.byMember.map(m => `- ${m.memberName}: ${m.checkins} check-ins, quality ${m.avgQuality}/10, ${m.sentiment} pulse`).join('\n')}

Sample Check-in Content:
${JSON.stringify(checkinSummaries.slice(0, 10), null, 2)}

INSTRUCTIONS:
Provide exactly 3 short paragraphs (2-3 sentences each), one for each metric:

**Completion Rate:** [Why the completion rate is at ${report.completionRate}%]

**Quality:** [Why the quality score is ${report.avgQualityScore}/10 based on response depth and usefulness]

**Pulse:** [Why the team pulse is ${overallPulse} based on the sentiment in responses]

Keep it concise, factual, and directly tied to the data. Do not provide recommendations or general insights - only justify these 3 metrics.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}
