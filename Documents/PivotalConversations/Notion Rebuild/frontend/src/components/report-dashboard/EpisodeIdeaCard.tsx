'use client';

import { PersonalBrandContentIdea, PodcastEpisodeIdea } from '@/lib/report-dashboard/dashboard-types';

interface EpisodeIdeaCardProps {
  idea: PersonalBrandContentIdea | PodcastEpisodeIdea;
  isPodcast?: boolean;
}

export default function EpisodeIdeaCard({ idea, isPodcast = false }: EpisodeIdeaCardProps) {
  const podcastIdea = idea as PodcastEpisodeIdea;
  const personalIdea = idea as PersonalBrandContentIdea;

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      {/* Number Badge */}
      <div className="flex items-start gap-3 mb-4">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-pivotal-red text-white font-bold text-sm flex-shrink-0">
          {idea.id}
        </span>
        <h4 className="font-semibold text-pivotal-black text-lg leading-tight">{idea.title}</h4>
      </div>

      {/* Podcast-specific fields */}
      {isPodcast && podcastIdea.idealGuestProfile && (
        <div className="mb-3">
          <h5 className="text-sm font-semibold text-gray-700 mb-1">Ideal guest profile</h5>
          <p className="text-sm text-gray-600">{podcastIdea.idealGuestProfile}</p>
        </div>
      )}

      {isPodcast && podcastIdea.hookSuggestion && (
        <div className="mb-3">
          <h5 className="text-sm font-semibold text-gray-700 mb-1">Hook suggestion</h5>
          <p className="text-sm text-gray-600 italic">&ldquo;{podcastIdea.hookSuggestion}&rdquo;</p>
        </div>
      )}

      {isPodcast && podcastIdea.keyDiscussionPoints && podcastIdea.keyDiscussionPoints.length > 0 && (
        <div className="mb-3">
          <h5 className="text-sm font-semibold text-gray-700 mb-1">Key discussion points</h5>
          <ul className="text-sm text-gray-600 space-y-1">
            {podcastIdea.keyDiscussionPoints.map((point, index) => (
              <li key={index} className="flex items-start">
                <span className="text-pivotal-light-blue mr-2">•</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Personal Brand specific fields */}
      {!isPodcast && personalIdea.hookExample && (
        <div className="mb-3">
          <h5 className="text-sm font-semibold text-gray-700 mb-1">Hook</h5>
          <p className="text-sm text-gray-600 italic">&ldquo;{personalIdea.hookExample}&rdquo;</p>
        </div>
      )}

      {!isPodcast && personalIdea.framework && personalIdea.framework.length > 0 && (
        <div className="mb-3">
          <h5 className="text-sm font-semibold text-gray-700 mb-1">Framework</h5>
          <ul className="text-sm text-gray-600 space-y-1">
            {personalIdea.framework.map((item, index) => (
              <li key={index} className="flex items-start">
                <span className="text-pivotal-light-blue mr-2">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Why it works - common to both */}
      {(idea.whyItWorks || podcastIdea.whyItWorks) && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h5 className="text-sm font-semibold text-gray-700 mb-1">Why it works</h5>
          <p className="text-sm text-gray-600">{idea.whyItWorks || podcastIdea.whyItWorks}</p>
        </div>
      )}
    </div>
  );
}
