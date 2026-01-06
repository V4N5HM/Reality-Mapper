'use client';

interface Recommendation {
  priority: number;
  title: string;
  description: string;
}

interface ContentIdea {
  hook: string;
  framework: string;
  whyItWorks: string;
}

interface WeeklyPriorities {
  week1_2: string[];
  week3_4: string[];
}

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
  contentIdeas: ContentIdea[];
  weeklyPriorities: WeeklyPriorities;
  loading?: boolean;
}

export default function RecommendationsPanel({
  recommendations,
  contentIdeas,
  weeklyPriorities,
  loading = false,
}: RecommendationsPanelProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-pivotal-black mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-pivotal-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Priority Actions
          </h3>
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border-l-4 border-l-pivotal-red"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-pivotal-red text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {rec.priority}
                </div>
                <div>
                  <h4 className="font-semibold text-pivotal-black">{rec.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Ideas */}
      {contentIdeas.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-pivotal-black mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Content Ideas
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {contentIdeas.map((idea, index) => (
              <div
                key={index}
                className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-200"
              >
                <div className="mb-3">
                  <span className="inline-block px-2 py-1 bg-yellow-200 text-yellow-800 text-xs font-medium rounded">
                    {idea.framework}
                  </span>
                </div>
                <p className="text-sm font-medium text-pivotal-black mb-2 italic">
                  &ldquo;{idea.hook}&rdquo;
                </p>
                <p className="text-xs text-gray-600">{idea.whyItWorks}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Priorities */}
      {(weeklyPriorities.week1_2.length > 0 || weeklyPriorities.week3_4.length > 0) && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-pivotal-black mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-pivotal-light-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Action Plan
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Week 1-2 */}
            {weeklyPriorities.week1_2.length > 0 && (
              <div className="p-4 bg-pivotal-light-blue/10 rounded-lg">
                <h4 className="font-semibold text-pivotal-black mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-pivotal-light-blue text-pivotal-black rounded-full flex items-center justify-center text-xs font-bold">
                    1-2
                  </span>
                  Week 1-2 Priorities
                </h4>
                <ul className="space-y-2">
                  {weeklyPriorities.week1_2.map((priority, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                      <svg className="w-4 h-4 text-pivotal-light-blue mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {priority}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Week 3-4 */}
            {weeklyPriorities.week3_4.length > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-pivotal-black mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-gray-400 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    3-4
                  </span>
                  Week 3-4 Priorities
                </h4>
                <ul className="space-y-2">
                  {weeklyPriorities.week3_4.map((priority, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                      <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {priority}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
