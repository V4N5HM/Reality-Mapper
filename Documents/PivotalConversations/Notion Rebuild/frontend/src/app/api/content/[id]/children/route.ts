import { NextRequest, NextResponse } from 'next/server';
import { getChildClips } from '@/lib/notion/content';

// GET child clips for a parent content
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const children = await getChildClips(id);
    return NextResponse.json(children);
  } catch (error) {
    console.error('Error fetching child clips:', error);
    return NextResponse.json(
      { error: 'Failed to fetch child clips' },
      { status: 500 }
    );
  }
}
