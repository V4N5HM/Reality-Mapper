import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getClientById } from '@/lib/report-dashboard/report-clients';
import { getPodcastClientById } from '@/lib/report-dashboard/podcast-clients';
import {
  fetchPersonalBrandData,
  parsePersonalBrandDashboardData,
  fetchPodcastData,
  parsePodcastDashboardData,
} from '@/lib/report-dashboard/dashboard-data';
import {
  buildDashboardInsightsPrompt,
  buildPodcastDashboardInsightsPrompt,
  DashboardInsightsRequest,
  PodcastDashboardInsightsRequest,
} from '@/lib/report-dashboard/prompts/dashboard-insights';

const anthropic = new Anthropic();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth()));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    // Try personal brand client first
    const personalBrandClient = await getClientById(clientId);

    if (personalBrandClient) {
      // Fetch and parse personal brand data
      const rawData = await fetchPersonalBrandData(personalBrandClient);
      if (!rawData) {
        return NextResponse.json(
          { error: 'Failed to fetch client data from Google Sheets' },
          { status: 500 }
        );
      }

      const dashboardData = parsePersonalBrandDashboardData(
        personalBrandClient,
        rawData,
        month,
        year
      );

      // Build insights request
      const insightsRequest: DashboardInsightsRequest = {
        clientName: personalBrandClient.name,
        month,
        year,
        thresholds: personalBrandClient.thresholds,
        metrics: {
          totalViews: dashboardData.keyMetrics.totalViews.value,
          totalViewsChange: dashboardData.keyMetrics.totalViews.change,
          avgViewsPerPost: dashboardData.keyMetrics.avgViewsPerPost.value,
          avgViewsPerPostChange: dashboardData.keyMetrics.avgViewsPerPost.change,
          newFollowers: dashboardData.keyMetrics.newFollowers.value,
          newFollowersChange: dashboardData.keyMetrics.newFollowers.change,
          profileVisits: dashboardData.keyMetrics.profileVisits.value,
          profileVisitsChange: dashboardData.keyMetrics.profileVisits.change,
          instagramViews: dashboardData.platformPerformance.instagram?.views.value,
          tiktokViews: dashboardData.platformPerformance.tiktok?.views.value,
        },
        overachievers: [
          ...dashboardData.overachievers.instagram.map(o => ({
            platform: 'Instagram',
            title: o.title,
            views: o.views ?? 0,
            transcript: o.transcript,
          })),
          ...dashboardData.overachievers.tiktok.map(o => ({
            platform: 'TikTok',
            title: o.title,
            views: o.views ?? 0,
            transcript: o.transcript,
          })),
        ],
        underachievers: [
          ...dashboardData.underachievers.instagram.slice(0, 3).map(u => ({
            platform: 'Instagram',
            title: u.title,
            views: u.views ?? 0,
            transcript: u.transcript,
          })),
          ...dashboardData.underachievers.tiktok.slice(0, 3).map(u => ({
            platform: 'TikTok',
            title: u.title,
            views: u.views ?? 0,
            transcript: u.transcript,
          })),
        ],
      };

      // Generate insights using Claude
      const prompt = buildDashboardInsightsPrompt(insightsRequest);
      const insights = await generateInsights(prompt);

      return NextResponse.json({
        success: true,
        clientType: 'personal_brand',
        insights,
        generatedAt: new Date().toISOString(),
      });
    }

    // Try podcast client
    const podcastClient = await getPodcastClientById(clientId);

    if (podcastClient) {
      // Fetch and parse podcast data
      const rawData = await fetchPodcastData(podcastClient);
      if (!rawData) {
        return NextResponse.json(
          { error: 'Failed to fetch podcast data from Google Sheets' },
          { status: 500 }
        );
      }

      const dashboardData = parsePodcastDashboardData(
        podcastClient,
        rawData,
        month,
        year
      );

      // Build podcast insights request
      const insightsRequest: PodcastDashboardInsightsRequest = {
        podcastName: podcastClient.podcastName,
        month,
        year,
        metrics: {
          totalPlays: dashboardData.keyNumbers.totalPlays.value,
          totalPlaysChange: dashboardData.keyNumbers.totalPlays.change,
          newSubscribers: dashboardData.keyNumbers.newSubscribers.value,
          newSubscribersChange: dashboardData.keyNumbers.newSubscribers.change,
          avgRetention: dashboardData.keyNumbers.avgRetention.value,
          youtubeViews: dashboardData.platformPerformance.youtube?.stats.totalViews,
          spotifyPlays: dashboardData.platformPerformance.spotify?.stats.totalPlays,
          applePlays: dashboardData.platformPerformance.apple?.stats.totalPlays,
        },
        topEpisodes: [],
        weakEpisodes: [],
      };

      // Generate insights using Claude
      const prompt = buildPodcastDashboardInsightsPrompt(insightsRequest);
      const insights = await generateInsights(prompt);

      return NextResponse.json({
        success: true,
        clientType: 'podcast',
        insights,
        generatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Client not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error generating dashboard insights:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}

async function generateInsights(prompt: string): Promise<Record<string, unknown>> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Extract JSON from response
  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

  // Try to parse JSON, handling potential markdown wrapping
  let jsonStr = responseText.trim();

  // Remove markdown code blocks if present
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }

  jsonStr = jsonStr.trim();

  try {
    return JSON.parse(jsonStr);
  } catch {
    console.error('Failed to parse insights JSON:', jsonStr.substring(0, 500));
    // Return a minimal valid structure
    return {
      monthlySummary: 'Unable to generate insights at this time.',
      quickInsights: [],
      topRecommendations: [],
      contentIdeas: [],
      weeklyPriorities: { week1_2: [], week3_4: [] },
    };
  }
}
