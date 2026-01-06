'use client';

import { useState, useMemo } from 'react';
import { BrainDocument, Client } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  Brain,
  Plus,
  Search,
  FileText,
  Link as LinkIcon,
  File,
  Trash2,
  ExternalLink,
  Loader2,
  Tag,
  Palette,
  BookOpen,
  Target,
  Users,
  Scissors,
  Filter,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface BrainViewProps {
  documents: BrainDocument[];
  clients: Client[];
}

const DOCUMENT_TYPES = [
  'Brand Guidelines',
  'Voice & Tone',
  'Content Strategy',
  'Reference Material',
  'Script Template',
  'Editing Style',
  'Visual Guidelines',
  'Competitor Analysis',
  'Audience Research',
  'Other',
] as const;

const docTypeIcons: Record<string, typeof FileText> = {
  'Brand Guidelines': Palette,
  'Voice & Tone': BookOpen,
  'Content Strategy': Target,
  'Reference Material': FileText,
  'Script Template': FileText,
  'Editing Style': Scissors,
  'Visual Guidelines': Palette,
  'Competitor Analysis': Target,
  'Audience Research': Users,
  'Other': FileText,
};

const docTypeColors: Record<string, string> = {
  'Brand Guidelines': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  'Voice & Tone': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  'Content Strategy': 'bg-green-500/10 text-green-400 border-green-500/30',
  'Reference Material': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
  'Script Template': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  'Editing Style': 'bg-pink-500/10 text-pink-400 border-pink-500/30',
  'Visual Guidelines': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  'Competitor Analysis': 'bg-red-500/10 text-red-400 border-red-500/30',
  'Audience Research': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  'Other': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
};

interface CreateDocDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  onDocCreated: (doc: BrainDocument) => void;
}

function CreateDocDialog({ open, onOpenChange, clients, onDocCreated }: CreateDocDialogProps) {
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [documentType, setDocumentType] = useState<string>('Reference Material');
  const [url, setUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !clientId) return;

    setIsCreating(true);
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

      const response = await fetch('/api/brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          clientId,
          documentType,
          url: url || undefined,
          fileUrl: fileUrl || undefined,
          summary: summary || undefined,
          tags: tags.length > 0 ? tags : undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to create document');

      const newDoc = await response.json();
      toast.success('Document added to Brain');
      onDocCreated(newDoc);
      onOpenChange(false);
      // Reset form
      setName('');
      setClientId('');
      setUrl('');
      setFileUrl('');
      setSummary('');
      setTagsInput('');
    } catch (error) {
      toast.error('Failed to create document');
      console.error('Error creating document:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Add to Knowledge Base
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-zinc-300">Document Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Brand Voice Guide"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Client *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Document Type</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Link URL</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">File URL (Google Drive, etc.)</Label>
            <Input
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Summary</Label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief description of this document..."
              className="bg-zinc-800 border-zinc-700 text-white min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Tags (comma-separated)</Label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g., branding, social, reference"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-zinc-700">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || !clientId || isCreating} className="gap-2">
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isCreating ? 'Adding...' : 'Add Document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BrainView({ documents: initialDocuments, clients }: BrainViewProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Get client name helper
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown Client';
  };

  // Filter documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Client filter
      if (selectedClientId !== 'all' && doc.clientId !== selectedClientId) return false;
      // Type filter
      if (selectedType !== 'all' && doc.documentType !== selectedType) return false;
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = doc.name.toLowerCase().includes(query);
        const matchesSummary = doc.summary?.toLowerCase().includes(query);
        const matchesTags = doc.tags.some(tag => tag.toLowerCase().includes(query));
        if (!matchesName && !matchesSummary && !matchesTags) return false;
      }
      return true;
    });
  }, [documents, selectedClientId, selectedType, searchQuery]);

  // Group by client for better organization
  const documentsByClient = useMemo(() => {
    const grouped: Record<string, BrainDocument[]> = {};
    filteredDocuments.forEach(doc => {
      const clientName = getClientName(doc.clientId);
      if (!grouped[clientName]) grouped[clientName] = [];
      grouped[clientName].push(doc);
    });
    return grouped;
  }, [filteredDocuments, clients]);

  // Get counts by type
  const countsByType = useMemo(() => {
    const counts: Record<string, number> = { all: documents.length };
    documents.forEach(doc => {
      counts[doc.documentType] = (counts[doc.documentType] || 0) + 1;
    });
    return counts;
  }, [documents]);

  const handleDocCreated = (newDoc: BrainDocument) => {
    setDocuments(prev => [newDoc, ...prev]);
  };

  const handleDelete = async (docId: string) => {
    setDeletingId(docId);
    try {
      const response = await fetch(`/api/brain/${docId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      setDocuments(prev => prev.filter(d => d.id !== docId));
      toast.success('Document removed from Brain');
    } catch (error) {
      toast.error('Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Brain className="w-7 h-7" />
              Knowledge Base
            </h1>
            <p className="text-zinc-400">Client documents, brand guidelines, and reference materials</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Document
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-white">{documents.length}</p>
              <p className="text-sm text-zinc-400">Total Documents</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-purple-400">{countsByType['Brand Guidelines'] || 0}</p>
              <p className="text-sm text-zinc-400">Brand Guidelines</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-blue-400">{countsByType['Voice & Tone'] || 0}</p>
              <p className="text-sm text-zinc-400">Voice & Tone</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-green-400">{countsByType['Content Strategy'] || 0}</p>
              <p className="text-sm text-zinc-400">Content Strategy</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-zinc-400">{countsByType['Reference Material'] || 0}</p>
              <p className="text-sm text-zinc-400">Reference Material</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="pl-10 bg-zinc-900 border-zinc-800 text-white"
            />
          </div>

          {/* Client Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800 text-white">
                <SelectValue placeholder="All clients" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type Filter */}
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800 text-white">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="all">All Types</SelectItem>
              {DOCUMENT_TYPES.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {(selectedClientId !== 'all' || selectedType !== 'all' || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedClientId('all');
                setSelectedType('all');
                setSearchQuery('');
              }}
              className="text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Results count */}
        <p className="text-sm text-zinc-500">
          Showing {filteredDocuments.length} of {documents.length} documents
        </p>

        {/* Documents Grid */}
        {filteredDocuments.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-12 text-center">
              <Brain className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400 mb-4">
                {documents.length === 0
                  ? 'No documents in the Knowledge Base yet'
                  : 'No documents match your filters'}
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Add First Document
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(documentsByClient).map(([clientName, docs]) => (
              <Card key={clientName} className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-zinc-400" />
                    {clientName}
                    <Badge variant="outline" className="text-xs text-zinc-400">
                      {docs.length} {docs.length === 1 ? 'doc' : 'docs'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {docs.map(doc => {
                      const DocIcon = docTypeIcons[doc.documentType] || FileText;
                      const colorClass = docTypeColors[doc.documentType] || docTypeColors['Other'];

                      return (
                        <div
                          key={doc.id}
                          className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600 transition-colors group"
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn('p-2 rounded-lg', colorClass.split(' ')[0])}>
                              <DocIcon className={cn('w-4 h-4', colorClass.split(' ')[1])} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-medium text-white truncate">{doc.name}</p>
                              </div>
                              <Badge variant="outline" className={cn('text-xs mb-2', colorClass)}>
                                {doc.documentType}
                              </Badge>
                              {doc.summary && (
                                <p className="text-xs text-zinc-500 line-clamp-2 mb-2">{doc.summary}</p>
                              )}
                              {doc.tags.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap mb-2">
                                  {doc.tags.slice(0, 3).map(tag => (
                                    <span key={tag} className="inline-flex items-center gap-1 text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                                      <Tag className="w-2.5 h-2.5" />
                                      {tag}
                                    </span>
                                  ))}
                                  {doc.tags.length > 3 && (
                                    <span className="text-xs text-zinc-500">+{doc.tags.length - 3}</span>
                                  )}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-700">
                                {doc.url && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                    className="h-7 px-2 text-zinc-400 hover:text-white"
                                  >
                                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                      <LinkIcon className="w-3 h-3 mr-1" />
                                      Link
                                    </a>
                                  </Button>
                                )}
                                {doc.fileUrl && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                    className="h-7 px-2 text-zinc-400 hover:text-white"
                                  >
                                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                      <File className="w-3 h-3 mr-1" />
                                      File
                                    </a>
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(doc.id)}
                                  disabled={deletingId === doc.id}
                                  className="h-7 px-2 text-zinc-400 hover:text-red-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  {deletingId === doc.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateDocDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        clients={clients}
        onDocCreated={handleDocCreated}
      />
    </>
  );
}
