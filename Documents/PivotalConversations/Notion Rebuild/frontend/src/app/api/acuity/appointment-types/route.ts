import { NextResponse } from 'next/server';
import { getAcuityClient, isAcuityEnabled } from '@/lib/integrations/acuity-client';

/**
 * GET /api/acuity/appointment-types
 * List all appointment types
 */
export async function GET() {
    try {
        if (!isAcuityEnabled()) {
            return NextResponse.json(
                { error: 'Acuity integration is not enabled' },
                { status: 400 }
            );
        }

        const client = getAcuityClient();
        if (!client) {
            return NextResponse.json(
                { error: 'Failed to initialize Acuity client' },
                { status: 500 }
            );
        }

        const appointmentTypes = await client.getAppointmentTypes();

        return NextResponse.json({ appointmentTypes });
    } catch (error) {
        console.error('Error fetching Acuity appointment types:', error);
        return NextResponse.json(
            { error: 'Failed to fetch appointment types' },
            { status: 500 }
        );
    }
}
