'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Calendar,
  SmilePlus,
  Meh,
  Frown,
  Trash2,
  Star,
  Activity,
  Wand2,
} from 'lucide-react';
import type { TeamCheckinReport, DailyCheckin } from '@/types';

export function TeamReportDashboard() {
  const [report, setReport] = useState<TeamCheckinReport | null>(null);
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [expandedCheckin, setExpandedCheckin] = useState<string | null>(null);

  useEffect(() => {
    fetchReport(false);
    fetchCheckins();
  }, [startDate, endDate]);

  const fetchReport = async (withInsights: boolean) => {
    if (withInsights) {
      setGeneratingInsights(true);
    } else {
      setLoading(true);
    }

    try {
      const url = `/api/checkins/report?startDate=${startDate}&endDate=${endDate}${withInsights ? '&insights=true' : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      setReport(data.report || null);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
      setGeneratingInsights(false);
    }
  };

  const fetchCheckins = async () => {
    try {
      const response = await fetch(`/api/checkins?startDate=${startDate}&endDate=${endDate}`);
      const data = await response.json();
      setCheckins(data.checkins || []);
    } catch (error) {
      console.error('Error fetching check-ins:', error);
    }
  };

  const handleDelete = async (checkinId: string) => {
    if (!confirm('Are you sure you want to delete this check-in?')) return;

    setDeletingId(checkinId);
    try {
      const response = await fetch(`/api/checkins?id=${checkinId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh data
        fetchCheckins();
        fetchReport(false);
      } else {
        alert('Failed to delete check-in');
      }
    } catch (error) {
      console.error('Error deleting check-in:', error);
      alert('Failed to delete check-in');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAnalyze = async (checkinId: string) => {
    setAnalyzingId(checkinId);
    try {
      const response = await fetch('/api/checkins/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkinId }),
      });

      if (response.ok) {
        // Refresh data to show updated scores
        fetchCheckins();
        fetchReport(false);
      } else {
        alert('Failed to analyze check-in');
      }
    } catch (error) {
      console.error('Error analyzing check-in:', error);
      alert('Failed to analyze check-in');
    } finally {
      setAnalyzingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPulseIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <SmilePlus className="w-4 h-4 text-green-400" />;
      case 'negative': return <Frown className="w-4 h-4 text-red-400" />;
      default: return <Meh className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getPulseLabel = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'High';
      case 'negative': return 'Low';
      default: return 'Neutral';
    }
  };

  const getCompletionColor = (rate: number) => {
    if (rate >= 80) return 'text-green-400';
    if (rate >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getQualityColor = (score: number) => {
    if (score >= 8) return 'text-green-400';
    if (score >= 5) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Calculate overall pulse from sentiment breakdown
  const getOverallPulse = () => {
    if (!report) return { label: 'N/A', color: 'text-zinc-400' };
    const { positive, neutral, negative } = report.sentimentBreakdown;
    const total = positive + neutral + negative;
    if (total === 0) return { label: 'N/A', color: 'text-zinc-400' };

    const positiveRatio = positive / total;
    const negativeRatio = negative / total;

    if (positiveRatio >= 0.6) return { label: 'High', color: 'text-green-400' };
    if (negativeRatio >= 0.4) return { label: 'Low', color: 'text-red-400' };
    return { label: 'Neutral', color: 'text-yellow-400' };
  };

  if (loading && !report) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  const overallPulse = getOverallPulse();

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-400">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white w-40"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white w-40"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => fetchReport(false)}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          {/* 3 Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Completion Rate */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Completion Rate</p>
                    <p className={`text-3xl font-bold ${getCompletionColor(report.completionRate)}`}>
                      {report.completionRate}%
                    </p>
                    <p className="text-xs text-zinc-500">
                      {report.totalCheckins} check-ins submitted
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quality */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Star className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Quality</p>
                    <p className={`text-3xl font-bold ${getQualityColor(report.avgQualityScore)}`}>
                      {report.avgQualityScore.toFixed(1)}/10
                    </p>
                    <p className="text-xs text-zinc-500">
                      AI-assessed response quality
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pulse (Sentiment) */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Team Pulse</p>
                    <p className={`text-3xl font-bold ${overallPulse.color}`}>
                      {overallPulse.label}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {report.sentimentBreakdown.positive} positive, {report.sentimentBreakdown.neutral} neutral, {report.sentimentBreakdown.negative} negative
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  AI Insights
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Justification for Completion Rate, Quality, and Pulse metrics
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => fetchReport(true)}
                disabled={generatingInsights}
              >
                {generatingInsights ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Insights
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              {report.aiInsights ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <p className="text-zinc-300 whitespace-pre-wrap">{report.aiInsights}</p>
                </div>
              ) : (
                <p className="text-zinc-500 text-center py-4">
                  Click "Generate Insights" to get AI analysis of the 3 key metrics
                </p>
              )}
            </CardContent>
          </Card>

          {/* Team Member Check-ins */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Team Check-in Responses</CardTitle>
              <CardDescription className="text-zinc-400">
                View full responses from each team member
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.byMember.map(member => {
                const memberCheckins = checkins.filter(c => c.teamMemberId === member.memberId);

                return (
                  <Collapsible
                    key={member.memberId}
                    open={expandedMember === member.memberId}
                    onOpenChange={() => setExpandedMember(
                      expandedMember === member.memberId ? null : member.memberId
                    )}
                  >
                    <div className="border border-zinc-800 rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50"
                        >
                          <div className="flex items-center gap-3">
                            {expandedMember === member.memberId ? (
                              <ChevronDown className="w-4 h-4 text-zinc-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-zinc-400" />
                            )}
                            <span className="text-white font-medium">{member.memberName}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-zinc-400">
                              {member.checkins} check-ins
                            </Badge>
                            {member.avgQuality > 0 && (
                              <Badge variant="outline" className={getQualityColor(member.avgQuality)}>
                                Quality: {member.avgQuality.toFixed(1)}/10
                              </Badge>
                            )}
                            <div className="flex items-center gap-1">
                              {getPulseIcon(member.sentiment)}
                              <span className="text-xs text-zinc-400">{getPulseLabel(member.sentiment)}</span>
                            </div>
                          </div>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 space-y-4 border-t border-zinc-800 pt-4">
                          {memberCheckins.length === 0 ? (
                            <p className="text-zinc-500 text-sm">No check-ins in this period</p>
                          ) : (
                            memberCheckins.map(checkin => (
                              <Collapsible
                                key={checkin.id}
                                open={expandedCheckin === checkin.id}
                                onOpenChange={() => setExpandedCheckin(
                                  expandedCheckin === checkin.id ? null : checkin.id
                                )}
                              >
                                <div className="bg-zinc-800/50 rounded-lg overflow-hidden">
                                  <CollapsibleTrigger asChild>
                                    <div className="p-3 cursor-pointer hover:bg-zinc-800/70 transition-colors">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          {expandedCheckin === checkin.id ? (
                                            <ChevronDown className="w-3 h-3 text-zinc-500" />
                                          ) : (
                                            <ChevronRight className="w-3 h-3 text-zinc-500" />
                                          )}
                                          <Calendar className="w-3 h-3 text-zinc-500" />
                                          <span className="text-sm text-zinc-400">
                                            {formatDate(checkin.date)}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {checkin.qualityScore ? (
                                            <Badge variant="outline" className={`text-xs ${getQualityColor(checkin.qualityScore)}`}>
                                              {checkin.qualityScore}/10
                                            </Badge>
                                          ) : (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleAnalyze(checkin.id);
                                              }}
                                              disabled={analyzingId === checkin.id}
                                              className="h-6 px-2 text-xs text-purple-400 hover:text-purple-300"
                                            >
                                              {analyzingId === checkin.id ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                              ) : (
                                                <>
                                                  <Wand2 className="w-3 h-3 mr-1" />
                                                  Analyze
                                                </>
                                              )}
                                            </Button>
                                          )}
                                          {checkin.sentiment && (
                                            <div className="flex items-center gap-1">
                                              {getPulseIcon(checkin.sentiment)}
                                            </div>
                                          )}
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDelete(checkin.id);
                                            }}
                                            disabled={deletingId === checkin.id}
                                            className="h-6 w-6 p-0 text-zinc-500 hover:text-red-400"
                                          >
                                            {deletingId === checkin.id ? (
                                              <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                              <Trash2 className="w-3 h-3" />
                                            )}
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="px-3 pb-3 space-y-3 border-t border-zinc-700 pt-3">
                                      {/* Outcomes Today */}
                                      {checkin.outcomesToday && (
                                        <div>
                                          <p className="text-xs text-zinc-500 mb-1">Outcomes Today</p>
                                          <p className="text-sm text-zinc-300">{checkin.outcomesToday}</p>
                                        </div>
                                      )}

                                      {/* Challenges */}
                                      {checkin.challenges && (
                                        <div>
                                          <p className="text-xs text-zinc-500 mb-1">Challenges</p>
                                          <p className="text-sm text-zinc-300">{checkin.challenges}</p>
                                        </div>
                                      )}

                                      {/* Learnings */}
                                      {checkin.learnings && (
                                        <div>
                                          <p className="text-xs text-zinc-500 mb-1">Learnings</p>
                                          <p className="text-sm text-zinc-300">{checkin.learnings}</p>
                                        </div>
                                      )}

                                      {/* Next Day Outcomes */}
                                      {checkin.nextDayOutcomes && (
                                        <div>
                                          <p className="text-xs text-zinc-500 mb-1">Next Day Outcomes</p>
                                          <p className="text-sm text-zinc-300">{checkin.nextDayOutcomes}</p>
                                        </div>
                                      )}

                                      {/* AI Summary */}
                                      {checkin.aiSummary && (
                                        <div className="pt-2 border-t border-zinc-700">
                                          <p className="text-xs text-purple-400 mb-1 flex items-center gap-1">
                                            <Sparkles className="w-3 h-3" />
                                            AI Summary
                                          </p>
                                          <p className="text-sm text-zinc-400 italic">{checkin.aiSummary}</p>
                                        </div>
                                      )}
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            ))
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
