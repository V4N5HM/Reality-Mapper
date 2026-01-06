import { NextRequest, NextResponse } from 'next/server';
import { getClientIdeasByName } from '@/lib/notion/ideas';

export async function GET(request: NextRequest) {
  const clientName = request.nextUrl.searchParams.get('clientName');

  if (!clientName) {
    return NextResponse.json({ error: 'clientName required' }, { status: 400 });
  }

  try {
    const ideas = await getClientIdeasByName(clientName, 100);
    return NextResponse.json(ideas);
  } catch (error) {
    console.error('Error fetching portal ideas:', error);
    return NextResponse.json({ error: 'Failed to fetch ideas' }, { status: 500 });
  }
}
