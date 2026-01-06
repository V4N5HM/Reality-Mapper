'use client';

import { useState } from 'react';
import { usePortal } from '@/contexts/portal-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    CheckCircle2,
    XCircle,
    Clock,
    Video,
    Youtube,
    Mic,
    Loader2,
    ExternalLink,
    Upload,
    Lightbulb,
    CheckCheck,
    Film,
    Plus,
    ChevronDown,
    FileText,
    Ban,
    AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Idea, ContentType, IdeaContentFormat, IdeaRejectionReason } from '@/types';
import { toast } from 'sonner';

// Rejection reason options
const REJECTION_REASONS: { value: IdeaRejectionReason; label: string }[] = [
  { value: 'Not aligned', label: 'Not aligned with brand' },
  { value: 'Controversial', label: 'Too controversial' },
  { value: 'Unclear on angle', label: 'Unclear on angle' },
  { value: 'Other', label: 'Other' },
];

// Helper to format date as YYYY-MM-DD in local timezone (avoids UTC conversion issues)
function formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

interface ClientIdeasViewProps {
    clientId: string;
    contentBankClientId: string;
    pendingIdeas: Idea[];
    approvedIdeas: Idea[];
    usedIdeas: Idea[];
    rejectedIdeas: Idea[];
}

const contentTypeIcons: Record<ContentType, typeof Video> = {
    'Short Form': Video,
    'YouTube': Youtube,
    'Podcast': Mic,
};

const contentTypeColors: Record<ContentType, string> = {
    'Short Form': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'YouTube': 'bg-red-500/20 text-red-400 border-red-500/30',
    'Podcast': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

// Map content format to content type
function formatToContentType(format: IdeaContentFormat): ContentType {
    if (format === '📹 Short Video') return 'Short Form';
    if (format === '🎥 Long Video') return 'YouTube';
    return 'Short Form';
}

interface IdeaCardProps {
    idea: Idea;
    onApprove?: (id: string) => Promise<void>;
    onReject?: (id: string, reason: IdeaRejectionReason, note?: string) => Promise<void>;
    onMarkFilmed?: (idea: Idea) => void;
    showActions?: boolean;
    showFilmedButton?: boolean;
}

function IdeaCard({ idea, onApprove, onReject, onMarkFilmed, showActions = false, showFilmedButton = false }: IdeaCardProps) {
    const [isApproving, setIsApproving] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectionReason, setRejectionReason] = useState<IdeaRejectionReason | ''>('');
    const [rejectionNote, setRejectionNote] = useState('');

    const contentType = idea.contentType || formatToContentType(idea.contentFormat);
    const Icon = contentTypeIcons[contentType];

    // Check if there's additional info to show when expanded
    const hasAdditionalInfo = idea.hook || idea.script || idea.style || idea.source || idea.url;

    const handleApprove = async () => {
        if (!onApprove) return;
        setIsApproving(true);
        try {
            await onApprove(idea.id);
        } finally {
            setIsApproving(false);
        }
    };

    const handleRejectClick = () => {
        setShowRejectDialog(true);
    };

    const handleRejectConfirm = async () => {
        if (!onReject || !rejectionReason) return;
        setIsRejecting(true);
        try {
            await onReject(idea.id, rejectionReason, rejectionReason === 'Other' ? rejectionNote : undefined);
            setShowRejectDialog(false);
            setRejectionReason('');
            setRejectionNote('');
        } finally {
            setIsRejecting(false);
        }
    };

    const handleRejectCancel = () => {
        setShowRejectDialog(false);
        setRejectionReason('');
        setRejectionNote('');
    };

    // Format date for display
    const formattedDate = idea.createdAt ? new Date(idea.createdAt).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }) : null;

    return (
        <Card className="bg-zinc-900 border-zinc-800">
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CardContent className="p-4">
                    <CollapsibleTrigger asChild>
                        <div className="flex items-start gap-4 cursor-pointer">
                            <div className={cn(
                                'p-2 rounded-lg',
                                contentType === 'Short Form' ? 'bg-blue-500/10' :
                                contentType === 'YouTube' ? 'bg-red-500/10' : 'bg-purple-500/10'
                            )}>
                                <Icon className={cn(
                                    'w-5 h-5',
                                    contentType === 'Short Form' ? 'text-blue-400' :
                                    contentType === 'YouTube' ? 'text-red-400' : 'text-purple-400'
                                )} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-white font-medium flex-1">{idea.title}</h3>
                                    <ChevronDown className={cn(
                                        'w-4 h-4 text-zinc-500 transition-transform',
                                        isExpanded && 'rotate-180'
                                    )} />
                                </div>

                                {/* Angle - always visible when available (no truncation) */}
                                {!isExpanded && idea.angle && (
                                    <p className="text-sm text-zinc-400 mt-1">
                                        <span className="text-zinc-500">Angle:</span> {idea.angle}
                                    </p>
                                )}

                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    {/* Date badge */}
                                    {formattedDate && (
                                        <Badge variant="outline" className="bg-zinc-800/50 text-zinc-400 border-zinc-700">
                                            {formattedDate}
                                        </Badge>
                                    )}

                                    {/* Urgency badge - shown prominently */}
                                    {idea.priority === 'Urgent' && (
                                        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                                            Urgent
                                        </Badge>
                                    )}

                                    {/* Content type badge */}
                                    <Badge variant="outline" className={contentTypeColors[contentType]}>
                                        {contentType}
                                    </Badge>

                                    {/* Source badge */}
                                    {idea.source && (
                                        <Badge variant="outline" className="bg-zinc-800 text-zinc-400 border-zinc-700">
                                            {idea.source}
                                        </Badge>
                                    )}

                                    {/* Source Link button - always visible when available */}
                                    {idea.sourceLink && !isExpanded && (
                                        <a
                                            href={idea.sourceLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors border border-blue-500/30"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            Source
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                        <div className="mt-4 pt-4 border-t border-zinc-800 space-y-3">
                            {/* Angle */}
                            {idea.angle && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-zinc-400">Angle:</span>
                                    </div>
                                    <p className="text-sm text-zinc-300 whitespace-pre-wrap">{idea.angle}</p>
                                </div>
                            )}

                            {/* Hook/Description */}
                            {idea.hook && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Lightbulb className="w-4 h-4 text-yellow-500" />
                                        <span className="text-sm text-zinc-400">Hook:</span>
                                    </div>
                                    <p className="text-sm text-zinc-300 pl-6 whitespace-pre-wrap">{idea.hook}</p>
                                </div>
                            )}

                            {/* Script */}
                            {idea.script && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-blue-500" />
                                        <span className="text-sm text-zinc-400">Script:</span>
                                    </div>
                                    <p className="text-sm text-zinc-300 pl-6 whitespace-pre-wrap">{idea.script}</p>
                                </div>
                            )}

                            {/* Source with Source Link */}
                            {(idea.source || idea.sourceLink) && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    {idea.source && (
                                        <>
                                            <span className="text-sm text-zinc-400">Source:</span>
                                            <span className="text-sm text-white">{idea.source}</span>
                                        </>
                                    )}
                                    {idea.sourceLink && (
                                        <a
                                            href={idea.sourceLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            View Source
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* Reference URL */}
                            {idea.url && (
                                <a
                                    href={idea.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    Reference Link
                                </a>
                            )}

                            {/* Brief URL */}
                            {idea.briefUrl && (
                                <a
                                    href={idea.briefUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    View Brief
                                </a>
                            )}
                        </div>
                    </CollapsibleContent>

                    {/* Action buttons */}
                    {(showActions || showFilmedButton) && (
                        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-zinc-800">
                            {showActions && (
                                <>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRejectClick();
                                        }}
                                        disabled={isRejecting || isApproving}
                                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                                    >
                                        {isRejecting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <XCircle className="w-4 h-4" />
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleApprove();
                                        }}
                                        disabled={isApproving || isRejecting}
                                        className="bg-green-600 hover:bg-green-700 gap-2"
                                    >
                                        {isApproving ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-4 h-4" />
                                                Approve
                                            </>
                                        )}
                                    </Button>
                                </>
                            )}

                            {showFilmedButton && (
                                <Button
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMarkFilmed?.(idea);
                                    }}
                                    className="bg-cyan-600 hover:bg-cyan-700 gap-2"
                                >
                                    <Film className="w-4 h-4" />
                                    Mark as Filmed
                                </Button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Collapsible>

            {/* Rejection Reason Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-400" />
                            Reject Idea
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <p className="text-sm text-zinc-400">
                            Please select a reason for rejecting this idea. This feedback helps improve future content suggestions.
                        </p>

                        <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                            <p className="text-xs text-zinc-500 mb-1">Idea</p>
                            <p className="text-sm text-white font-medium">{idea.title}</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-zinc-300">Rejection Reason *</Label>
                            <Select
                                value={rejectionReason}
                                onValueChange={(v) => setRejectionReason(v as IdeaRejectionReason)}
                            >
                                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                    <SelectValue placeholder="Select a reason..." />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-800 border-zinc-700">
                                    {REJECTION_REASONS.map((reason) => (
                                        <SelectItem
                                            key={reason.value}
                                            value={reason.value}
                                            className="text-white"
                                        >
                                            {reason.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {rejectionReason === 'Other' && (
                            <div className="space-y-2">
                                <Label className="text-zinc-300">Additional Notes</Label>
                                <Textarea
                                    value={rejectionNote}
                                    onChange={(e) => setRejectionNote(e.target.value)}
                                    placeholder="Please explain why this idea is being rejected..."
                                    className="bg-zinc-800 border-zinc-700 text-white min-h-[80px]"
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={handleRejectCancel}
                            className="border-zinc-700 text-zinc-300"
                            disabled={isRejecting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleRejectConfirm}
                            disabled={!rejectionReason || isRejecting || (rejectionReason === 'Other' && !rejectionNote.trim())}
                            className="gap-2 bg-red-600 hover:bg-red-700"
                        >
                            {isRejecting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Rejecting...
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-4 h-4" />
                                    Reject Idea
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

// Rejected idea card with rejection details
function RejectedIdeaCard({ idea }: { idea: Idea }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const contentType = idea.contentType || formatToContentType(idea.contentFormat);
    const Icon = contentTypeIcons[contentType];

    // Format date for display
    const formattedDate = idea.createdAt ? new Date(idea.createdAt).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }) : null;

    // Map rejection reason to user-friendly label
    const rejectionReasonLabel = REJECTION_REASONS.find(r => r.value === idea.rejectionReason)?.label || idea.rejectionReason;

    return (
        <Card className="bg-zinc-900 border-zinc-800 border-l-2 border-l-red-500">
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CardContent className="p-4">
                    <CollapsibleTrigger asChild>
                        <div className="flex items-start gap-4 cursor-pointer">
                            <div className={cn(
                                'p-2 rounded-lg',
                                contentType === 'Short Form' ? 'bg-blue-500/10' :
                                contentType === 'YouTube' ? 'bg-red-500/10' : 'bg-purple-500/10'
                            )}>
                                <Icon className={cn(
                                    'w-5 h-5',
                                    contentType === 'Short Form' ? 'text-blue-400' :
                                    contentType === 'YouTube' ? 'text-red-400' : 'text-purple-400'
                                )} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-white font-medium flex-1">{idea.title}</h3>
                                    <ChevronDown className={cn(
                                        'w-4 h-4 text-zinc-500 transition-transform',
                                        isExpanded && 'rotate-180'
                                    )} />
                                </div>

                                {/* Rejection reason - always visible */}
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                                        <XCircle className="w-3 h-3 mr-1" />
                                        {rejectionReasonLabel || 'Rejected'}
                                    </Badge>
                                    {formattedDate && (
                                        <span className="text-xs text-zinc-500">{formattedDate}</span>
                                    )}
                                </div>

                                {/* Rejection note preview */}
                                {!isExpanded && idea.rejectionNote && (
                                    <p className="text-sm text-zinc-400 mt-2 line-clamp-1">
                                        <span className="text-zinc-500">Note:</span> {idea.rejectionNote}
                                    </p>
                                )}
                            </div>
                        </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                        <div className="mt-4 pt-4 border-t border-zinc-800 space-y-3">
                            {/* Rejection Note */}
                            {idea.rejectionNote && (
                                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                                    <div className="flex items-center gap-2 mb-1">
                                        <AlertCircle className="w-4 h-4 text-red-400" />
                                        <span className="text-sm font-medium text-red-400">Rejection Note</span>
                                    </div>
                                    <p className="text-sm text-zinc-300 whitespace-pre-wrap">{idea.rejectionNote}</p>
                                </div>
                            )}

                            {/* Angle */}
                            {idea.angle && (
                                <div className="space-y-1">
                                    <span className="text-sm text-zinc-400">Angle:</span>
                                    <p className="text-sm text-zinc-300 whitespace-pre-wrap">{idea.angle}</p>
                                </div>
                            )}

                            {/* Hook/Description */}
                            {idea.hook && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Lightbulb className="w-4 h-4 text-yellow-500" />
                                        <span className="text-sm text-zinc-400">Hook:</span>
                                    </div>
                                    <p className="text-sm text-zinc-300 pl-6 whitespace-pre-wrap">{idea.hook}</p>
                                </div>
                            )}

                            {/* Script */}
                            {idea.script && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-blue-500" />
                                        <span className="text-sm text-zinc-400">Script:</span>
                                    </div>
                                    <p className="text-sm text-zinc-300 pl-6 whitespace-pre-wrap">{idea.script}</p>
                                </div>
                            )}

                            {/* Source with Source Link */}
                            {(idea.source || idea.sourceLink) && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    {idea.source && (
                                        <>
                                            <span className="text-sm text-zinc-400">Source:</span>
                                            <span className="text-sm text-white">{idea.source}</span>
                                        </>
                                    )}
                                    {idea.sourceLink && (
                                        <a
                                            href={idea.sourceLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            View Source
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* Reference URL */}
                            {idea.url && (
                                <a
                                    href={idea.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    Reference Link
                                </a>
                            )}

                            {/* Brief URL */}
                            {idea.briefUrl && (
                                <a
                                    href={idea.briefUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    View Brief
                                </a>
                            )}
                        </div>
                    </CollapsibleContent>
                </CardContent>
            </Collapsible>
        </Card>
    );
}

// Modal for submitting filmed content
interface FilmedSubmissionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    idea: Idea | null;
    clientId: string;
    onSubmit: () => void;
}

function FilmedSubmissionModal({ open, onOpenChange, idea, clientId, onSubmit }: FilmedSubmissionModalProps) {
    const { refreshContent, refreshIdeas } = usePortal();
    const [dropboxLink, setDropboxLink] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset form when modal closes
    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setDropboxLink('');
        }
        onOpenChange(isOpen);
    };

    // Find next available date that doesn't have content scheduled for this client
    const findNextAvailableDate = async (contentType: string): Promise<string> => {
        try {
            // Only fetch content with scheduled dates in the next 60 days for better performance
            const today = new Date();
            const dateFrom = formatDateKey(today);
            const futureDate = new Date(today);
            futureDate.setDate(futureDate.getDate() + 60);
            const dateTo = formatDateKey(futureDate);

            // Fetch existing content for this client with date filter
            const params = new URLSearchParams({
                clientId,
                contentType,
                dateFrom,
                dateTo,
                limit: '100',
            });
            const response = await fetch(`/api/content?${params}`);
            if (!response.ok) throw new Error('Failed to fetch schedule');

            const existingContent = await response.json();

            // Get all scheduled dates for this content type
            const scheduledDates = new Set(
                existingContent
                    .filter((c: any) => c.scheduledDate)
                    .map((c: any) => c.scheduledDate)
            );

            // Start from tomorrow and find the first available date
            let candidateDate = new Date(today);
            candidateDate.setDate(candidateDate.getDate() + 1);

            // Look up to 60 days ahead to find an available slot
            for (let i = 0; i < 60; i++) {
                const dateStr = formatDateKey(candidateDate);
                if (!scheduledDates.has(dateStr)) {
                    return dateStr;
                }
                candidateDate.setDate(candidateDate.getDate() + 1);
            }

            // Fallback to tomorrow if all dates are taken (shouldn't happen)
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return formatDateKey(tomorrow);
        } catch (error) {
            console.error('Error finding available date:', error);
            // Fallback to tomorrow on error
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return formatDateKey(tomorrow);
        }
    };

    const handleSubmit = async () => {
        if (!dropboxLink.trim() || !idea) return;

        setIsSubmitting(true);
        try {
            // Find next available date for scheduling based on content type
            const contentType = idea.contentType || formatToContentType(idea.contentFormat);
            const scheduledDate = await findNextAvailableDate(contentType);

            // Create content with Filmed status
            // Use the idea title as the content title
            // Pass priority if the idea is urgent
            const response = await fetch('/api/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: idea.title,
                    clientId,
                    contentType,
                    status: 'Filmed',
                    scheduledDate,
                    driveLink: dropboxLink.trim(),
                    ideaSourceId: idea.id,
                    isUrgent: idea.priority === 'Urgent',
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create content');
            }

            const newContent = await response.json();

            // Mark the idea as 'Recorded' so it shows in the Filmed tab
            // The content is linked via the 'Idea Source' relation on the Content side
            await fetch(`/api/ideas/${idea.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Recorded' }),
            });

            toast.success('Content submitted successfully! It will appear in your schedule and pipeline.');
            // Refresh context data in background
            Promise.all([refreshContent(), refreshIdeas()]);
            onSubmit();
            onOpenChange(false);
            setDropboxLink('');
        } catch (error) {
            toast.error('Failed to submit content');
            console.error('Error submitting filmed content:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Film className="w-5 h-5 text-cyan-400" />
                        Submit Filmed Content
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <p className="text-sm text-zinc-400">
                        Once submitted, this content will be scheduled and appear in your pipeline for editing.
                    </p>

                    {idea && (
                        <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                            <p className="text-xs text-zinc-500 mb-1">Content Title (from idea)</p>
                            <p className="text-sm text-white font-medium">{idea.title}</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="dropboxLink" className="text-zinc-300">Dropbox Link</Label>
                        <Input
                            id="dropboxLink"
                            value={dropboxLink}
                            onChange={(e) => setDropboxLink(e.target.value)}
                            placeholder="https://dropbox.com/..."
                            className="bg-zinc-800 border-zinc-700 text-white"
                        />
                        <p className="text-xs text-zinc-500">
                            Paste the Dropbox link to your filmed content
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="border-zinc-700 text-zinc-300"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!dropboxLink.trim() || isSubmitting}
                        className="gap-2 bg-cyan-600 hover:bg-cyan-700"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" />
                                Submit Content
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Modal for creating a new idea
interface NewIdeaModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientId: string;
    onSubmit: (idea: Idea) => void;
}

function NewIdeaModal({ open, onOpenChange, clientId, onSubmit }: NewIdeaModalProps) {
    const { refreshIdeas } = usePortal();
    const [title, setTitle] = useState('');
    const [hook, setHook] = useState('');
    const [contentType, setContentType] = useState<ContentType>('Short Form');
    const [referenceUrl, setReferenceUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!title.trim()) return;

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/ideas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    clientId,
                    contentType,
                    hook: hook.trim() || undefined,
                    url: referenceUrl.trim() || undefined,
                    status: 'Needs Review',
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create idea');
            }

            const newIdea = await response.json();
            toast.success('Idea submitted for review!');
            // Refresh context data in background
            refreshIdeas();
            onSubmit(newIdea);
            onOpenChange(false);

            // Reset form
            setTitle('');
            setHook('');
            setContentType('Short Form');
            setReferenceUrl('');
        } catch (error) {
            toast.error('Failed to submit idea');
            console.error('Error creating idea:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-400" />
                        Submit New Idea
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <p className="text-sm text-zinc-400">
                        Submit a content idea for review. Once approved, you can film it and submit for editing.
                    </p>

                    <div className="space-y-2">
                        <Label htmlFor="ideaTitle" className="text-zinc-300">Idea Title *</Label>
                        <Input
                            id="ideaTitle"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="What's the content idea?"
                            className="bg-zinc-800 border-zinc-700 text-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="contentType" className="text-zinc-300">Content Type</Label>
                        <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700">
                                <SelectItem value="Short Form" className="text-white">
                                    <div className="flex items-center gap-2">
                                        <Video className="w-4 h-4 text-blue-400" />
                                        Short Form
                                    </div>
                                </SelectItem>
                                <SelectItem value="YouTube" className="text-white">
                                    <div className="flex items-center gap-2">
                                        <Youtube className="w-4 h-4 text-red-400" />
                                        YouTube
                                    </div>
                                </SelectItem>
                                <SelectItem value="Podcast" className="text-white">
                                    <div className="flex items-center gap-2">
                                        <Mic className="w-4 h-4 text-purple-400" />
                                        Podcast
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="hook" className="text-zinc-300">Hook / Description</Label>
                        <Textarea
                            id="hook"
                            value={hook}
                            onChange={(e) => setHook(e.target.value)}
                            placeholder="Describe the hook or main point of the content..."
                            className="bg-zinc-800 border-zinc-700 text-white min-h-[80px]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="referenceUrl" className="text-zinc-300">Reference URL (optional)</Label>
                        <Input
                            id="referenceUrl"
                            value={referenceUrl}
                            onChange={(e) => setReferenceUrl(e.target.value)}
                            placeholder="https://..."
                            className="bg-zinc-800 border-zinc-700 text-white"
                        />
                        <p className="text-xs text-zinc-500">
                            Link to any reference material for this idea
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="border-zinc-700 text-zinc-300"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!title.trim() || isSubmitting}
                        className="gap-2 bg-yellow-600 hover:bg-yellow-700"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4" />
                                Submit Idea
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Helper to sort ideas: urgent first, then by creation date (newest first)
function sortIdeas(ideas: Idea[]): Idea[] {
    return [...ideas].sort((a, b) => {
        // Urgent items first
        if (a.priority === 'Urgent' && b.priority !== 'Urgent') return -1;
        if (a.priority !== 'Urgent' && b.priority === 'Urgent') return 1;
        // Then sort by creation date (newest first)
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
    });
}

export function ClientIdeasView({ clientId, contentBankClientId, pendingIdeas: initialPending, approvedIdeas: initialApproved, usedIdeas: initialUsed, rejectedIdeas: initialRejected }: ClientIdeasViewProps) {
    const { refreshIdeas } = usePortal();
    const [pendingIdeas, setPendingIdeas] = useState(sortIdeas(initialPending));
    const [approvedIdeas, setApprovedIdeas] = useState(sortIdeas(initialApproved));
    const [usedIdeas, setUsedIdeas] = useState(sortIdeas(initialUsed));
    const [rejectedIdeas, setRejectedIdeas] = useState(sortIdeas(initialRejected));
    const [filmedModalOpen, setFilmedModalOpen] = useState(false);
    const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
    const [newIdeaModalOpen, setNewIdeaModalOpen] = useState(false);

    const handleApprove = async (id: string) => {
        try {
            const response = await fetch(`/api/ideas/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Approved' }),
            });

            if (!response.ok) throw new Error('Failed to approve');

            // Move idea from pending to approved
            const idea = pendingIdeas.find((i) => i.id === id);
            if (idea) {
                setPendingIdeas((prev) => prev.filter((i) => i.id !== id));
                setApprovedIdeas((prev) => [...prev, { ...idea, status: 'Approved' }]);
            }

            toast.success('Idea approved!');
            // Refresh context data in background
            refreshIdeas();
        } catch (error) {
            toast.error('Failed to approve idea');
            console.error('Error approving idea:', error);
        }
    };

    const handleReject = async (id: string, reason: IdeaRejectionReason, note?: string) => {
        try {
            const response = await fetch(`/api/ideas/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'Not Approved',
                    rejectionReason: reason,
                    rejectionNote: note,
                }),
            });

            if (!response.ok) throw new Error('Failed to reject');

            // Move from pending to rejected
            const idea = pendingIdeas.find((i) => i.id === id);
            if (idea) {
                setPendingIdeas((prev) => prev.filter((i) => i.id !== id));
                setRejectedIdeas((prev) => sortIdeas([...prev, {
                    ...idea,
                    status: 'Not Approved',
                    rejectionReason: reason,
                    rejectionNote: note,
                }]));
            }
            toast.success('Idea rejected');
            // Refresh context data in background
            refreshIdeas();
        } catch (error) {
            toast.error('Failed to reject idea');
            console.error('Error rejecting idea:', error);
        }
    };

    const handleMarkFilmed = (idea: Idea) => {
        setSelectedIdea(idea);
        setFilmedModalOpen(true);
    };

    const handleFilmedSubmit = () => {
        if (selectedIdea) {
            // Move from approved to used (linkedContentId marks it as used)
            setApprovedIdeas((prev) => prev.filter((i) => i.id !== selectedIdea.id));
            setUsedIdeas((prev) => [...prev, { ...selectedIdea, linkedContentId: 'linked' }]);
        }
    };

    const handleNewIdeaSubmit = (idea: Idea) => {
        // Add new idea to pending list and maintain sort order
        setPendingIdeas((prev) => sortIdeas([idea, ...prev]));
    };

    return (
        <>
            {/* Submit New Idea Button */}
            <div className="flex justify-end mb-4">
                <Button
                    onClick={() => setNewIdeaModalOpen(true)}
                    className="gap-2 bg-yellow-600 hover:bg-yellow-700"
                >
                    <Plus className="w-4 h-4" />
                    Submit New Idea
                </Button>
            </div>

            <Tabs defaultValue="pending" className="space-y-4">
                <TabsList className="bg-zinc-900 border border-zinc-800">
                    <TabsTrigger value="pending" className="gap-2">
                        <Clock className="w-4 h-4" />
                        Pending Review
                        <Badge className="ml-1 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                            {pendingIdeas.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="approved" className="gap-2">
                        <Lightbulb className="w-4 h-4" />
                        Approved - Ready to Film
                        <Badge className="ml-1 bg-green-500/20 text-green-400 border-green-500/30">
                            {approvedIdeas.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="used" className="gap-2">
                        <CheckCheck className="w-4 h-4" />
                        Filmed
                        <Badge className="ml-1 bg-zinc-700 text-zinc-400">
                            {usedIdeas.length}
                        </Badge>
                    </TabsTrigger>
                    {rejectedIdeas.length > 0 && (
                        <TabsTrigger value="rejected" className="gap-2">
                            <Ban className="w-4 h-4" />
                            Rejected
                            <Badge className="ml-1 bg-red-500/20 text-red-400 border-red-500/30">
                                {rejectedIdeas.length}
                            </Badge>
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* Pending Tab */}
                <TabsContent value="pending" className="mt-4">
                    {pendingIdeas.length === 0 ? (
                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <Clock className="w-12 h-12 text-zinc-600 mb-4" />
                                <p className="text-zinc-400 text-center">
                                    No ideas pending review.
                                </p>
                                <p className="text-zinc-500 text-sm text-center mt-1">
                                    New content ideas will appear here for your approval.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {pendingIdeas.map((idea) => (
                                <IdeaCard
                                    key={idea.id}
                                    idea={idea}
                                    onApprove={handleApprove}
                                    onReject={handleReject}
                                    showActions
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Approved Tab */}
                <TabsContent value="approved" className="mt-4">
                    <div className="mb-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                        <div className="flex items-center gap-2 text-cyan-400 font-medium mb-1">
                            <Film className="w-4 h-4" />
                            Ready to Film
                        </div>
                        <p className="text-sm text-zinc-400">
                            These ideas are approved and ready to be filmed. Once you've filmed the content,
                            click "Mark as Filmed" and upload the Dropbox link.
                        </p>
                    </div>

                    {approvedIdeas.length === 0 ? (
                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <Lightbulb className="w-12 h-12 text-zinc-600 mb-4" />
                                <p className="text-zinc-400 text-center">
                                    No approved ideas waiting to be filmed.
                                </p>
                                <p className="text-zinc-500 text-sm text-center mt-1">
                                    Approve ideas from the Pending tab to see them here.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {approvedIdeas.map((idea) => (
                                <IdeaCard
                                    key={idea.id}
                                    idea={idea}
                                    onMarkFilmed={handleMarkFilmed}
                                    showFilmedButton
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Used/Filmed Tab */}
                <TabsContent value="used" className="mt-4">
                    {usedIdeas.length === 0 ? (
                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <CheckCheck className="w-12 h-12 text-zinc-600 mb-4" />
                                <p className="text-zinc-400 text-center">
                                    No filmed content yet.
                                </p>
                                <p className="text-zinc-500 text-sm text-center mt-1">
                                    Ideas that have been filmed and submitted will appear here.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {usedIdeas.map((idea) => (
                                <IdeaCard key={idea.id} idea={idea} />
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Rejected Tab */}
                <TabsContent value="rejected" className="mt-4">
                    <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <div className="flex items-center gap-2 text-red-400 font-medium mb-1">
                            <AlertCircle className="w-4 h-4" />
                            Rejected Ideas
                        </div>
                        <p className="text-sm text-zinc-400">
                            These ideas were not approved. The rejection reason and any notes are shown below.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {rejectedIdeas.map((idea) => (
                            <RejectedIdeaCard key={idea.id} idea={idea} />
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            <FilmedSubmissionModal
                open={filmedModalOpen}
                onOpenChange={setFilmedModalOpen}
                idea={selectedIdea}
                clientId={clientId}
                onSubmit={handleFilmedSubmit}
            />

            <NewIdeaModal
                open={newIdeaModalOpen}
                onOpenChange={setNewIdeaModalOpen}
                clientId={contentBankClientId}
                onSubmit={handleNewIdeaSubmit}
            />
        </>
    );
}
