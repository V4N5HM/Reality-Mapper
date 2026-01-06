'use client';

import { Overachiever, Underachiever } from '@/lib/report-dashboard/dashboard-types';

interface ContentPerformanceTableProps {
  type: 'overachiever' | 'underachiever';
  content: Array<Overachiever | Underachiever>;
  platform: 'instagram' | 'tiktok';
}

export default function ContentPerformanceTable({ type, content, platform }: ContentPerformanceTableProps) {
  const isOverachiever = type === 'overachiever';
  const platformColor = platform === 'instagram' ? 'bg-pink-100 text-pink-800' : 'bg-gray-100 text-gray-800';
  const platformIcon = platform === 'instagram' ? (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  ) : (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
    </svg>
  );

  const formatNumber = (value: number | undefined) => {
    if (!value) return '0';
    return value.toLocaleString('en-AU');
  };

  const truncateTitle = (title: string, maxLength: number = 60) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  const getHookExcerpt = (transcript: string) => {
    if (!transcript) return null;
    // Get first sentence or first 100 chars
    const firstSentence = transcript.split(/[.!?]/)[0];
    if (firstSentence.length > 100) {
      return firstSentence.substring(0, 100) + '...';
    }
    return firstSentence;
  };

  if (content.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className={`px-4 py-3 ${isOverachiever ? 'bg-green-50 border-b border-green-100' : 'bg-red-50 border-b border-red-100'}`}>
        <div className="flex items-center gap-2">
          <span className={`p-1.5 rounded ${platformColor}`}>
            {platformIcon}
          </span>
          <h4 className="font-semibold text-pivotal-black capitalize">
            {platform} {isOverachiever ? 'Top Performers' : 'Underperformers'}
          </h4>
          <span className={`ml-auto text-xs font-medium px-2 py-1 rounded-full ${isOverachiever ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {content.length} {content.length === 1 ? 'post' : 'posts'}
          </span>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {content.slice(0, 5).map((item, index) => (
          <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-pivotal-black text-sm truncate">
                  {truncateTitle(item.title)}
                </p>
                {item.transcript && (
                  <p className="text-xs text-gray-500 mt-1 italic">
                    &ldquo;{getHookExcerpt(item.transcript)}&rdquo;
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`text-lg font-bold ${isOverachiever ? 'text-green-600' : 'text-red-600'}`}>
                  {formatNumber(item.views)}
                </div>
                <div className="text-xs text-gray-500">views</div>
                {!isOverachiever && 'threshold' in item && item.threshold && (
                  <div className="text-xs text-gray-400 mt-1">
                    threshold: {formatNumber(item.threshold)}
                  </div>
                )}
              </div>
            </div>

            {/* Performance indicator bar */}
            {!isOverachiever && 'threshold' in item && item.threshold && item.views && (
              <div className="mt-2">
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-400 rounded-full"
                    style={{ width: `${Math.min((item.views / item.threshold) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {content.length > 5 && (
        <div className="px-4 py-2 bg-gray-50 text-center">
          <span className="text-xs text-gray-500">+{content.length - 5} more posts</span>
        </div>
      )}
    </div>
  );
}
