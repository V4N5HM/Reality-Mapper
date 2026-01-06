'use client';

interface QuickInsight {
  type: 'positive' | 'negative' | 'neutral';
  title: string;
  description: string;
}

interface InsightsSummaryProps {
  monthlySummary: string;
  quickInsights: QuickInsight[];
  loading?: boolean;
}

export default function InsightsSummary({
  monthlySummary,
  quickInsights,
  loading = false,
}: InsightsSummaryProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const getInsightStyles = (type: 'positive' | 'negative' | 'neutral') => {
    switch (type) {
      case 'positive':
        return {
          bg: 'bg-green-50',
          border: 'border-l-green-500',
          icon: (
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          ),
        };
      case 'negative':
        return {
          bg: 'bg-red-50',
          border: 'border-l-red-500',
          icon: (
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          ),
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-l-pivotal-light-blue',
          icon: (
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Monthly Summary */}
      <div className="bg-gradient-to-r from-pivotal-light-blue/20 to-white rounded-lg shadow-md p-6 border-l-4 border-l-pivotal-light-blue">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-pivotal-light-blue/30 rounded-lg">
            <svg className="w-6 h-6 text-pivotal-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-pivotal-black mb-2">Monthly Summary</h3>
            <p className="text-gray-700 leading-relaxed">{monthlySummary}</p>
          </div>
        </div>
      </div>

      {/* Quick Insights */}
      {quickInsights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickInsights.map((insight, index) => {
            const styles = getInsightStyles(insight.type);
            return (
              <div
                key={index}
                className={`${styles.bg} rounded-lg p-4 border-l-4 ${styles.border}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {styles.icon}
                  <h4 className="font-semibold text-sm text-pivotal-black">{insight.title}</h4>
                </div>
                <p className="text-sm text-gray-600">{insight.description}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
