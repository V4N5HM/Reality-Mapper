import { NextRequest, NextResponse } from 'next/server';
import { getHubstaffClient, isHubstaffEnabled } from '@/lib/integrations/hubstaff-client';

/**
 * GET /api/hubstaff/projects
 * List all available Hubstaff projects
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

        const projects = await client.listProjects();
        return NextResponse.json({ projects });
    } catch (error) {
        console.error('Error fetching Hubstaff projects:', error);
        return NextResponse.json(
            { error: 'Failed to fetch Hubstaff projects' },
            { status: 500 }
        );
    }
}
