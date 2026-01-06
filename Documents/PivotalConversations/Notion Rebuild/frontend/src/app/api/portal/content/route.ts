import { NextRequest, NextResponse } from 'next/server';
import { getContent } from '@/lib/notion/content';

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');

  if (!clientId) {
    return NextResponse.json({ error: 'clientId required' }, { status: 400 });
  }

  try {
    const content = await getContent({ clientId, limit: 100, includeClientNames: false });
    return NextResponse.json(content);
  } catch (error) {
    console.error('Error fetching portal content:', error);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}
