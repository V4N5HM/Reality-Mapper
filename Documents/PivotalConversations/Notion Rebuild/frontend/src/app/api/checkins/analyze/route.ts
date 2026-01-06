import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getCheckinById, updateCheckinAnalysis } from '@/lib/notion/checkins';
import type { CheckinSentiment } from '@/types';

// POST analyze a check-in with Claude
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checkinId } = body;

    if (!checkinId) {
      return NextResponse.json(
        { error: 'checkinId is required' },
        { status: 400 }
      );
    }

    // Fetch the check-in
    const checkin = await getCheckinById(checkinId);
    if (!checkin) {
      return NextResponse.json(
        { error: 'Check-in not found' },
        { status: 404 }
      );
    }

    // Skip analysis if no content
    if (!checkin.outcomesToday && !checkin.challenges && !checkin.learnings && !checkin.nextDayOutcomes) {
      return NextResponse.json({ message: 'No content to analyze' });
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Build the prompt
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
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Parse the response
    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Checkins] Failed to parse AI response:', responseText);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Validate and normalize the response
    const qualityScore = Math.min(10, Math.max(1, Math.round(analysis.qualityScore || 5)));
    const sentiment = (['positive', 'neutral', 'negative'].includes(analysis.sentiment)
      ? analysis.sentiment
      : 'neutral') as CheckinSentiment;
    const summary = (analysis.summary || '').slice(0, 500);

    // Update the check-in with analysis
    await updateCheckinAnalysis(checkinId, {
      qualityScore,
      sentiment,
      aiSummary: summary,
    });

    return NextResponse.json({
      success: true,
      analysis: {
        qualityScore,
        sentiment,
        summary,
      },
    });
  } catch (error) {
    console.error('[Checkins] Error analyzing check-in:', error);
    return NextResponse.json(
      { error: 'Failed to analyze check-in' },
      { status: 500 }
    );
  }
}
