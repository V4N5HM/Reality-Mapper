import { NextRequest, NextResponse } from 'next/server';
import { getBrainDocuments, createBrainDocument, getBrainDocumentsPaginated } from '@/lib/notion/brain';

// GET /api/brain - Get brain documents
// Supports pagination via ?paginated=true&pageSize=100&cursor=xxx
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId') || undefined;
    const documentType = searchParams.get('documentType') || undefined;
    const paginated = searchParams.get('paginated') === 'true';
    const pageSize = searchParams.get('pageSize');
    const cursor = searchParams.get('cursor') || undefined;

    // Return paginated response if requested
    if (paginated) {
      const result = await getBrainDocumentsPaginated({
        clientId,
        documentType,
        pageSize: pageSize ? parseInt(pageSize) : 100,
        cursor,
      });
      return NextResponse.json(result);
    }

    const documents = await getBrainDocuments({ clientId, documentType });
    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching brain documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brain documents' },
      { status: 500 }
    );
  }
}

// POST /api/brain - Create new brain document
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, clientId, documentType, fileUrl, url, summary, tags } = body;

    if (!name || !clientId) {
      return NextResponse.json(
        { error: 'Name and clientId are required' },
        { status: 400 }
      );
    }

    const document = await createBrainDocument({
      name,
      clientId,
      documentType,
      fileUrl,
      url,
      summary,
      tags,
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Error creating brain document:', error);
    return NextResponse.json(
      { error: 'Failed to create brain document' },
      { status: 500 }
    );
  }
}
