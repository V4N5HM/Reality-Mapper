import { NextResponse } from 'next/server';
import { getAllClients } from '@/lib/report-dashboard/report-clients';
import { getPodcastClients } from '@/lib/report-dashboard/podcast-clients';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get both personal brand and podcast clients
    const [personalBrandClients, podcastClients] = await Promise.all([
      getAllClients(),
      getPodcastClients(),
    ]);

    // Combine and format for display
    const allClients = [
      ...personalBrandClients.map(c => ({
        id: c.id,
        name: c.name,
        type: 'personal_brand' as const,
        platforms: c.platforms,
        hasGoogleSheets: !!c.googleSheets,
      })),
      ...podcastClients.map(c => ({
        id: c.id,
        name: c.podcastName,
        type: 'podcast' as const,
        platforms: c.platforms,
        hasGoogleSheets: !!c.googleSheets,
      })),
    ];

    return NextResponse.json({
      success: true,
      clients: allClients,
    });
  } catch (error) {
    console.error('Error fetching report dashboard clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}
