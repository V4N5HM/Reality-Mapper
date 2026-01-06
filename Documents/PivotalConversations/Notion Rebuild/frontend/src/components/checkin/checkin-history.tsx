'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Calendar, Loader2, Mic, Keyboard } from 'lucide-react';
import type { DailyCheckin } from '@/types';

interface CheckinHistoryProps {
  limit?: number;
}

export function CheckinHistory({ limit = 7 }: CheckinHistoryProps) {
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCheckins();
  }, [limit]);

  const fetchCheckins = async () => {
    try {
      const response = await fetch(`/api/checkins?action=recent&limit=${limit}`);
      const data = await response.json();
      setCheckins(data.checkins || []);
    } catch (error) {
      console.error('Error fetching check-ins:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-AU', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-500/20 text-green-400 border-green-400/30';
      case 'negative': return 'bg-red-500/20 text-red-400 border-red-400/30';
      default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-400/30';
    }
  };

  const getQualityColor = (score?: number) => {
    if (!score) return 'text-zinc-500';
    if (score >= 8) return 'text-green-400';
    if (score >= 5) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        </CardContent>
      </Card>
    );
  }

  if (checkins.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Check-in History</CardTitle>
          <CardDescription className="text-zinc-400">
            Your recent daily check-ins
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-500 text-center py-8">
            No check-ins yet. Complete your first check-in above!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white">Check-in History</CardTitle>
        <CardDescription className="text-zinc-400">
          Your recent daily check-ins
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {checkins.map(checkin => (
          <Collapsible
            key={checkin.id}
            open={expandedIds.has(checkin.id)}
            onOpenChange={() => toggleExpand(checkin.id)}
          >
            <div className="border border-zinc-800 rounded-lg overflow-hidden">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50"
                >
                  <div className="flex items-center gap-3">
                    {expandedIds.has(checkin.id) ? (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    )}
                    <Calendar className="w-4 h-4 text-zinc-500" />
                    <span className="text-white font-medium">
                      {formatDate(checkin.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {checkin.responseMethod === 'Speech' ? (
                      <Mic className="w-3 h-3 text-zinc-500" />
                    ) : (
                      <Keyboard className="w-3 h-3 text-zinc-500" />
                    )}
                    {checkin.qualityScore && (
                      <span className={`text-sm ${getQualityColor(checkin.qualityScore)}`}>
                        {checkin.qualityScore}/10
                      </span>
                    )}
                    {checkin.sentiment && (
                      <Badge variant="outline" className={getSentimentColor(checkin.sentiment)}>
                        {checkin.sentiment}
                      </Badge>
                    )}
                  </div>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-4 border-t border-zinc-800 pt-4">
                  {checkin.aiSummary && (
                    <div className="bg-zinc-800/50 rounded-lg p-3 mb-4">
                      <p className="text-xs text-zinc-500 mb-1">AI Summary</p>
                      <p className="text-sm text-zinc-300">{checkin.aiSummary}</p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500">Outcomes Today</p>
                    <p className="text-sm text-white whitespace-pre-wrap">
                      {checkin.outcomesToday || '-'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500">Challenges</p>
                    <p className="text-sm text-white whitespace-pre-wrap">
                      {checkin.challenges || '-'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500">Learnings</p>
                    <p className="text-sm text-white whitespace-pre-wrap">
                      {checkin.learnings || '-'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500">Next Day Outcomes</p>
                    <p className="text-sm text-white whitespace-pre-wrap">
                      {checkin.nextDayOutcomes || '-'}
                    </p>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}
