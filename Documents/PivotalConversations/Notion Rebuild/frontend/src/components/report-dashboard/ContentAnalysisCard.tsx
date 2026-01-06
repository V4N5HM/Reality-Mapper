'use client';

interface ContentAnalysis {
  title: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  views: number;
  whyItWorked?: string[];
  whyItFailed?: string[];
  hookFramework?: string;
  improvedHook?: string;
}

interface ContentAnalysisCardProps {
  content: ContentAnalysis;
  type: 'overachiever' | 'underachiever';
}

const platformColors = {
  instagram: 'from-pink-500 to-purple-500',
  tiktok: 'from-gray-900 to-gray-700',
  youtube: 'from-red-600 to-red-500',
};

const platformLabels = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
};

export default function ContentAnalysisCard({ content, type }: ContentAnalysisCardProps) {
  const isOverachiever = type === 'overachiever';

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden border ${isOverachiever ? 'border-green-200' : 'border-red-200'}`}>
      {/* Header */}
      <div className={`px-4 py-3 bg-gradient-to-r ${platformColors[content.platform]} text-white`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{platformLabels[content.platform]}</span>
          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${isOverachiever ? 'bg-green-400/30' : 'bg-red-400/30'}`}>
            {isOverachiever ? 'Overachiever' : 'Underachiever'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h4 className="font-semibold text-pivotal-black mb-2 line-clamp-2">
          {content.title}
        </h4>

        <div className="flex items-center gap-2 mb-4">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="text-lg font-bold text-pivotal-black">
            {content.views.toLocaleString('en-AU')}
          </span>
          <span className="text-sm text-gray-500">views</span>
        </div>

        {/* Why it worked/failed */}
        {isOverachiever && content.whyItWorked && content.whyItWorked.length > 0 && (
          <div className="mb-4">
            <h5 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Why This Worked
            </h5>
            <ul className="space-y-1">
              {content.whyItWorked.map((reason, idx) => (
                <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isOverachiever && content.whyItFailed && content.whyItFailed.length > 0 && (
          <div className="mb-4">
            <h5 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Why It Underperformed
            </h5>
            <ul className="space-y-1">
              {content.whyItFailed.map((reason, idx) => (
                <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Hook framework or improved hook */}
        {isOverachiever && content.hookFramework && (
          <div className="pt-3 border-t border-gray-100">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-pivotal-light-blue/30 text-pivotal-black text-xs font-medium rounded">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {content.hookFramework}
            </span>
          </div>
        )}

        {!isOverachiever && content.improvedHook && (
          <div className="pt-3 border-t border-gray-100">
            <h5 className="text-sm font-semibold text-pivotal-black mb-2 flex items-center gap-1">
              <svg className="w-4 h-4 text-pivotal-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Suggested Improved Hook
            </h5>
            <p className="text-sm text-gray-700 italic bg-gray-50 p-3 rounded border-l-2 border-l-pivotal-red">
              &ldquo;{content.improvedHook}&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
