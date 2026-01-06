'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Client } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, Layers, Lightbulb, CheckSquare, Loader2, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clientStatusColors } from '@/lib/ui-constants';
import { PortalLink } from '@/components/clients/portal-link';
import { toast } from 'sonner';

interface ClientsListViewProps {
  activeClients: Client[];
  otherClients: Client[];
}

export function ClientsListView({ activeClients, otherClients }: ClientsListViewProps) {
  const router = useRouter();
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const allClients = [...activeClients, ...otherClients];

  const toggleSelection = (clientId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(allClients.map(c => c.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/clients', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete clients');
      }

      const result = await response.json();
      toast.success(`Deleted ${result.deleted} client${result.deleted !== 1 ? 's' : ''}`);

      setDeleteConfirmOpen(false);
      setSelectedIds(new Set());
      setSelectMode(false);
      router.refresh();
    } catch (error) {
      toast.error('Failed to delete clients');
      console.error('Error deleting clients:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderClientCard = (client: Client, isOther: boolean = false) => {
    const isSelected = selectedIds.has(client.id);

    if (selectMode) {
      return (
        <Card
          key={client.id}
          className={cn(
            "bg-zinc-900 border-zinc-800 transition-colors cursor-pointer",
            isSelected && "ring-2 ring-blue-500",
            isOther && "opacity-75"
          )}
          onClick={() => toggleSelection(client.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleSelection(client.id)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white">{client.name}</h3>
                    {client.packageName && (
                      <p className="text-sm text-zinc-500">{client.packageName}</p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn('text-xs', clientStatusColors[client.status])}
                  >
                    {client.status}
                  </Badge>
                </div>
                {!isOther && (
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Layers className="w-4 h-4" />
                      <span className="text-sm">{client.totalContent}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Lightbulb className="w-4 h-4" />
                      <span className="text-sm">{client.totalIdeas}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <CheckSquare className="w-4 h-4" />
                      <span className="text-sm">{client.totalTasks}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Link key={client.id} href={`/clients/${client.id}`}>
        <Card className={cn(
          "bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer",
          isOther && "opacity-75"
        )}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-white">{client.name}</h3>
                {client.packageName && (
                  <p className="text-sm text-zinc-500">{client.packageName}</p>
                )}
              </div>
              <Badge
                variant="outline"
                className={cn('text-xs', clientStatusColors[client.status])}
              >
                {client.status}
              </Badge>
            </div>

            {!isOther && (
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Layers className="w-4 h-4" />
                    <span className="text-sm">{client.totalContent}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Lightbulb className="w-4 h-4" />
                    <span className="text-sm">{client.totalIdeas}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <CheckSquare className="w-4 h-4" />
                    <span className="text-sm">{client.totalTasks}</span>
                  </div>
                </div>
                <PortalLink clientName={client.name} />
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    );
  };

  return (
    <>
      {/* Select Mode Controls */}
      <div className="flex items-center justify-between mb-4">
        {selectMode ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exitSelectMode}
              className="border-zinc-700 text-zinc-300"
            >
              <X className="w-4 h-4 mr-1" />
              Exit Select
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="border-zinc-700 text-zinc-300"
            >
              Select All
            </Button>
            {selectedIds.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                className="border-zinc-700 text-zinc-300"
              >
                Clear ({selectedIds.size})
              </Button>
            )}
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectMode(true)}
            className="border-zinc-700 text-zinc-300"
          >
            Select
          </Button>
        )}

        {selectMode && selectedIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteConfirmOpen(true)}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Active Clients */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Active Clients</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeClients.map((client) => renderClientCard(client))}
        </div>
      </div>

      {/* Other Clients */}
      {otherClients.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-white mb-4">Other Clients</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherClients.map((client) => renderClientCard(client, true))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Clients</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete {selectedIds.size} client{selectedIds.size !== 1 ? 's' : ''}?
              This will archive them and remove them from the list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-zinc-300" disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
