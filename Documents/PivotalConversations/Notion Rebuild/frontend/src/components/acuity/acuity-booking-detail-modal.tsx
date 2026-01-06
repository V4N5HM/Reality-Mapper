'use client';

import { AcuityAppointment } from '@/types';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    Calendar,
    Clock,
    User,
    Phone,
    Mail,
    DollarSign,
    FileText,
    MapPin,
    CreditCard
} from 'lucide-react';

interface AcuityBookingDetailModalProps {
    appointment: AcuityAppointment | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AcuityBookingDetailModal({
    appointment,
    open,
    onOpenChange,
}: AcuityBookingDetailModalProps) {
    if (!appointment) return null;

    const now = new Date();
    const aptDate = new Date(appointment.datetime);
    const endDate = new Date(appointment.endTime);

    const getStatusColor = () => {
        if (appointment.canceled) {
            return 'bg-red-500/10 text-red-500 border-red-500/20';
        }
        if (aptDate > now) {
            return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        }
        return 'bg-green-500/10 text-green-500 border-green-500/20';
    };

    const getStatusLabel = () => {
        if (appointment.canceled) return 'Canceled';
        if (aptDate > now) return 'Upcoming';
        return 'Completed';
    };

    const formatDateTime = (datetime: string) => {
        const date = new Date(datetime);
        return date.toLocaleString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const duration = Math.round((endDate.getTime() - aptDate.getTime()) / (1000 * 60));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
                <DialogHeader>
                    <div className="flex items-start justify-between gap-4">
                        <DialogTitle className="text-white text-xl">
                            {appointment.appointmentType}
                        </DialogTitle>
                        <Badge variant="outline" className={cn('text-xs', getStatusColor())}>
                            {getStatusLabel()}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Client Information */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">
                            Client Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 text-white">
                                <User className="w-4 h-4 text-zinc-500" />
                                <div>
                                    <p className="text-sm text-zinc-500">Name</p>
                                    <p className="font-medium">
                                        {appointment.firstName} {appointment.lastName}
                                    </p>
                                </div>
                            </div>
                            {appointment.email && (
                                <div className="flex items-center gap-3 text-white">
                                    <Mail className="w-4 h-4 text-zinc-500" />
                                    <div className="min-w-0">
                                        <p className="text-sm text-zinc-500">Email</p>
                                        <p className="font-medium truncate">{appointment.email}</p>
                                    </div>
                                </div>
                            )}
                            {appointment.phone && (
                                <div className="flex items-center gap-3 text-white">
                                    <Phone className="w-4 h-4 text-zinc-500" />
                                    <div>
                                        <p className="text-sm text-zinc-500">Phone</p>
                                        <p className="font-medium">{appointment.phone}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Appointment Details */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">
                            Appointment Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 text-white">
                                <Calendar className="w-4 h-4 text-zinc-500" />
                                <div>
                                    <p className="text-sm text-zinc-500">Date & Time</p>
                                    <p className="font-medium">{formatDateTime(appointment.datetime)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-white">
                                <Clock className="w-4 h-4 text-zinc-500" />
                                <div>
                                    <p className="text-sm text-zinc-500">Duration</p>
                                    <p className="font-medium">{duration} minutes</p>
                                </div>
                            </div>
                            {appointment.calendar && (
                                <div className="flex items-center gap-3 text-white">
                                    <MapPin className="w-4 h-4 text-zinc-500" />
                                    <div>
                                        <p className="text-sm text-zinc-500">Calendar</p>
                                        <p className="font-medium">{appointment.calendar}</p>
                                    </div>
                                </div>
                            )}
                            {appointment.timezone && (
                                <div className="flex items-center gap-3 text-white">
                                    <Clock className="w-4 h-4 text-zinc-500" />
                                    <div>
                                        <p className="text-sm text-zinc-500">Timezone</p>
                                        <p className="font-medium">{appointment.timezone}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment Information */}
                    {(appointment.price || appointment.paid) && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">
                                Payment Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {appointment.price && (
                                    <div className="flex items-center gap-3 text-white">
                                        <DollarSign className="w-4 h-4 text-zinc-500" />
                                        <div>
                                            <p className="text-sm text-zinc-500">Price</p>
                                            <p className="font-medium">${appointment.price}</p>
                                        </div>
                                    </div>
                                )}
                                {appointment.paid && (
                                    <div className="flex items-center gap-3 text-white">
                                        <CreditCard className="w-4 h-4 text-zinc-500" />
                                        <div>
                                            <p className="text-sm text-zinc-500">Paid</p>
                                            <p className="font-medium">
                                                {appointment.paid === 'yes' ? (
                                                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                                                        Paid ${appointment.amountPaid || appointment.priceSold}
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                                        Unpaid
                                                    </Badge>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {appointment.notes && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">
                                Notes
                            </h3>
                            <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-800">
                                <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                                    {appointment.notes}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Forms Data */}
                    {appointment.forms && appointment.forms.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">
                                Form Responses
                            </h3>
                            <div className="space-y-2">
                                {appointment.forms.map((form: any, idx: number) => (
                                    <div key={idx} className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-800">
                                        <p className="text-sm font-medium text-white mb-1">{form.name}</p>
                                        <p className="text-sm text-zinc-400">{form.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Confirmation Link */}
                    {appointment.confirmationPage && (
                        <div className="pt-4 border-t border-zinc-800">
                            <a
                                href={appointment.confirmationPage}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-400 hover:text-blue-300 underline"
                            >
                                View Confirmation Page →
                            </a>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
