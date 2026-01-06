import { NextRequest, NextResponse } from 'next/server';
import { getAcuityClient, isAcuityEnabled } from '@/lib/integrations/acuity-client';

/**
 * GET /api/acuity/appointments
 * List all appointments with optional filters
 * 
 * Query params:
 * - minDate: ISO date string (optional)
 * - maxDate: ISO date string (optional)
 * - email: Filter by client email (optional)
 * - canceled: Include canceled appointments (optional, boolean)
 */
export async function GET(request: NextRequest) {
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

        // Parse query parameters
        const searchParams = request.nextUrl.searchParams;
        const minDate = searchParams.get('minDate') || undefined;
        const maxDate = searchParams.get('maxDate') || undefined;
        const email = searchParams.get('email') || undefined;
        const canceledParam = searchParams.get('canceled');
        const canceled = canceledParam ? canceledParam === 'true' : undefined;

        // Fetch appointments with filters
        const appointments = await client.getAppointments({
            minDate,
            maxDate,
            email,
            canceled,
        });

        return NextResponse.json({ appointments });
    } catch (error) {
        console.error('Error fetching Acuity appointments:', error);
        return NextResponse.json(
            { error: 'Failed to fetch appointments' },
            { status: 500 }
        );
    }
}
