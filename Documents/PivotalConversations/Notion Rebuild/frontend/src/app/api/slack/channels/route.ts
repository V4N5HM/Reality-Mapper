import { NextRequest, NextResponse } from 'next/server';
import { listChannels, searchChannelsByName, findClientChannel, getChannelInfo } from '@/lib/slack';

// GET /api/slack/channels - List or search Slack channels
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const clientName = searchParams.get('clientName');
    const channelId = searchParams.get('channelId');
    const types = searchParams.get('types') || 'public_channel,private_channel';
    const limit = searchParams.get('limit');

    // Get specific channel by ID
    if (channelId) {
      const result = await getChannelInfo(channelId);
      return NextResponse.json(result);
    }

    // Find channel for a specific client
    if (clientName) {
      const result = await findClientChannel(clientName);
      return NextResponse.json(result);
    }

    // Search channels by name
    if (search) {
      const result = await searchChannelsByName(search, {
        types,
        excludeArchived: true,
      });
      return NextResponse.json(result);
    }

    // List all channels
    const result = await listChannels({
      types,
      excludeArchived: true,
      limit: limit ? parseInt(limit) : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error with Slack channels:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to access Slack channels' },
      { status: 500 }
    );
  }
}
