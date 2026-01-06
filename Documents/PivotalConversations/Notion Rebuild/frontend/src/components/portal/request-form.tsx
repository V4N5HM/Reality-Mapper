'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

interface RequestFormProps {
    clientId: string;
    onSuccess?: () => void;
}

export function RequestForm({ clientId, onSuccess }: RequestFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'New Idea', // Default type
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.description) return;

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/case-notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId,
                    title: formData.title,
                    fullNote: formData.description,
                    type: 'Client Request',
                    source: 'Client Portal',
                    tags: [formData.type],
                }),
            });

            if (!response.ok) throw new Error('Failed to submit request');

            toast.success('Request submitted successfully!');
            setFormData({ title: '', description: '', type: 'New Idea' });
            onSuccess?.();
        } catch (error) {
            console.error('Error submitting request:', error);
            toast.error('Failed to submit request');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
                <CardTitle className="text-white">Submit New Request</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-zinc-300">Request Type</Label>
                        <Select
                            value={formData.type}
                            onValueChange={(value) => setFormData({ ...formData, type: value })}
                        >
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                <SelectItem value="New Idea">New Content Idea</SelectItem>
                                <SelectItem value="Edit Request">Edit Request</SelectItem>
                                <SelectItem value="Strategy">Strategy Question</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-zinc-300">Title</Label>
                        <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Brief title for your request"
                            className="bg-zinc-800 border-zinc-700 text-white"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-zinc-300">Description</Label>
                        <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe what you need in detail..."
                            className="bg-zinc-800 border-zinc-700 text-white min-h-[150px]"
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={isSubmitting || !formData.title || !formData.description}
                        className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                        Submit Request
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
