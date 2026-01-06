'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { NewIdeaDialog } from './new-idea-dialog';
import { Client, Idea } from '@/types';

interface IdeasPageHeaderProps {
  clients: Client[];
  statusCounts: {
    newIdeas: number;
    needsReview: number;
    approved: number;
    done: number;
  };
  onIdeaCreated?: (idea: Idea) => void;
}

export function IdeasPageHeader({ clients, statusCounts, onIdeaCreated }: IdeasPageHeaderProps) {
  const [newIdeaOpen, setNewIdeaOpen] = useState(false);
  const router = useRouter();

  const handleIdeaCreated = (idea: Idea) => {
    onIdeaCreated?.(idea);
    // Use router.refresh() to revalidate server data instead of full page reload
    // This properly invalidates the Next.js cache and fetches fresh data
    router.refresh();
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Ideas Bank</h1>
          <p className="text-zinc-400">
            {statusCounts.newIdeas} new • {statusCounts.needsReview} pending review • {statusCounts.approved} approved • {statusCounts.done} done
          </p>
        </div>
        <Button className="gap-2" onClick={() => setNewIdeaOpen(true)}>
          <Plus className="w-4 h-4" />
          New Idea
        </Button>
      </div>

      <NewIdeaDialog
        open={newIdeaOpen}
        onOpenChange={setNewIdeaOpen}
        clients={clients}
        onIdeaCreated={handleIdeaCreated}
      />
    </>
  );
}
