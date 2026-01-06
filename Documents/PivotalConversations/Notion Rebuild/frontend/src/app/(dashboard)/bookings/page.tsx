import { AcuityBookingsList } from '@/components/acuity/acuity-bookings-list';

export const dynamic = 'force-dynamic';

export default function AllBookingsPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">All Bookings</h1>
                    <p className="text-zinc-400">
                        View all Acuity Scheduling appointments across all clients
                    </p>
                </div>

                <AcuityBookingsList />
            </div>
        </div>
    );
}
