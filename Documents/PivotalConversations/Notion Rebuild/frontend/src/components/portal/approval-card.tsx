'use client';

import { useState } from 'react';
import { Content } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  CheckCircle2,
  MessageSquare,
  Video,
  Youtube,
  Mic,
  Loader2,
  ExternalLink,
  ChevronDown,
  Calendar,
  User,
  Link2,
  FileText,
  ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const contentTypeIcons = {
  'Short Form': Video,
  'YouTube': Youtube,
  'Podcast': Mic,
};

const contentTypeColors = {
  'Short Form': 'bg-blue-500/10 text-blue-500',
  'YouTube': 'bg-red-500/10 text-red-500',
  'Podcast': 'bg-purple-500/10 text-purple-500',
};

interface ApprovalCardProps {
  content: Content;
  onApprove: (id: string) => void;
  onRequestChanges: (id: string) => void;
  isProcessing: boolean;
}

export function ApprovalCard({ content, onApprove, onRequestChanges, isProcessing }: ApprovalCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = contentTypeIcons[content.contentType] || Video;

  return (
    <>
      <Card className="bg-zinc-900 border-zinc-800">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CardContent className="p-4">
            <CollapsibleTrigger asChild>
              <div className="flex items-start gap-4 cursor-pointer group">
                {/* Content Type Icon */}
                <div className={cn('p-2 rounded-lg flex-shrink-0', contentTypeColors[content.contentType] || 'bg-zinc-500/10 text-zinc-500')}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white truncate flex-1">{content.title}</h3>
                    <ChevronDown className={cn(
                      'w-4 h-4 text-zinc-500 transition-transform',
                      isExpanded && 'rotate-180'
                    )} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                      Awaiting Your Review
                    </Badge>
                    <Badge variant="outline" className={cn("text-xs", contentTypeColors[content.contentType] || 'bg-zinc-500/10 text-zinc-500')}>
                      {content.contentType}
                    </Badge>
                    {content.scheduledDate && (
                      <span className="text-xs text-zinc-500">
                        Scheduled: {new Date(content.scheduledDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {/* Show description preview when collapsed */}
                  {!isExpanded && content.description && (
                    <p className="text-sm text-zinc-400 mt-2 line-clamp-2">
                      {content.description}
                    </p>
                  )}
                </div>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="mt-4 pt-4 border-t border-zinc-800 space-y-3">
                {/* Description */}
                {content.description && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-zinc-500" />
                      <span className="text-sm text-zinc-400">Description:</span>
                    </div>
                    <p className="text-sm text-zinc-300 pl-6 whitespace-pre-wrap">{content.description}</p>
                  </div>
                )}

                {/* Thumbnail Links */}
                {content.thumbnails && content.thumbnails.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-zinc-500" />
                      <span className="text-sm text-zinc-400">
                        Thumbnail{content.thumbnails.length > 1 ? 's' : ''}:
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 pl-6">
                      {content.thumbnails.map((thumb, index) => (
                        <a
                          key={index}
                          href={thumb}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors border border-purple-500/20"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          Thumbnail {index + 1}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scheduled Date */}
                {content.scheduledDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm text-zinc-400">Scheduled:</span>
                    <span className="text-sm text-white">
                      {new Date(content.scheduledDate).toLocaleDateString('en-AU', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}

                {/* Assigned Editor */}
                {content.assignedEditor && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm text-zinc-400">Editor:</span>
                    <span className="text-sm text-white">{content.assignedEditor.name}</span>
                  </div>
                )}

                {/* Assigned Strategist */}
                {content.assignedStrategist && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm text-zinc-400">Strategist:</span>
                    <span className="text-sm text-white">{content.assignedStrategist}</span>
                  </div>
                )}

                {/* Title Options */}
                {content.titleOptions && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-zinc-500" />
                      <span className="text-sm text-zinc-400">Title Options:</span>
                    </div>
                    <p className="text-sm text-zinc-300 pl-6 whitespace-pre-wrap">{content.titleOptions}</p>
                  </div>
                )}

                {/* Copy/Caption */}
                {content.copy && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-zinc-500" />
                      <span className="text-sm text-zinc-400">Copy/Caption:</span>
                    </div>
                    <p className="text-sm text-zinc-300 pl-6 whitespace-pre-wrap">{content.copy}</p>
                  </div>
                )}

                {/* Links Section */}
                {(content.frameIoLink || content.driveLink || content.briefUrl) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-zinc-500" />
                      <span className="text-sm text-zinc-400">Links:</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pl-6">
                      {content.frameIoLink && (
                        <a
                          href={content.frameIoLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Frame.io Review
                        </a>
                      )}
                      {content.driveLink && (
                        <a
                          href={content.driveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Drive Link
                        </a>
                      )}
                      {content.briefUrl && (
                        <a
                          href={content.briefUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Brief
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Internal Notes (if any) */}
                {content.internalNotes && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-zinc-500" />
                      <span className="text-sm text-zinc-400">Notes:</span>
                    </div>
                    <p className="text-sm text-zinc-300 pl-6 whitespace-pre-wrap">{content.internalNotes}</p>
                  </div>
                )}

                {/* Previous Client Feedback (if any) */}
                {content.clientFeedback && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-yellow-400">Previous Feedback:</span>
                    </div>
                    <p className="text-sm text-zinc-300 pl-6 whitespace-pre-wrap">{content.clientFeedback}</p>
                  </div>
                )}
              </div>
            </CollapsibleContent>

            {/* Quick preview link when collapsed */}
            {!isExpanded && (content.frameIoLink || content.driveLink) && (
              <a
                href={content.frameIoLink || content.driveLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-2"
              >
                <ExternalLink className="w-3 h-3" />
                Preview Content
              </a>
            )}

            <div className="flex items-center gap-2 mt-4">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove(content.id);
                }}
                disabled={isProcessing}
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Approve
              </Button>
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestChanges(content.id);
                }}
                disabled={isProcessing}
                className="flex-1 gap-2 border-zinc-700 text-zinc-300"
              >
                <MessageSquare className="w-4 h-4" />
                Request Changes
              </Button>
            </div>
          </CardContent>
        </Collapsible>
      </Card>
    </>
  );
}
