import { NextRequest, NextResponse } from 'next/server';
import { getBrainDocument, updateBrainDocument, deleteBrainDocument } from '@/lib/notion/brain';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/brain/[id] - Get single brain document
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const document = await getBrainDocument(id);

    if (!document) {
      return NextResponse.json(
        { error: 'Brain document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error('Error fetching brain document:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brain document' },
      { status: 500 }
    );
  }
}

// PATCH /api/brain/[id] - Update brain document
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const document = await updateBrainDocument(id, body);
    return NextResponse.json(document);
  } catch (error) {
    console.error('Error updating brain document:', error);
    return NextResponse.json(
      { error: 'Failed to update brain document' },
      { status: 500 }
    );
  }
}

// DELETE /api/brain/[id] - Delete (archive) brain document
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await deleteBrainDocument(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting brain document:', error);
    return NextResponse.json(
      { error: 'Failed to delete brain document' },
      { status: 500 }
    );
  }
}
