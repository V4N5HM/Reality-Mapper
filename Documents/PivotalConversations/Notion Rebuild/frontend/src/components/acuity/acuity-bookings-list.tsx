'use client';

import { useState, useEffect } from 'react';
import { AcuityAppointment } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Calendar, Clock, User, Phone, Mail, DollarSign, Video, MapPin, Loader2 } from 'lucide-react';
import { AcuityBookingDetailModal } from './acuity-booking-detail-modal';
import { LoadingState } from '@/components/shared/loading-state';

interface AcuityBookingsListProps {
    clientId?: string;
    clientEmail?: string;
    clientName?: string; // New prop for client name filtering
}

export function AcuityBookingsList({ clientId, clientEmail, clientName }: AcuityBookingsListProps) {
    const [appointments, setAppointments] = useState<AcuityAppointment[]>([]);
    const [filteredAppointments, setFilteredAppointments] = useState<AcuityAppointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedAppointment, setSelectedAppointment] = useState<AcuityAppointment | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchAppointments();
    }, [clientEmail, clientName]);

    // Filter appointments when search query changes
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredAppointments(appointments);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = appointments.filter((apt) => {
                const fullName = `${apt.firstName} ${apt.lastName}`.toLowerCase();
                const email = apt.email?.toLowerCase() || '';
                const type = apt.appointmentType?.toLowerCase() || '';

                return fullName.includes(query) ||
                    email.includes(query) ||
                    type.includes(query);
            });
            setFilteredAppointments(filtered);
        }
    }, [searchQuery, appointments]);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();

            // Filter by client email if provided
            if (clientEmail) {
                params.append('email', clientEmail);
            }

            // Get appointments from the last 90 days to future
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            params.append('minDate', ninetyDaysAgo.toISOString().split('T')[0]);

            const response = await fetch(`/api/acuity/appointments?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch appointments');

            const data = await response.json();
            let fetchedAppointments = data.appointments || [];

            // Filter by client name if provided (match first name or last name)
            if (clientName && !clientEmail) {
                fetchedAppointments = fetchedAppointments.filter((apt: AcuityAppointment) => {
                    const fullName = `${apt.firstName} ${apt.lastName}`.toLowerCase();
                    const searchName = clientName.toLowerCase();

                    // Check if client name matches the full name, first name, or last name
                    return fullName.includes(searchName) ||
                        apt.firstName.toLowerCase().includes(searchName) ||
                        apt.lastName.toLowerCase().includes(searchName);
                });
            }

            setAppointments(fetchedAppointments);
            setFilteredAppointments(fetchedAppointments);

            // Check if there might be more appointments (if we got 300, there's likely more)
            setHasMore(fetchedAppointments.length >= 300);
            setCurrentPage(1);
        } catch (error) {
            console.error('Error fetching appointments:', error);
            setAppointments([]);
            setFilteredAppointments([]);
        } finally {
            setLoading(false);
        }
    };

    const loadMoreAppointments = async () => {
        if (loadingMore || !hasMore) return;

        try {
            setLoadingMore(true);
            const params = new URLSearchParams();

            if (clientEmail) {
                params.append('email', clientEmail);
            }

            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            params.append('minDate', ninetyDaysAgo.toISOString().split('T')[0]);

            // Use offset for pagination - fetch next page
            const offset = currentPage * 300;
            params.append('offset', offset.toString());

            // Fetch with offset by requesting a specific page number from the API
            const response = await fetch(`/api/acuity/appointments?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch more appointments');

            const data = await response.json();
            let moreAppointments = data.appointments || [];

            if (clientName && !clientEmail) {
                moreAppointments = moreAppointments.filter((apt: AcuityAppointment) => {
                    const fullName = `${apt.firstName} ${apt.lastName}`.toLowerCase();
                    const searchName = clientName.toLowerCase();
                    return fullName.includes(searchName) ||
                        apt.firstName.toLowerCase().includes(searchName) ||
                        apt.lastName.toLowerCase().includes(searchName);
                });
            }

            if (moreAppointments.length > 0) {
                // Deduplicate by ID to prevent duplicate key errors
                const existingIds = new Set(appointments.map((apt: AcuityAppointment) => apt.id));
                const newAppointments = moreAppointments.filter((apt: AcuityAppointment) => !existingIds.has(apt.id));

                if (newAppointments.length > 0) {
                    const updated = [...appointments, ...newAppointments];
                    setAppointments(updated);
                    setFilteredAppointments(searchQuery ?
                        updated.filter((apt) => {
                            const fullName = `${apt.firstName} ${apt.lastName}`.toLowerCase();
                            const email = apt.email?.toLowerCase() || '';
                            const type = apt.appointmentType?.toLowerCase() || '';
                            const query = searchQuery.toLowerCase();
                            return fullName.includes(query) || email.includes(query) || type.includes(query);
                        }) : updated
                    );
                }

                setCurrentPage(prev => prev + 1);
                // Check if there are more appointments beyond what we just loaded
                setHasMore(moreAppointments.length >= 300);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error('Error loading more appointments:', error);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleOpenDetail = (appointment: AcuityAppointment) => {
        setSelectedAppointment(appointment);
        setDetailModalOpen(true);
    };

    // Categorize appointments
    const now = new Date();
    const upcoming = filteredAppointments.filter(apt => !apt.canceled && new Date(apt.datetime) > now);
    const past = filteredAppointments.filter(apt => !apt.canceled && new Date(apt.datetime) <= now);
    const canceled = filteredAppointments.filter(apt => apt.canceled);

    const getStatusColor = (appointment: AcuityAppointment) => {
        if (appointment.canceled) {
            return 'bg-red-500/10 text-red-500 border-red-500/20';
        }
        const aptDate = new Date(appointment.datetime);
        if (aptDate > now) {
            return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        }
        return 'bg-green-500/10 text-green-500 border-green-500/20';
    };

    const getStatusLabel = (appointment: AcuityAppointment) => {
        if (appointment.canceled) return 'Canceled';
        const aptDate = new Date(appointment.datetime);
        if (aptDate > now) return 'Upcoming';
        return 'Completed';
    };

    const formatDateTime = (datetime: string) => {
        const date = new Date(datetime);
        return {
            date: date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }),
            time: date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            })
        };
    };

    const renderAppointmentCard = (appointment: AcuityAppointment) => {
        const { date, time } = formatDateTime(appointment.datetime);

        return (
            <Card
                key={appointment.id}
                className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
                onClick={() => handleOpenDetail(appointment)}
            >
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
                                <Calendar className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-medium text-white truncate">
                                    {appointment.appointmentType}
                                </h3>
                                <p className="text-xs text-zinc-400">
                                    {appointment.firstName} {appointment.lastName}
                                </p>
                            </div>
                        </div>
                        <Badge variant="outline" className={cn('text-xs shrink-0', getStatusColor(appointment))}>
                            {getStatusLabel(appointment)}
                        </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-zinc-400">
                            <Calendar className="w-3 h-3" />
                            <span>{date}</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-400">
                            <Clock className="w-3 h-3" />
                            <span>{time}</span>
                        </div>
                        {appointment.email && (
                            <div className="flex items-center gap-2 text-zinc-400 truncate">
                                <Mail className="w-3 h-3 shrink-0" />
                                <span className="truncate">{appointment.email}</span>
                            </div>
                        )}
                        {appointment.price && (
                            <div className="flex items-center gap-2 text-zinc-400">
                                <DollarSign className="w-3 h-3" />
                                <span>${appointment.price}</span>
                            </div>
                        )}
                    </div>

                    {appointment.calendar && (
                        <div className="pt-2 border-t border-zinc-800">
                            <span className="text-xs text-zinc-500">
                                {appointment.calendar}
                            </span>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    if (loading) {
        return (
            <LoadingState
                message="Loading bookings..."
                count={appointments.length > 0 ? appointments.length : undefined}
            />
        );
    }

    if (appointments.length === 0 && !loading) {
        return (
            <div className="text-center py-12 text-zinc-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No bookings found</p>
                {clientEmail && (
                    <p className="text-sm mt-2">for {clientEmail}</p>
                )}
                {clientName && !clientEmail && (
                    <p className="text-sm mt-2">for {clientName}</p>
                )}
            </div>
        );
    }

    // Show message if search returns no results
    if (filteredAppointments.length === 0 && searchQuery.trim()) {
        return (
            <>
                {!clientName && !clientEmail && (
                    <div className="mb-4">
                        <Input
                            type="text"
                            placeholder="Search by name, email, or appointment type..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="max-w-md bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                        />
                    </div>
                )}
                <div className="text-center py-12 text-zinc-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No bookings match your search</p>
                    <p className="text-sm mt-2">Try a different search term</p>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="space-y-6">
                {/* Search bar - only show in global view (not client-specific) */}
                {!clientName && !clientEmail && (
                    <div className="flex items-center gap-4">
                        <Input
                            type="text"
                            placeholder="Search by name, email, or appointment type..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="max-w-md bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                        />
                        {searchQuery && (
                            <p className="text-sm text-zinc-400">
                                {filteredAppointments.length} of {appointments.length} bookings
                            </p>
                        )}
                    </div>
                )}

                {/* Upcoming Appointments */}
                {upcoming.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-500" />
                            Upcoming Appointments ({upcoming.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {upcoming.map(renderAppointmentCard)}
                        </div>
                    </div>
                )}

                {/* Past Appointments */}
                {past.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-green-500" />
                            Past Appointments ({past.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {past.slice(0, 6).map(renderAppointmentCard)}
                        </div>
                        {past.length > 6 && (
                            <p className="text-xs text-zinc-500 text-center">
                                Showing 6 of {past.length} past appointments
                            </p>
                        )}
                    </div>
                )}

                {/* Canceled Appointments */}
                {canceled.length > 0 && (
                    <details className="space-y-4">
                        <summary className="text-lg font-medium text-white flex items-center gap-2 cursor-pointer">
                            <Calendar className="w-5 h-5 text-red-500" />
                            Canceled Appointments ({canceled.length})
                        </summary>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                            {canceled.map(renderAppointmentCard)}
                        </div>
                    </details>
                )}

                {/* Load More Button */}
                {hasMore && !clientName && !clientEmail && (
                    <div className="flex justify-center pt-6">
                        <Button
                            onClick={loadMoreAppointments}
                            disabled={loadingMore}
                            variant="outline"
                            className="gap-2"
                        >
                            {loadingMore ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Loading More...
                                </>
                            ) : (
                                `Load More Appointments`
                            )}
                        </Button>
                    </div>
                )}
            </div>

            <AcuityBookingDetailModal
                appointment={selectedAppointment}
                open={detailModalOpen}
                onOpenChange={setDetailModalOpen}
            />
        </>
    );
}
