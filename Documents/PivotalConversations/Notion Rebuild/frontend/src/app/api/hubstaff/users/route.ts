import { NextRequest, NextResponse } from 'next/server';
import { getHubstaffClient, isHubstaffEnabled } from '@/lib/integrations/hubstaff-client';

/**
 * GET /api/hubstaff/users
 * List all Hubstaff organization members
 */
export async function GET() {
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

        const users = await client.listUsers();
        return NextResponse.json({ users });
    } catch (error) {
        console.error('Error fetching Hubstaff users:', error);
        return NextResponse.json(
            { error: 'Failed to fetch Hubstaff users' },
            { status: 500 }
        );
    }
}
