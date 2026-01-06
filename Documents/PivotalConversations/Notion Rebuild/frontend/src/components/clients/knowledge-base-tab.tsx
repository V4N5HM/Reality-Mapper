'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Brain,
  ChevronDown,
  ChevronRight,
  User,
  Building,
  Globe,
  FileText,
  Video,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface KnowledgeBaseSection {
  heading: string;
  content: {
    type: 'json' | 'text' | 'paragraph';
    content: string;
    language?: string;
  }[];
}

interface ClientKnowledgeBase {
  id: string;
  clientName: string;
  status: string;
  lastUpdated?: string;
  sections: KnowledgeBaseSection[];
  rawData?: Record<string, any>;
}

interface KnowledgeBaseTabProps {
  clientId: string;
  clientName: string;
}

export function KnowledgeBaseTab({ clientId, clientName }: KnowledgeBaseTabProps) {
  const [knowledgeBase, setKnowledgeBase] = useState<ClientKnowledgeBase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Client Brain Data', 'Dos and Donts']));

  const fetchKnowledgeBase = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/clients/${clientId}/knowledge-base`);
      if (!response.ok) throw new Error('Failed to fetch knowledge base');

      const data = await response.json();
      if (data.found && data.knowledgeBase) {
        setKnowledgeBase(data.knowledgeBase);
      } else {
        setKnowledgeBase(null);
      }
    } catch (err) {
      setError('Failed to load knowledge base');
      console.error('Error fetching knowledge base:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledgeBase();
  }, [clientId]);

  const toggleSection = (heading: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(heading)) {
        next.delete(heading);
      } else {
        next.add(heading);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
          <p className="text-zinc-400 mb-4">{error}</p>
          <Button variant="outline" onClick={fetchKnowledgeBase} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!knowledgeBase) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Brain className="w-12 h-12 text-zinc-600 mb-4" />
          <p className="text-zinc-400 text-center mb-2">
            No Knowledge Base found for {clientName}
          </p>
          <p className="text-zinc-500 text-sm text-center">
            Knowledge Base entries are matched by client name from Notion
          </p>
        </CardContent>
      </Card>
    );
  }

  // Parse client brain data if available
  let clientData: Record<string, any> | null = null;
  const brainDataSection = knowledgeBase.sections.find(s => s.heading === 'Client Brain Data');
  if (brainDataSection) {
    for (const block of brainDataSection.content) {
      if (block.type === 'json') {
        try {
          clientData = JSON.parse(block.content);
          break;
        } catch {
          // Not valid JSON
        }
      }
    }
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Brain className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <CardTitle className="text-lg text-white">{knowledgeBase.clientName} Knowledge Base</CardTitle>
            <p className="text-xs text-zinc-500">
              Last updated: {knowledgeBase.lastUpdated
                ? new Date(knowledgeBase.lastUpdated).toLocaleDateString()
                : 'Unknown'}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={cn(
          'text-xs',
          knowledgeBase.status === 'Active' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
          knowledgeBase.status === 'Inactive' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
          'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
        )}>
          {knowledgeBase.status}
        </Badge>
      </CardHeader>

      <CardContent className="p-0">
        {/* Quick info from client data */}
        {clientData && (
          <div className="p-4 border-b border-zinc-800">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {clientData.name && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-zinc-500" />
                  <div>
                    <p className="text-xs text-zinc-500">Name</p>
                    <p className="text-sm text-white">{clientData.name}</p>
                  </div>
                </div>
              )}
              {clientData.businessName && (
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-zinc-500" />
                  <div>
                    <p className="text-xs text-zinc-500">Business</p>
                    <p className="text-sm text-white">{clientData.businessName}</p>
                  </div>
                </div>
              )}
              {clientData.role && (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-zinc-500" />
                  <div>
                    <p className="text-xs text-zinc-500">Role</p>
                    <p className="text-sm text-white">{clientData.role}</p>
                  </div>
                </div>
              )}
              {clientData.website && (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-zinc-500" />
                  <div>
                    <p className="text-xs text-zinc-500">Website</p>
                    <a
                      href={clientData.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:underline truncate block max-w-[150px]"
                    >
                      {clientData.website.replace('https://', '')}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <ScrollArea className="h-[500px]">
          <div className="divide-y divide-zinc-800">
            {knowledgeBase.sections.map((section, idx) => {
              const isExpanded = expandedSections.has(section.heading);
              const sectionIcon = getSectionIcon(section.heading);

              return (
                <Collapsible
                  key={idx}
                  open={isExpanded}
                  onOpenChange={() => toggleSection(section.heading)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded bg-zinc-800">
                        {sectionIcon}
                      </div>
                      <span className="text-sm font-medium text-white">{section.heading}</span>
                      <Badge variant="outline" className="text-xs bg-zinc-800 text-zinc-400 border-zinc-700">
                        {section.content.length} {section.content.length === 1 ? 'item' : 'items'}
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-zinc-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-500" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-3">
                      {section.content.map((block, blockIdx) => (
                        <div
                          key={blockIdx}
                          className={cn(
                            'rounded-lg p-3',
                            block.type === 'json' ? 'bg-zinc-800 font-mono text-xs' : 'bg-zinc-800/50'
                          )}
                        >
                          {block.type === 'json' ? (
                            <pre className="text-zinc-300 whitespace-pre-wrap overflow-x-auto">
                              {formatJsonContent(block.content)}
                            </pre>
                          ) : (
                            <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                              {block.content}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function getSectionIcon(heading: string) {
  const lowerHeading = heading.toLowerCase();
  if (lowerHeading.includes('brain data') || lowerHeading.includes('client brain')) {
    return <User className="w-4 h-4 text-blue-500" />;
  }
  if (lowerHeading.includes('performing') || lowerHeading.includes('content')) {
    return <Video className="w-4 h-4 text-green-500" />;
  }
  if (lowerHeading.includes('transcript') || lowerHeading.includes('call')) {
    return <FileText className="w-4 h-4 text-yellow-500" />;
  }
  if (lowerHeading.includes('dos') || lowerHeading.includes("don't")) {
    return <AlertCircle className="w-4 h-4 text-red-500" />;
  }
  return <FileText className="w-4 h-4 text-zinc-400" />;
}

function formatJsonContent(content: string): string {
  try {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return content;
  }
}
