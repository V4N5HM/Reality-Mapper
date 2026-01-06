import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
    message?: string;
    className?: string;
    count?: number; // Optional number to show "Loaded X items..."
}

export function LoadingState({ message = 'Loading...', className, count }: LoadingStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <p className="text-zinc-400 animate-pulse">{message}</p>
            {count !== undefined && count > 0 && (
                <p className="text-sm text-zinc-500 mt-2">{count} items loaded</p>
            )}
        </div>
    );
}
