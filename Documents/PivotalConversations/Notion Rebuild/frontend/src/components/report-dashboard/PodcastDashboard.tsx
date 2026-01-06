'use client';

import { PodcastDashboardData } from '@/lib/report-dashboard/dashboard-types';
import MetricCard from './MetricCard';
import PlatformCard from './PlatformCard';
import ContentCard from './ContentCard';
import InsightCard from './InsightCard';
import EpisodeIdeaCard from './EpisodeIdeaCard';
import ActionPlanSection from './ActionPlanSection';

interface PodcastDashboardProps {
  data: PodcastDashboardData;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function PodcastDashboard({ data }: PodcastDashboardProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-pivotal-black">{data.podcastName}</h1>
        <p className="text-gray-600">Monthly Podcast Performance Dashboard</p>
        <p className="text-sm text-gray-500 mt-1">
          Pivotal Conversations · {MONTHS[data.month]} {data.year}
        </p>
      </div>

      {/* Monthly Summary */}
      {data.monthlySummary && (
        <section>
          <h2 className="text-xl font-semibold text-pivotal-black mb-4 pb-2 border-b-2 border-pivotal-light-blue">
            Monthly Summary
          </h2>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-700 leading-relaxed">{data.monthlySummary}</p>
          </div>
        </section>
      )}

      {/* Key Numbers */}
      <section>
        <h2 className="text-xl font-semibold text-pivotal-black mb-4 pb-2 border-b-2 border-pivotal-light-blue">
          Key Numbers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard label="Total Plays/Views/Starts" metric={data.keyNumbers.totalPlays} />
          <MetricCard label="New Subscribers/Followers" metric={data.keyNumbers.newSubscribers} />
          <MetricCard
            label="Average Retention/Consumption"
            metric={data.keyNumbers.avgRetention}
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
        </div>
      </section>

      {/* Platform Performance */}
      <section>
        <h2 className="text-xl font-semibold text-pivotal-black mb-4 pb-2 border-b-2 border-pivotal-light-blue">
          Platform Performance
        </h2>
        <div className="space-y-6">
          {/* YouTube */}
          {data.platformPerformance.youtube && (
            <div>
              <PlatformCard
                platform="youtube"
                platformLabel="YouTube"
                metrics={data.platformPerformance.youtube}
                isPodcast={true}
              />
              {/* What Worked / Didn't Work */}
              {(data.platformPerformance.youtube.whatWorked.length > 0 ||
                data.platformPerformance.youtube.whatDidntWork.length > 0) && (
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {data.platformPerformance.youtube.whatWorked.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-pivotal-black mb-3">What Worked</h4>
                      <div className="space-y-3">
                        {data.platformPerformance.youtube.whatWorked.map((episode, index) => (
                          <ContentCard key={index} type="worked" content={episode} platform="youtube" />
                        ))}
                      </div>
                    </div>
                  )}
                  {data.platformPerformance.youtube.whatDidntWork.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-pivotal-black mb-3">What Didn&apos;t Work</h4>
                      <div className="space-y-3">
                        {data.platformPerformance.youtube.whatDidntWork.map((episode, index) => (
                          <ContentCard key={index} type="didnt-work" content={episode} platform="youtube" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Spotify */}
          {data.platformPerformance.spotify && (
            <div>
              <PlatformCard
                platform="spotify"
                platformLabel="Spotify"
                metrics={data.platformPerformance.spotify}
                isPodcast={true}
              />
              {(data.platformPerformance.spotify.whatWorked.length > 0 ||
                data.platformPerformance.spotify.whatDidntWork.length > 0) && (
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {data.platformPerformance.spotify.whatWorked.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-pivotal-black mb-3">What Worked</h4>
                      <div className="space-y-3">
                        {data.platformPerformance.spotify.whatWorked.map((episode, index) => (
                          <ContentCard key={index} type="worked" content={episode} platform="spotify" />
                        ))}
                      </div>
                    </div>
                  )}
                  {data.platformPerformance.spotify.whatDidntWork.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-pivotal-black mb-3">What Didn&apos;t Work</h4>
                      <div className="space-y-3">
                        {data.platformPerformance.spotify.whatDidntWork.map((episode, index) => (
                          <ContentCard key={index} type="didnt-work" content={episode} platform="spotify" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Apple Podcasts */}
          {data.platformPerformance.apple && (
            <PlatformCard
              platform="apple"
              platformLabel="Apple Podcasts"
              metrics={data.platformPerformance.apple}
              isPodcast={true}
            />
          )}
        </div>
      </section>

      {/* What We Learned This Month */}
      {data.learnings.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-pivotal-black mb-4 pb-2 border-b-2 border-pivotal-light-blue">
            What We Learned This Month
          </h2>
          <div className="space-y-4">
            {data.learnings.map((learning, index) => (
              <InsightCard
                key={index}
                title={learning.title}
                description={learning.description}
                variant="learning"
              />
            ))}
          </div>
        </section>
      )}

      {/* What to Do Next Month */}
      {data.nextMonthActions.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-pivotal-black mb-4 pb-2 border-b-2 border-pivotal-light-blue">
            What to Do Next Month
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.nextMonthActions.map((action, index) => (
              <InsightCard
                key={index}
                title={action.title}
                description={action.description}
                variant="action"
              />
            ))}
          </div>
        </section>
      )}

      {/* Episode Ideas for Next Month */}
      {data.episodeIdeas.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-pivotal-black mb-4 pb-2 border-b-2 border-pivotal-light-blue">
            Episode Ideas for Next Month
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data.episodeIdeas.map((idea, index) => (
              <EpisodeIdeaCard key={index} idea={idea} isPodcast={true} />
            ))}
          </div>
        </section>
      )}

      {/* Action Plan */}
      <section>
        <h2 className="text-xl font-semibold text-pivotal-black mb-4 pb-2 border-b-2 border-pivotal-light-blue">
          Action Plan
        </h2>
        <ActionPlanSection actionPlan={data.actionPlan} />
      </section>
    </div>
  );
}
