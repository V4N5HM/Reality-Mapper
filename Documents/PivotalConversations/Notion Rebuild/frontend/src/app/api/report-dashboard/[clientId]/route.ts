import { NextRequest, NextResponse } from 'next/server';
import { getClientById } from '@/lib/report-dashboard/report-clients';
import { getPodcastClientById } from '@/lib/report-dashboard/podcast-clients';
import {
  fetchPersonalBrandData,
  parsePersonalBrandDashboardData,
  fetchPodcastData,
  parsePodcastDashboardData,
} from '@/lib/report-dashboard/dashboard-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth()));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    // Check if it's a podcast client
    if (clientId.startsWith('podcast_')) {
      const client = await getPodcastClientById(clientId);
      if (!client) {
        return NextResponse.json({ error: 'Podcast client not found' }, { status: 404 });
      }

      if (!client.googleSheets) {
        return NextResponse.json(
          { error: 'No Google Sheets configured for this client' },
          { status: 400 }
        );
      }

      const rawData = await fetchPodcastData(client);
      if (!rawData) {
        return NextResponse.json(
          { error: 'Failed to fetch data from Google Sheets' },
          { status: 500 }
        );
      }

      const dashboardData = parsePodcastDashboardData(client, rawData, month, year);

      return NextResponse.json({
        success: true,
        clientType: 'podcast',
        data: dashboardData,
        rawData: {
          overallRows: rawData.overallData.length,
          episodeRows: rawData.episodesData.length,
        },
        fetchedAt: new Date().toISOString(),
      });
    }

    // Personal brand client
    const client = await getClientById(clientId);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (!client.googleSheets) {
      return NextResponse.json(
        { error: 'No Google Sheets configured for this client' },
        { status: 400 }
      );
    }

    const rawData = await fetchPersonalBrandData(client);
    if (!rawData) {
      return NextResponse.json(
        { error: 'Failed to fetch data from Google Sheets' },
        { status: 500 }
      );
    }

    const dashboardData = parsePersonalBrandDashboardData(client, rawData, month, year);

    return NextResponse.json({
      success: true,
      clientType: 'personal_brand',
      data: dashboardData,
      rawData: {
        overallRows: rawData.overallData.length,
        postRows: rawData.postsData.length,
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
