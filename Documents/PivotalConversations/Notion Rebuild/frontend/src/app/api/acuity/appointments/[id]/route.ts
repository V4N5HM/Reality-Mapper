import { NextRequest, NextResponse } from 'next/server';
import { getAcuityClient, isAcuityEnabled } from '@/lib/integrations/acuity-client';

/**
 * GET /api/acuity/appointments/[id]
 * Get a single appointment by ID
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;

        // Fetch the appointment
        const appointment = await client.getAppointment(id);

        return NextResponse.json(appointment);
    } catch (error) {
        console.error('Error fetching Acuity appointment:', error);
        return NextResponse.json(
            { error: 'Failed to fetch appointment' },
            { status: 500 }
        );
    }
}
