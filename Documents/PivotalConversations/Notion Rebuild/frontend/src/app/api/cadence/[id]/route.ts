import { NextRequest, NextResponse } from 'next/server';
import { getCadenceItem, updateCadenceItem, deleteCadenceItem } from '@/lib/notion/cadence';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/cadence/[id] - Get single cadence item
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const item = await getCadenceItem(id);

    if (!item) {
      return NextResponse.json(
        { error: 'Cadence item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching cadence item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cadence item' },
      { status: 500 }
    );
  }
}

// PATCH /api/cadence/[id] - Update cadence item
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const item = await updateCadenceItem(id, body);
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error updating cadence item:', error);
    return NextResponse.json(
      { error: 'Failed to update cadence item' },
      { status: 500 }
    );
  }
}

// DELETE /api/cadence/[id] - Delete (archive) cadence item
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await deleteCadenceItem(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting cadence item:', error);
    return NextResponse.json(
      { error: 'Failed to delete cadence item' },
      { status: 500 }
    );
  }
}
