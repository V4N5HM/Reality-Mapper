import { NextRequest, NextResponse } from 'next/server';
import { getHubstaffClient, isHubstaffEnabled } from '@/lib/integrations/hubstaff-client';

/**
 * GET /api/hubstaff
 * Get Hubstaff configuration status
 */
export async function GET() {
    try {
        const enabled = isHubstaffEnabled();

        if (!enabled) {
            return NextResponse.json({
                enabled: false,
                message: 'Hubstaff integration is not configured',
            });
        }

        const client = getHubstaffClient();
        if (!client) {
            return NextResponse.json({
                enabled: false,
                message: 'Failed to initialize Hubstaff client',
            }, { status: 500 });
        }

        // Test the connection
        const connectionValid = await client.testConnection();

        return NextResponse.json({
            enabled: true,
            connected: connectionValid,
            organizationId: process.env.HUBSTAFF_ORGANIZATION_ID,
            defaultProjectId: process.env.HUBSTAFF_DEFAULT_PROJECT_ID,
        });
    } catch (error) {
        console.error('Error checking Hubstaff configuration:', error);
        return NextResponse.json(
            { error: 'Failed to check Hubstaff configuration' },
            { status: 500 }
        );
    }
}
