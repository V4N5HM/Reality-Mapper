import { NextRequest, NextResponse } from 'next/server';
import { getCaseNote, updateCaseNote } from '@/lib/notion/case-notes';
import { notion } from '@/lib/notion/client';

// GET - Get single case note by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const note = await getCaseNote(id);

    if (!note) {
      return NextResponse.json(
        { error: 'Case note not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(note);
  } catch (error) {
    console.error('Error fetching case note:', error);
    return NextResponse.json(
      { error: 'Failed to fetch case note' },
      { status: 500 }
    );
  }
}

// PATCH - Update case note
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, type, source, fullNote } = body;

    const note = await updateCaseNote(id, {
      title,
      type,
      source,
      fullNote,
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error('Error updating case note:', error);
    return NextResponse.json(
      { error: 'Failed to update case note' },
      { status: 500 }
    );
  }
}

// DELETE - Archive case note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await notion.pages.update({
      page_id: id,
      archived: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting case note:', error);
    return NextResponse.json(
      { error: 'Failed to delete case note' },
      { status: 500 }
    );
  }
}
