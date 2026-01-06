'use client';

import { useState, useEffect } from 'react';
import { Idea, IdeaStatus, IdeaContentFormat, IdeaSource, IdeaStyle } from '@/types';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
    Video,
    Youtube,
    Mic,
    Calendar,
    Link2,
    FileText,
    ExternalLink,
    Save,
    Loader2,
    Clock,
    Lightbulb,
    Target,
    Palette,
    Globe,
    Trash2,
    AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

interface IdeaDetailModalProps {
    idea: Idea | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: (idea: Idea) => void;
    onDelete?: (ideaId: string) => void;
}

const contentTypeIcons = {
    'Short Form': Video,
    'YouTube': Youtube,
    'Podcast': Mic,
};

const ideaStatuses: IdeaStatus[] = [
    'Not started', 'In Progress', 'Needs Review', 'Reviewing',
    'Approved', 'Not Approved', 'Done'
];

const contentFormats: IdeaContentFormat[] = [
    '📹 Short Video', '🎥 Long Video', '📷 Image'
];

const sources: IdeaSource[] = [
    'Reels', 'Article', 'Reddit', 'Brainstorm', 'YouTube',
    'TikTok', 'X', 'Facebook', 'Question', 'Email'
];

const styles: IdeaStyle[] = [
    'Challenge', 'Reaction', 'Talking Head/PTC', 'Paper Explanation',
    'Cardboard Reveal', 'Whiteboard Session', 'Greenscreen', 'Vox Pop',
    'Vlog', 'Animation', 'Quote', 'Q&A', 'Role Play', 'Carousel'
];

export function IdeaDetailModal({
    idea,
    open,
    onOpenChange,
    onUpdate,
    onDelete,
}: IdeaDetailModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [status, setStatus] = useState<IdeaStatus>('Not started');
    const [contentFormat, setContentFormat] = useState<IdeaContentFormat>('📹 Short Video');
    const [hook, setHook] = useState('');
    const [script, setScript] = useState('');
    const [source, setSource] = useState<IdeaSource | undefined>(undefined);
    const [style, setStyle] = useState<IdeaStyle | undefined>(undefined);
    const [url, setUrl] = useState('');
    const [priority, setPriority] = useState<'Urgent' | 'Not Urgent'>('Not Urgent');

    // Initialize form when idea changes
    useEffect(() => {
        if (idea) {
            setTitle(idea.title || '');
            setStatus(idea.status || 'Not started');
            setContentFormat(idea.contentFormat || '📹 Short Video');
            setHook(idea.hook || '');
            setScript(idea.script || '');
            setSource(idea.source);
            setStyle(idea.style);
            setUrl(idea.url || '');
            setPriority(idea.priority || 'Not Urgent');
        }
    }, [idea]);

    const handleSave = async () => {
        if (!idea) return;

        setIsLoading(true);
        try {
            const response = await fetch(`/api/ideas/${idea.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    status,
                    contentFormat,
                    hook,
                    script,
                    source: source || null,
                    style: style || null,
                    url: url || null,
                    priority,
                }),
            });

            if (!response.ok) throw new Error('Failed to update');

            const updatedIdea = await response.json();
            toast.success('Idea updated successfully');
            onUpdate?.(updatedIdea);
        } catch (error) {
            toast.error('Failed to update idea');
            console.error('Error updating idea:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!idea) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/ideas/${idea.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete');

            toast.success('Idea deleted');
            onDelete?.(idea.id);
            onOpenChange(false);
        } catch (error) {
            toast.error('Failed to delete idea');
            console.error('Error deleting idea:', error);
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    if (!idea) return null;

    const Icon = contentTypeIcons[idea.contentType] || Lightbulb;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            'p-2 rounded-lg',
                            idea.contentType === 'Short Form' ? 'bg-blue-500/10' :
                                idea.contentType === 'YouTube' ? 'bg-red-500/10' : 'bg-purple-500/10'
                        )}>
                            <Icon className={cn(
                                'w-5 h-5',
                                idea.contentType === 'Short Form' ? 'text-blue-500' :
                                    idea.contentType === 'YouTube' ? 'text-red-500' : 'text-purple-500'
                            )} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <DialogTitle className="text-white text-lg">{idea.title}</DialogTitle>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                    {idea.contentFormat}
                                </Badge>
                                {idea.clientName && (
                                    <span className="text-sm text-zinc-500">{idea.clientName}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
                    <TabsList className="bg-zinc-800 w-full justify-start">
                        <TabsTrigger value="details" className="gap-2">
                            <Lightbulb className="w-4 h-4" />
                            Details
                        </TabsTrigger>
                        <TabsTrigger value="content" className="gap-2">
                            <FileText className="w-4 h-4" />
                            Script & Hook
                        </TabsTrigger>
                        <TabsTrigger value="meta" className="gap-2">
                            <Target className="w-4 h-4" />
                            Metadata
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-y-auto py-4">
                        <TabsContent value="details" className="mt-0 space-y-4">
                            {/* Title */}
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-zinc-300">Headline</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 text-white"
                                />
                            </div>

                            {/* Status & Priority */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Status</Label>
                                    <Select value={status} onValueChange={(v) => setStatus(v as IdeaStatus)}>
                                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-800 border-zinc-700">
                                            {ideaStatuses.map((s) => (
                                                <SelectItem key={s} value={s} className="text-white">
                                                    {s}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Priority</Label>
                                    <Select value={priority} onValueChange={(v) => setPriority(v as 'Urgent' | 'Not Urgent')}>
                                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-800 border-zinc-700">
                                            <SelectItem value="Urgent" className="text-red-400">Urgent</SelectItem>
                                            <SelectItem value="Not Urgent" className="text-zinc-400">Not Urgent</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Content Format */}
                            <div className="space-y-2">
                                <Label className="text-zinc-300">Content Format</Label>
                                <Select value={contentFormat} onValueChange={(v) => setContentFormat(v as IdeaContentFormat)}>
                                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-800 border-zinc-700">
                                        {contentFormats.map((f) => (
                                            <SelectItem key={f} value={f} className="text-white">
                                                {f}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* URL */}
                            <div className="space-y-2">
                                <Label htmlFor="url" className="text-zinc-300">Reference URL</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="url"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder="https://..."
                                        className="bg-zinc-800 border-zinc-700 text-white flex-1"
                                    />
                                    {url && (
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="border-zinc-700"
                                            onClick={() => window.open(url, '_blank')}
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="content" className="mt-0 space-y-4">
                            {/* Hook Ideas */}
                            <div className="space-y-2">
                                <Label htmlFor="hook" className="text-zinc-300">Hook Ideas</Label>
                                <Textarea
                                    id="hook"
                                    value={hook}
                                    onChange={(e) => setHook(e.target.value)}
                                    placeholder="Hook ideas..."
                                    className="bg-zinc-800 border-zinc-700 text-white min-h-[100px]"
                                />
                            </div>

                            {/* Script */}
                            <div className="space-y-2">
                                <Label htmlFor="script" className="text-zinc-300">Script / Notes</Label>
                                <Textarea
                                    id="script"
                                    value={script}
                                    onChange={(e) => setScript(e.target.value)}
                                    placeholder="Full script or detailed notes..."
                                    className="bg-zinc-800 border-zinc-700 text-white min-h-[300px]"
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="meta" className="mt-0 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {/* Source */}
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Source</Label>
                                    <Select value={source} onValueChange={(v) => setSource(v as IdeaSource)}>
                                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                            <SelectValue placeholder="Select source" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-800 border-zinc-700">
                                            {sources.map((s) => (
                                                <SelectItem key={s} value={s} className="text-white">
                                                    {s}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Style */}
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Style</Label>
                                    <Select value={style} onValueChange={(v) => setStyle(v as IdeaStyle)}>
                                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                            <SelectValue placeholder="Select style" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-800 border-zinc-700">
                                            {styles.map((s) => (
                                                <SelectItem key={s} value={s} className="text-white">
                                                    {s}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Separator className="bg-zinc-800 my-4" />

                            {/* Metadata */}
                            <div className="rounded-lg border border-zinc-800 p-3 space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-zinc-500 flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        Created
                                    </span>
                                    <span className="text-zinc-300">
                                        {new Date(idea.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                {idea.ideaAttributionDate && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-zinc-500 flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            Attribution Date
                                        </span>
                                        <span className="text-zinc-300">
                                            {new Date(idea.ideaAttributionDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                    <div>
                        {!showDeleteConfirm ? (
                            <Button
                                variant="ghost"
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                onClick={() => setShowDeleteConfirm(true)}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-400" />
                                <span className="text-sm text-red-400">Confirm delete?</span>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowDeleteConfirm(false)}
                                >
                                    No
                                </Button>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="border-zinc-700 text-zinc-300"
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={isLoading} className="gap-2">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Changes
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
