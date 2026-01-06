import { NextRequest, NextResponse } from 'next/server';
import { notion, DATABASE_IDS } from '@/lib/notion/client';

// Debug endpoint to test status updates and check available statuses
export async function GET(request: NextRequest) {
  try {
    // Get the database schema to see available status options
    const database = await notion.databases.retrieve({
      database_id: DATABASE_IDS.content,
    });

    const statusProperty = (database.properties as any)['Status'];

    // Get a sample of content to see current statuses
    const content = await notion.databases.query({
      database_id: DATABASE_IDS.content,
      page_size: 10,
    });

    const contentStatuses = content.results.map((page: any) => ({
      id: page.id,
      title: page.properties['Title']?.title?.[0]?.text?.content || 'No title',
      status: page.properties['Status']?.select?.name || page.properties['Status']?.status?.name || 'No status',
      contentType: page.properties['Content Type']?.select?.name || 'No type',
    }));

    return NextResponse.json({
      statusPropertyType: statusProperty?.type,
      availableStatuses: statusProperty?.select?.options || statusProperty?.status?.options || [],
      sampleContent: contentStatuses,
    });
  } catch (error: any) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Test updating a specific content's status
export async function POST(request: NextRequest) {
  try {
    const { contentId, newStatus } = await request.json();

    if (!contentId || !newStatus) {
      return NextResponse.json({ error: 'Missing contentId or newStatus' }, { status: 400 });
    }

    // Get current status
    const currentPage = await notion.pages.retrieve({ page_id: contentId });
    const currentStatus = (currentPage as any).properties['Status']?.select?.name ||
                          (currentPage as any).properties['Status']?.status?.name;

    console.log(`[Debug] Current status: ${currentStatus}, New status: ${newStatus}`);

    // Try to update
    const updatedPage = await notion.pages.update({
      page_id: contentId,
      properties: {
        'Status': { select: { name: newStatus } },
      },
    });

    const updatedStatus = (updatedPage as any).properties['Status']?.select?.name ||
                          (updatedPage as any).properties['Status']?.status?.name;

    return NextResponse.json({
      success: true,
      contentId,
      previousStatus: currentStatus,
      requestedStatus: newStatus,
      actualStatus: updatedStatus,
      statusMatches: updatedStatus === newStatus,
    });
  } catch (error: any) {
    console.error('Debug update error:', error);
    return NextResponse.json({
      error: error.message,
      body: error.body,
    }, { status: 500 });
  }
}
