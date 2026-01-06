import { NextRequest, NextResponse } from 'next/server';
import { getHubstaffClient, isHubstaffEnabled } from '@/lib/integrations/hubstaff-client';

/**
 * GET /api/hubstaff/time-entries
 * Get time entries from Hubstaff
 * Query params:
 *   - taskId: Get time entries for a specific task
 *   - userId: Get time entries for a specific user
 *   - startDate: Filter by start date (ISO format)
 *   - endDate: Filter by end date (ISO format)
 */
export async function GET(request: NextRequest) {
    try {
        if (!isHubstaffEnabled()) {
            return NextResponse.json(
                { error: 'Hubstaff integration is not enabled' },
                { status: 400 }
            );
        }

        const client = getHubstaffClient();
        if (!client) {
            return NextResponse.json(
                { error: 'Failed to initialize Hubstaff client' },
                { status: 500 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const taskId = searchParams.get('taskId');
        const userId = searchParams.get('userId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        if (taskId) {
            // Get time entries for a specific task
            const entries = await client.getTaskTimeEntries(
                taskId,
                startDate || undefined,
                endDate || undefined
            );
            const totalTime = entries.reduce((sum, entry) => sum + entry.tracked, 0);

            return NextResponse.json({
                entries,
                totalTime,
                totalHours: (totalTime / 3600).toFixed(2),
            });
        } else if (userId && startDate && endDate) {
            // Get time entries for a specific user
            const entries = await client.getUserTimeEntries(userId, startDate, endDate);
            const totalTime = entries.reduce((sum, entry) => sum + entry.tracked, 0);

            return NextResponse.json({
                entries,
                totalTime,
                totalHours: (totalTime / 3600).toFixed(2),
            });
        } else {
            return NextResponse.json(
                { error: 'Either taskId or (userId + startDate + endDate) must be provided' },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('Error fetching time entries:', error);
        return NextResponse.json(
            { error: 'Failed to fetch time entries' },
            { status: 500 }
        );
    }
}
