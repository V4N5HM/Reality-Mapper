'use client';

import { PlatformMetrics, PodcastPlatformPerformance } from '@/lib/report-dashboard/dashboard-types';

interface PlatformCardProps {
  platform: string;
  platformLabel: string;
  metrics?: PlatformMetrics | PodcastPlatformPerformance;
  isPodcast?: boolean;
}

const platformColors: Record<string, string> = {
  instagram: 'border-l-pink-500',
  tiktok: 'border-l-black',
  youtube: 'border-l-red-600',
  spotify: 'border-l-green-500',
  apple: 'border-l-purple-500',
};

export default function PlatformCard({
  platform,
  platformLabel,
  metrics,
  isPodcast = false,
}: PlatformCardProps) {
  if (!metrics) {
    return (
      <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-6 border-l-4 ${platformColors[platform] || 'border-l-gray-400'}`}>
        <h3 className="text-lg font-semibold text-pivotal-black mb-4">{platformLabel}</h3>
        <p className="text-gray-500">No data available for this platform</p>
      </div>
    );
  }

  // Check if it's podcast platform performance
  if (isPodcast && 'stats' in metrics) {
    const podcastMetrics = metrics as PodcastPlatformPerformance;

    if (podcastMetrics.noDataNote) {
      return (
        <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-6 border-l-4 ${platformColors[platform] || 'border-l-gray-400'}`}>
          <h3 className="text-lg font-semibold text-pivotal-black mb-4">{platformLabel}</h3>
          <p className="text-gray-500 italic">{podcastMetrics.noDataNote}</p>
        </div>
      );
    }

    return (
      <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-6 border-l-4 ${platformColors[platform] || 'border-l-gray-400'}`}>
        <h3 className="text-lg font-semibold text-pivotal-black mb-4">{platformLabel}</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {podcastMetrics.stats.totalViews !== undefined && (
            <div>
              <div className="text-2xl font-bold text-pivotal-black">
                {podcastMetrics.stats.totalViews.toLocaleString('en-AU')}
              </div>
              <div className="text-sm text-gray-500">Total Views</div>
            </div>
          )}
          {podcastMetrics.stats.totalPlays !== undefined && (
            <div>
              <div className="text-2xl font-bold text-pivotal-black">
                {podcastMetrics.stats.totalPlays.toLocaleString('en-AU')}
              </div>
              <div className="text-sm text-gray-500">Total Plays</div>
            </div>
          )}
          {podcastMetrics.stats.watchTime && (
            <div>
              <div className="text-2xl font-bold text-pivotal-black">
                {podcastMetrics.stats.watchTime}
              </div>
              <div className="text-sm text-gray-500">Watch Time</div>
            </div>
          )}
          {podcastMetrics.stats.consumptionTime && (
            <div>
              <div className="text-2xl font-bold text-pivotal-black">
                {podcastMetrics.stats.consumptionTime}
              </div>
              <div className="text-sm text-gray-500">Consumption Time</div>
            </div>
          )}
          {podcastMetrics.stats.retention !== undefined && (
            <div>
              <div className="text-2xl font-bold text-pivotal-black">
                {podcastMetrics.stats.retention}%
              </div>
              <div className="text-sm text-gray-500">Retention</div>
            </div>
          )}
          {podcastMetrics.stats.consumptionRate !== undefined && (
            <div>
              <div className="text-2xl font-bold text-pivotal-black">
                {podcastMetrics.stats.consumptionRate}%
              </div>
              <div className="text-sm text-gray-500">Consumption Rate</div>
            </div>
          )}
          {podcastMetrics.stats.subscribersGained !== undefined && (
            <div>
              <div className="text-2xl font-bold text-pivotal-black">
                {podcastMetrics.stats.subscribersGained.toLocaleString('en-AU')}
              </div>
              <div className="text-sm text-gray-500">Subscribers Gained</div>
            </div>
          )}
          {podcastMetrics.stats.followersGained !== undefined && (
            <div>
              <div className="text-2xl font-bold text-pivotal-black">
                {podcastMetrics.stats.followersGained.toLocaleString('en-AU')}
              </div>
              <div className="text-sm text-gray-500">Followers Gained</div>
            </div>
          )}
        </div>
        {podcastMetrics.whatThisMeans && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">What this means</h4>
            <p className="text-sm text-gray-600">{podcastMetrics.whatThisMeans}</p>
          </div>
        )}
      </div>
    );
  }

  // Personal brand platform metrics
  const personalMetrics = metrics as PlatformMetrics & { analysis?: string };

  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-6 border-l-4 ${platformColors[platform] || 'border-l-gray-400'}`}>
      <h3 className="text-lg font-semibold text-pivotal-black mb-4">{platformLabel}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-2xl font-bold text-pivotal-black">
            {personalMetrics.views.value.toLocaleString('en-AU')}
          </div>
          <div className="text-sm text-gray-500">Views</div>
          <div className={`text-xs font-semibold ${personalMetrics.views.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {personalMetrics.views.change >= 0 ? '+' : ''}{personalMetrics.views.change.toFixed(1)}% {personalMetrics.views.changeLabel}
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold text-pivotal-black">
            {personalMetrics.ytdViews.value.toLocaleString('en-AU')}
          </div>
          <div className="text-sm text-gray-500">YTD Views</div>
          <div className="text-xs text-gray-500">
            {personalMetrics.ytdViews.changeLabel}
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold text-pivotal-black">
            {personalMetrics.newFollowers.value.toLocaleString('en-AU')}
          </div>
          <div className="text-sm text-gray-500">New Followers</div>
          <div className={`text-xs font-semibold ${personalMetrics.newFollowers.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {personalMetrics.newFollowers.change >= 0 ? '+' : ''}{personalMetrics.newFollowers.change.toFixed(1)}% {personalMetrics.newFollowers.changeLabel}
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold text-pivotal-black">
            {personalMetrics.profileVisits.value.toLocaleString('en-AU')}
          </div>
          <div className="text-sm text-gray-500">Profile Visits</div>
          <div className={`text-xs font-semibold ${personalMetrics.profileVisits.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {personalMetrics.profileVisits.change >= 0 ? '+' : ''}{personalMetrics.profileVisits.change.toFixed(1)}% {personalMetrics.profileVisits.changeLabel}
          </div>
        </div>
      </div>
      {/* Non-follower reach for Instagram */}
      {personalMetrics.nonFollowerReach !== undefined && personalMetrics.nonFollowerReach > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Non-Follower Reach</span>
            <span className="text-lg font-semibold text-pivotal-black">{personalMetrics.nonFollowerReach.toFixed(1)}%</span>
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
              style={{ width: `${Math.min(personalMetrics.nonFollowerReach, 100)}%` }}
            />
          </div>
        </div>
      )}
      {personalMetrics.analysis && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600">{personalMetrics.analysis}</p>
        </div>
      )}
    </div>
  );
}
