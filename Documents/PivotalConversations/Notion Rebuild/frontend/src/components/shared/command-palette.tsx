'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Layers,
  CheckSquare,
  Lightbulb,
  Search,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  title: string;
  type: 'client' | 'content' | 'task' | 'idea';
  subtitle?: string;
  status?: string;
  url: string;
}

const typeIcons = {
  client: Users,
  content: Layers,
  task: CheckSquare,
  idea: Lightbulb,
};

const typeColors = {
  client: 'text-blue-500',
  content: 'text-green-500',
  task: 'text-yellow-500',
  idea: 'text-purple-500',
};

const statusColors: Record<string, string> = {
  Active: 'bg-green-500/10 text-green-500',
  Onboarding: 'bg-blue-500/10 text-blue-500',
  Paused: 'bg-yellow-500/10 text-yellow-500',
  Churned: 'bg-red-500/10 text-red-500',
  'To Do': 'bg-zinc-500/10 text-zinc-400',
  'In Progress': 'bg-blue-500/10 text-blue-500',
  Complete: 'bg-green-500/10 text-green-500',
  New: 'bg-blue-500/10 text-blue-500',
  Approved: 'bg-green-500/10 text-green-500',
  Used: 'bg-zinc-500/10 text-zinc-400',
  Rejected: 'bg-red-500/10 text-red-500',
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Keyboard shortcut to open (Cmd/Ctrl + K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Search when query changes
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.results);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300); // Debounce

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const handleSelect = useCallback((url: string) => {
    setOpen(false);
    setQuery('');
    router.push(url);
  }, [router]);

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const typeLabels: Record<string, string> = {
    client: 'Clients',
    content: 'Content',
    task: 'Tasks',
    idea: 'Ideas',
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 hover:text-white transition-colors"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-zinc-900 border border-zinc-700 rounded">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Command Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command className="bg-zinc-900 border-zinc-800">
          <CommandInput
            placeholder="Search clients, content, tasks, ideas..."
            value={query}
            onValueChange={setQuery}
            className="border-b border-zinc-800"
          />
          <CommandList className="max-h-[400px]">
            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
              </div>
            )}

            {!isLoading && query.length >= 2 && results.length === 0 && (
              <CommandEmpty className="py-6 text-center text-zinc-500">
                No results found for &quot;{query}&quot;
              </CommandEmpty>
            )}

            {!isLoading && query.length < 2 && (
              <div className="py-6 text-center text-zinc-500 text-sm">
                Type at least 2 characters to search
              </div>
            )}

            {!isLoading &&
              Object.entries(groupedResults).map(([type, items]) => (
                <CommandGroup
                  key={type}
                  heading={typeLabels[type]}
                  className="px-2"
                >
                  {items.map((result) => {
                    const Icon = typeIcons[result.type];
                    return (
                      <CommandItem
                        key={result.id}
                        value={result.title}
                        onSelect={() => handleSelect(result.url)}
                        className="flex items-center gap-3 p-2 cursor-pointer rounded-lg hover:bg-zinc-800"
                      >
                        <div className={cn('p-1.5 rounded', `bg-zinc-800`)}>
                          <Icon className={cn('w-4 h-4', typeColors[result.type])} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {result.title}
                          </p>
                          {result.subtitle && (
                            <p className="text-xs text-zinc-500 truncate">
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                        {result.status && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs shrink-0',
                              statusColors[result.status] || 'bg-zinc-500/10 text-zinc-400'
                            )}
                          >
                            {result.status}
                          </Badge>
                        )}
                        <ArrowRight className="w-4 h-4 text-zinc-600" />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
