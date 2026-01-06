'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Client, Content, Idea, Package } from '@/types';

interface PortalData {
  client: Client;
  content: Content[];
  ideas: Idea[];
  contentBankClientId: string | null;
  clientPackage: Package | null;
}

interface PortalContextType {
  data: PortalData | null;
  isLoading: boolean;
  refreshContent: () => Promise<void>;
  refreshIdeas: () => Promise<void>;
  refreshAll: () => Promise<void>;
  updateContentLocally: (updatedContent: Content) => void;
  updateIdeaLocally: (updatedIdea: Idea) => void;
  addIdeaLocally: (newIdea: Idea) => void;
  removeIdeaLocally: (ideaId: string) => void;
}

const PortalContext = createContext<PortalContextType | null>(null);

interface PortalProviderProps {
  children: ReactNode;
  initialData: PortalData;
}

export function PortalProvider({ children, initialData }: PortalProviderProps) {
  const [data, setData] = useState<PortalData>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const refreshContent = useCallback(async () => {
    if (!data?.client?.id) return;

    try {
      const response = await fetch(`/api/portal/content?clientId=${data.client.id}`);
      if (response.ok) {
        const newContent = await response.json();
        setData(prev => prev ? { ...prev, content: newContent } : prev);
      }
    } catch (error) {
      console.error('Failed to refresh content:', error);
    }
  }, [data?.client?.id]);

  const refreshIdeas = useCallback(async () => {
    if (!data?.client?.name) return;

    try {
      const response = await fetch(`/api/portal/ideas?clientName=${encodeURIComponent(data.client.name)}`);
      if (response.ok) {
        const newIdeas = await response.json();
        setData(prev => prev ? { ...prev, ideas: newIdeas } : prev);
      }
    } catch (error) {
      console.error('Failed to refresh ideas:', error);
    }
  }, [data?.client?.name]);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([refreshContent(), refreshIdeas()]);
    setIsLoading(false);
  }, [refreshContent, refreshIdeas]);

  // Optimistic update for content
  const updateContentLocally = useCallback((updatedContent: Content) => {
    setData(prev => {
      if (!prev) return prev;
      const newContent = prev.content.map(c =>
        c.id === updatedContent.id ? updatedContent : c
      );
      return { ...prev, content: newContent };
    });
  }, []);

  // Optimistic update for ideas
  const updateIdeaLocally = useCallback((updatedIdea: Idea) => {
    setData(prev => {
      if (!prev) return prev;
      const newIdeas = prev.ideas.map(i =>
        i.id === updatedIdea.id ? updatedIdea : i
      );
      return { ...prev, ideas: newIdeas };
    });
  }, []);

  // Add new idea locally (optimistic)
  const addIdeaLocally = useCallback((newIdea: Idea) => {
    setData(prev => {
      if (!prev) return prev;
      return { ...prev, ideas: [newIdea, ...prev.ideas] };
    });
  }, []);

  // Remove idea locally (optimistic)
  const removeIdeaLocally = useCallback((ideaId: string) => {
    setData(prev => {
      if (!prev) return prev;
      return { ...prev, ideas: prev.ideas.filter(i => i.id !== ideaId) };
    });
  }, []);

  return (
    <PortalContext.Provider
      value={{
        data,
        isLoading,
        refreshContent,
        refreshIdeas,
        refreshAll,
        updateContentLocally,
        updateIdeaLocally,
        addIdeaLocally,
        removeIdeaLocally,
      }}
    >
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error('usePortal must be used within a PortalProvider');
  }
  return context;
}
