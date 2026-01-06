'use client';

import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown } from 'lucide-react';

interface LoadMoreButtonProps {
  onClick: () => void;
  loading?: boolean;
  hasMore: boolean;
  loadedCount?: number;
  totalLabel?: string;
  className?: string;
}

export function LoadMoreButton({
  onClick,
  loading = false,
  hasMore,
  loadedCount,
  totalLabel = 'items',
  className,
}: LoadMoreButtonProps) {
  if (!hasMore) {
    return loadedCount ? (
      <div className="text-center py-4 text-sm text-zinc-500">
        All {loadedCount} {totalLabel} loaded
      </div>
    ) : null;
  }

  return (
    <div className={`flex justify-center py-4 ${className || ''}`}>
      <Button
        variant="outline"
        onClick={onClick}
        disabled={loading}
        className="gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            Load More
            {loadedCount && <span className="text-zinc-500">({loadedCount} loaded)</span>}
          </>
        )}
      </Button>
    </div>
  );
}
