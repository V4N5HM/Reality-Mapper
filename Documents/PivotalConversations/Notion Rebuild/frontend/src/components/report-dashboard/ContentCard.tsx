'use client';

import { Overachiever, Underachiever, PodcastEpisodeAnalysis } from '@/lib/report-dashboard/dashboard-types';

interface ContentCardProps {
  type: 'overachiever' | 'underachiever' | 'worked' | 'didnt-work';
  content: Overachiever | Underachiever | PodcastEpisodeAnalysis;
  platform?: string;
}

export default function ContentCard({ type, content, platform }: ContentCardProps) {
  const isPositive = type === 'overachiever' || type === 'worked';

  const borderColor = isPositive ? 'border-l-green-500' : 'border-l-pivotal-red';

  const title = content.title;
  const transcript = content.transcript;

  // Get views/plays
  let performanceText = '';
  if ('views' in content && content.views !== undefined) {
    performanceText = `${content.views.toLocaleString('en-AU')} views`;
  }
  if ('plays' in content) {
    performanceText = `${(content as PodcastEpisodeAnalysis).plays.toLocaleString('en-AU')} plays`;
  }
  if ('retention' in content && (content as PodcastEpisodeAnalysis).retention !== undefined) {
    performanceText += ` · ${(content as PodcastEpisodeAnalysis).retention}% retention`;
  }

  // Get analysis text
  let analysisTitle = '';
  let analysisPoints: string[] = [];

  if (type === 'overachiever' && 'whyItWorked' in content) {
    analysisTitle = 'Why This Worked';
    if (Array.isArray((content as Overachiever).whyItWorked)) {
      analysisPoints = (content as Overachiever).whyItWorked;
    }
  } else if (type === 'underachiever' && 'whyItUnderperformed' in content) {
    analysisTitle = 'Why It Underperformed';
    if (Array.isArray((content as Underachiever).whyItUnderperformed)) {
      analysisPoints = (content as Underachiever).whyItUnderperformed;
    }
  } else if (type === 'worked' && 'whyItWorked' in content) {
    analysisTitle = 'Why it worked';
    const podcastContent = content as PodcastEpisodeAnalysis;
    if (typeof podcastContent.whyItWorked === 'string') {
      analysisPoints = [podcastContent.whyItWorked];
    }
  } else if (type === 'didnt-work' && 'whyItDidntWork' in content) {
    analysisTitle = "Why it didn't work";
    const podcastContent = content as PodcastEpisodeAnalysis;
    if (typeof podcastContent.whyItDidntWork === 'string') {
      analysisPoints = [podcastContent.whyItDidntWork];
    }
  }

  // Get improved hook for underachievers
  const improvedHook = type === 'underachiever' && 'improvedHook' in content
    ? (content as Underachiever).improvedHook
    : null;

  // Get how to fix for podcast
  const howToFix = type === 'didnt-work' && 'howToFix' in content
    ? (content as PodcastEpisodeAnalysis).howToFix
    : null;

  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-6 border-l-4 ${borderColor}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-pivotal-black text-base">{title}</h4>
          {('guestName' in content && (content as PodcastEpisodeAnalysis).guestName) && (
            <p className="text-sm text-gray-600">{(content as PodcastEpisodeAnalysis).guestName}</p>
          )}
        </div>
        {platform && (
          <span className={`text-xs font-medium px-2 py-1 rounded ${
            platform === 'instagram' ? 'bg-pink-100 text-pink-800' :
            platform === 'tiktok' ? 'bg-gray-100 text-gray-800' :
            platform === 'youtube' ? 'bg-red-100 text-red-800' :
            platform === 'spotify' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {platform.charAt(0).toUpperCase() + platform.slice(1)}
          </span>
        )}
      </div>

      {/* Performance */}
      {performanceText && (
        <p className="text-sm text-gray-600 mb-3">{performanceText}</p>
      )}

      {/* Threshold for underachievers */}
      {'threshold' in content && content.threshold && (
        <p className="text-xs text-gray-500 mb-3">
          Threshold: Below {content.threshold.toLocaleString('en-AU')} views
        </p>
      )}

      {/* Transcript Quote */}
      {transcript && (
        <blockquote className="bg-gray-50 border-l-4 border-l-pivotal-light-blue p-4 my-4 text-sm text-gray-700 italic">
          &ldquo;{transcript}&rdquo;
        </blockquote>
      )}

      {/* Analysis */}
      {analysisTitle && analysisPoints.length > 0 && (
        <div className="mt-4">
          <h5 className="text-sm font-semibold text-gray-700 mb-2">{analysisTitle}</h5>
          {analysisPoints.length === 1 ? (
            <p className="text-sm text-gray-600">{analysisPoints[0]}</p>
          ) : (
            <ul className="text-sm text-gray-600 space-y-1">
              {analysisPoints.map((point, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-pivotal-light-blue mr-2">•</span>
                  {point}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Improved Hook for underachievers */}
      {improvedHook && improvedHook.hook && (
        <div className="mt-4 p-4 bg-pivotal-light-blue/10 rounded-md">
          <h5 className="text-sm font-semibold text-gray-700 mb-1">
            Improved Hook Using {improvedHook.framework} Framework
          </h5>
          <p className="text-sm text-gray-700 italic">&ldquo;{improvedHook.hook}&rdquo;</p>
        </div>
      )}

      {/* How to fix for podcast */}
      {howToFix && (
        <div className="mt-4 p-4 bg-pivotal-light-blue/10 rounded-md">
          <h5 className="text-sm font-semibold text-gray-700 mb-1">How to fix it</h5>
          <p className="text-sm text-gray-600">{howToFix}</p>
        </div>
      )}
    </div>
  );
}
