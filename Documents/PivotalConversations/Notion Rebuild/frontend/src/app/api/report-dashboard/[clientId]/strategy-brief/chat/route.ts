import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { PersonalBrandDashboardData } from '@/lib/report-dashboard/dashboard-types';

const anthropic = new Anthropic();

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function formatDashboardDataForContext(data: PersonalBrandDashboardData): string {
  const sections: string[] = [];

  // Key Metrics
  sections.push(`## Key Metrics
- Total Views: ${data.keyMetrics.totalViews.value.toLocaleString()} (${data.keyMetrics.totalViews.change >= 0 ? '+' : ''}${data.keyMetrics.totalViews.change.toFixed(1)}% MoM)
- Avg Views Per Post: ${data.keyMetrics.avgViewsPerPost.value.toLocaleString()} (${data.keyMetrics.avgViewsPerPost.change >= 0 ? '+' : ''}${data.keyMetrics.avgViewsPerPost.change.toFixed(1)}% MoM)
- New Followers: ${data.keyMetrics.newFollowers.value.toLocaleString()} (${data.keyMetrics.newFollowers.change >= 0 ? '+' : ''}${data.keyMetrics.newFollowers.change.toFixed(1)}% MoM)
- Profile Visits: ${data.keyMetrics.profileVisits.value.toLocaleString()} (${data.keyMetrics.profileVisits.change >= 0 ? '+' : ''}${data.keyMetrics.profileVisits.change.toFixed(1)}% MoM)`);

  // Platform Performance
  if (data.platformPerformance.instagram) {
    sections.push(`## Instagram Performance
- Views: ${data.platformPerformance.instagram.views.value.toLocaleString()}
- YTD Views: ${data.platformPerformance.instagram.ytdViews.value.toLocaleString()}
- New Followers: ${data.platformPerformance.instagram.newFollowers.value.toLocaleString()}
- Analysis: ${data.platformPerformance.instagram.analysis}`);
  }

  if (data.platformPerformance.tiktok) {
    sections.push(`## TikTok Performance
- Views: ${data.platformPerformance.tiktok.views.value.toLocaleString()}
- YTD Views: ${data.platformPerformance.tiktok.ytdViews.value.toLocaleString()}
- New Followers: ${data.platformPerformance.tiktok.newFollowers.value.toLocaleString()}
- Analysis: ${data.platformPerformance.tiktok.analysis}`);
  }

  // Monthly Summary
  sections.push(`## Monthly Summary
${data.monthlySummary}`);

  // Overachievers
  const allOverachievers = [
    ...data.overachievers.instagram.map(o => ({ ...o, platform: 'Instagram' })),
    ...data.overachievers.tiktok.map(o => ({ ...o, platform: 'TikTok' })),
  ];
  if (allOverachievers.length > 0) {
    sections.push(`## Overachieving Content (exceeded thresholds)
${allOverachievers.map(o => `### ${o.platform}: "${o.title}" - ${(o.views ?? 0).toLocaleString()} views
Transcript: "${o.transcript.substring(0, 500)}${o.transcript.length > 500 ? '...' : ''}"
Why it worked: ${o.whyItWorked.join(', ')}`).join('\n\n')}`);
  }

  // Underachievers
  const allUnderachievers = [
    ...data.underachievers.instagram.slice(0, 3).map(u => ({ ...u, platform: 'Instagram' })),
    ...data.underachievers.tiktok.slice(0, 3).map(u => ({ ...u, platform: 'TikTok' })),
  ];
  if (allUnderachievers.length > 0) {
    sections.push(`## Underperforming Content
${allUnderachievers.map(u => `### ${u.platform}: "${u.title}" - ${(u.views ?? 0).toLocaleString()} views
Transcript: "${u.transcript.substring(0, 300)}${u.transcript.length > 300 ? '...' : ''}"
Why it underperformed: ${u.whyItUnderperformed.join(', ')}`).join('\n\n')}`);
  }

  // Strategic Insights
  if (data.strategicInsights.length > 0) {
    sections.push(`## Strategic Insights
${data.strategicInsights.map(si => `### ${si.category}
${si.insights.map(i => `- ${i}`).join('\n')}`).join('\n\n')}`);
  }

  // Recommendations
  if (data.recommendations.length > 0) {
    sections.push(`## Recommendations
${data.recommendations.map(r => `### ${r.category}
${r.items.map(i => `- ${i}`).join('\n')}`).join('\n\n')}`);
  }

  // Content Ideas
  if (data.contentIdeas.length > 0) {
    sections.push(`## Content Ideas
${data.contentIdeas.slice(0, 6).map((idea, i) => `${i + 1}. "${idea.title}"
   Framework: ${idea.framework.join(', ')}
   Hook: ${idea.hookExample}`).join('\n\n')}`);
  }

  // Growth Targets
  sections.push(`## Growth Targets
${data.growthTargets.summary}
${data.growthTargets.instagramTarget ? `- Instagram: ${data.growthTargets.instagramTarget}` : ''}
${data.growthTargets.tiktokTarget ? `- TikTok: ${data.growthTargets.tiktokTarget}` : ''}
${data.growthTargets.followerTarget ? `- Followers: ${data.growthTargets.followerTarget}` : ''}`);

  // Action Plan
  sections.push(`## Action Plan
**Week 1-2:**
${data.actionPlan.week1_2.map(a => `- ${a.title}: ${a.description}`).join('\n')}

**Week 3-4:**
${data.actionPlan.week3_4.map(a => `- ${a.title}: ${a.description}`).join('\n')}`);

  return sections.join('\n\n');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const body = await request.json();
    const { messages, currentHtml, clientName, planMonth, planYear, dashboardData } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    if (!currentHtml) {
      return NextResponse.json({ error: 'Current HTML is required' }, { status: 400 });
    }

    // Format dashboard data if provided
    const dataContext = dashboardData ? formatDashboardDataForContext(dashboardData) : '';

    // Build the system prompt
    const systemPrompt = `You are a helpful assistant helping to refine and edit a Monthly Content Strategy Plan for ${clientName} (${planMonth} ${planYear}).

${dataContext ? `## SOURCE DATA FROM GOOGLE SHEETS (use this to answer questions about the data):
${dataContext}

` : ''}

The user has generated an HTML strategy brief and may want to make edits, ask questions about it, or request changes.

## CURRENT HTML BRIEF:
\`\`\`html
${currentHtml}
\`\`\`

## YOUR CAPABILITIES:
1. **Answer questions** about the brief content, strategy, or recommendations
2. **Make edits** to the HTML when requested - return the FULL updated HTML
3. **Suggest improvements** to content, wording, or structure
4. **Explain** any section or strategic decision

## RULES FOR EDITS:
- When making edits, ALWAYS return the complete updated HTML document
- Wrap the updated HTML in a special marker: <UPDATED_HTML>...full html here...</UPDATED_HTML>
- Maintain all existing styling and structure
- Use Australian English spelling (optimise, prioritise, colour, etc.)
- Keep the Pivotal Conversations branding (colours: #FF0022, #A5E5FF, #E0C8BA)
- If the edit is small, explain what you changed

## RESPONSE FORMAT:
- For questions: Just answer naturally
- For edits: Explain what you're changing, then provide the full HTML wrapped in <UPDATED_HTML> tags
- Be concise but helpful`;

    // Convert messages to Anthropic format
    const anthropicMessages: Array<{ role: 'user' | 'assistant'; content: string }> = messages.map((msg: ChatMessage) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Generate response
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    const assistantMessage = response.content[0].type === 'text' ? response.content[0].text : '';

    // Check if there's updated HTML in the response
    let updatedHtml: string | null = null;
    const htmlMatch = assistantMessage.match(/<UPDATED_HTML>([\s\S]*?)<\/UPDATED_HTML>/);
    if (htmlMatch) {
      updatedHtml = htmlMatch[1].trim();
    }

    // Clean the message for display (remove the HTML block if present)
    let displayMessage = assistantMessage;
    if (htmlMatch) {
      displayMessage = assistantMessage.replace(/<UPDATED_HTML>[\s\S]*?<\/UPDATED_HTML>/, '').trim();
      if (!displayMessage) {
        displayMessage = 'I\'ve updated the brief with your requested changes. The preview has been refreshed.';
      }
    }

    return NextResponse.json({
      success: true,
      message: displayMessage,
      updatedHtml,
    });
  } catch (error) {
    console.error('Error in brief chat:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
