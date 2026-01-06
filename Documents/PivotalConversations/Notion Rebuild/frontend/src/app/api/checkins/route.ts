import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/auth/session';
import { getCheckins, getTodayCheckin, saveCheckin, getRecentCheckins, deleteCheckin, getCheckinById, updateCheckinAnalysis } from '@/lib/notion/checkins';
import type { CheckinResponseMethod, CheckinSentiment } from '@/types';
import Anthropic from '@anthropic-ai/sdk';

// GET check-ins (admins see all, others see own)
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn || session.userType !== 'team') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const teamMemberId = searchParams.get('teamMemberId');
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const limit = searchParams.get('limit');

    // Get today's check-in for current user
    if (action === 'today') {
      const userId = session.notionUserId || session.userId;
      const checkin = await getTodayCheckin(userId);
      return NextResponse.json({ checkin });
    }

    // Get recent check-ins for current user
    if (action === 'recent') {
      const userId = session.notionUserId || session.userId;
      const checkins = await getRecentCheckins(userId, limit ? parseInt(limit, 10) : 7);
      return NextResponse.json({ checkins });
    }

    // Admin can see all check-ins, others only see their own
    const filterTeamMemberId = session.isAdmin && teamMemberId
      ? teamMemberId
      : (session.notionUserId || session.userId);

    const checkins = await getCheckins({
      teamMemberId: session.isAdmin && !teamMemberId ? undefined : filterTeamMemberId,
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return NextResponse.json({ checkins });
  } catch (error) {
    console.error('Error fetching check-ins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch check-ins' },
      { status: 500 }
    );
  }
}

// POST create/update check-in
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn || session.userType !== 'team') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      outcomesToday,
      challenges,
      learnings,
      nextDayOutcomes,
      responseMethod,
      date, // Optional - defaults to today
    } = body;

    // Use today's date if not provided
    const checkinDate = date || new Date().toISOString().split('T')[0];
    const teamMemberId = session.notionUserId || session.userId;
    const teamMemberName = session.name;

    const checkin = await saveCheckin({
      teamMemberId,
      teamMemberName,
      date: checkinDate,
      outcomesToday: outcomesToday || '',
      challenges: challenges || '',
      learnings: learnings || '',
      nextDayOutcomes: nextDayOutcomes || '',
      responseMethod: responseMethod as CheckinResponseMethod,
    });

    if (!checkin) {
      return NextResponse.json(
        { error: 'Failed to save check-in' },
        { status: 500 }
      );
    }

    // Run AI analysis synchronously to ensure it completes
    try {
      const hasContent = checkin.outcomesToday || checkin.challenges || checkin.learnings || checkin.nextDayOutcomes;

      if (hasContent) {
        const anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });

        const prompt = `Analyze this daily check-in from a team member and provide:
1. A quality score from 1-10 (10 being excellent, detailed responses that show reflection and planning)
2. Overall sentiment: "positive", "neutral", or "negative"
3. A brief 1-2 sentence summary of the key points

Check-in responses:
---
Q: What outcomes were reached today?
A: ${checkin.outcomesToday || '(No response)'}

Q: Any challenges or blockages faced?
A: ${checkin.challenges || '(No response)'}

Q: What was something you learnt?
A: ${checkin.learnings || '(No response)'}

Q: Next work day outcomes:
A: ${checkin.nextDayOutcomes || '(No response)'}
---

Respond in JSON format only:
{
  "qualityScore": <number 1-10>,
  "sentiment": "<positive|neutral|negative>",
  "summary": "<brief summary>"
}`;

        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
        });

        const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          const qualityScore = Math.min(10, Math.max(1, Math.round(analysis.qualityScore || 5)));
          const sentiment = (['positive', 'neutral', 'negative'].includes(analysis.sentiment)
            ? analysis.sentiment
            : 'neutral') as CheckinSentiment;
          const aiSummary = (analysis.summary || '').slice(0, 500);

          await updateCheckinAnalysis(checkin.id, { qualityScore, sentiment, aiSummary });

          // Return updated check-in with analysis
          return NextResponse.json({
            checkin: { ...checkin, qualityScore, sentiment, aiSummary }
          });
        }
      }
    } catch (err) {
      console.error('[Checkins] AI analysis error:', err);
      // Continue without analysis if it fails
    }

    return NextResponse.json({ checkin });
  } catch (error) {
    console.error('Error saving check-in:', error);
    return NextResponse.json(
      { error: 'Failed to save check-in' },
      { status: 500 }
    );
  }
}

// DELETE check-in (admin only, or own check-in)
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn || session.userType !== 'team') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const checkinId = searchParams.get('id');

    if (!checkinId) {
      return NextResponse.json({ error: 'Check-in ID required' }, { status: 400 });
    }

    // Verify ownership or admin status
    const checkin = await getCheckinById(checkinId);
    if (!checkin) {
      return NextResponse.json({ error: 'Check-in not found' }, { status: 404 });
    }

    const userId = session.notionUserId || session.userId;
    const isOwner = checkin.teamMemberId === userId;

    if (!session.isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Not authorized to delete this check-in' }, { status: 403 });
    }

    const success = await deleteCheckin(checkinId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete check-in' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting check-in:', error);
    return NextResponse.json(
      { error: 'Failed to delete check-in' },
      { status: 500 }
    );
  }
}
