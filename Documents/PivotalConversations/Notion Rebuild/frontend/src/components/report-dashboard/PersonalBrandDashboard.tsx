'use client';

import { useState, useEffect } from 'react';
import { PersonalBrandDashboardData } from '@/lib/report-dashboard/dashboard-types';
import MetricCard from './MetricCard';
import PlatformCard from './PlatformCard';
import InsightsSummary from './InsightsSummary';
import RecommendationsPanel from './RecommendationsPanel';
import ContentPerformanceTable from './ContentPerformanceTable';
import PlatformComparisonChart from './charts/PlatformComparisonChart';
import ContentPerformanceChart from './charts/ContentPerformanceChart';

interface PersonalBrandDashboardProps {
  data: PersonalBrandDashboardData;
}

interface DashboardInsights {
  monthlySummary: string;
  quickInsights: Array<{
    type: 'positive' | 'negative' | 'neutral';
    title: string;
    description: string;
  }>;
  overachieverAnalysis?: Array<{
    title: string;
    platform: 'instagram' | 'tiktok';
    views: number;
    whyItWorked: string[];
    hookFramework: string;
  }>;
  underachieverAnalysis?: Array<{
    title: string;
    platform: 'instagram' | 'tiktok';
    views: number;
    whyItFailed: string[];
    improvedHook: string;
  }>;
  topRecommendations: Array<{
    priority: number;
    title: string;
    description: string;
  }>;
  contentIdeas: Array<{
    hook: string;
    framework: string;
    whyItWorks: string;
  }>;
  weeklyPriorities: {
    week1_2: string[];
    week3_4: string[];
  };
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function PersonalBrandDashboard({ data }: PersonalBrandDashboardProps) {
  const [insights, setInsights] = useState<DashboardInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Fetch AI-generated insights with timeout for better UX
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const fetchInsights = async () => {
      setInsightsLoading(true);
      setInsightsError(null);
      try {
        const response = await fetch(
          `/api/report-dashboard/${data.clientId}/insights?month=${data.month}&year=${data.year}`,
          { signal: controller.signal }
        );
        if (response.ok) {
          const result = await response.json();
          setInsights(result.insights);
        } else {
          setInsightsError('Unable to load AI insights');
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setInsightsError('AI insights timed out - try refreshing');
        } else {
          setInsightsError('Unable to load AI insights');
        }
      } finally {
        clearTimeout(timeoutId);
        setInsightsLoading(false);
      }
    };

    fetchInsights();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [data.clientId, data.month, data.year]);

  const instagramViews = data.platformPerformance.instagram?.views.value || 0;
  const tiktokViews = data.platformPerformance.tiktok?.views.value || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-pivotal-black">{data.clientName}</h1>
        <p className="text-gray-600">Monthly Social Media Performance Dashboard</p>
        <p className="text-sm text-gray-500 mt-1">
          Pivotal Conversations · {MONTHS[data.month]} {data.year}
        </p>
      </div>

      {/* AI-Generated Summary & Quick Insights */}
      <section>
        <h2 className="text-xl font-semibold text-pivotal-black mb-4 pb-2 border-b-2 border-pivotal-light-blue">
          Monthly Performance Analysis
        </h2>
        {insightsError ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800 text-sm">
            {insightsError}. Showing raw metrics below.
          </div>
        ) : (
          <InsightsSummary
            monthlySummary={insights?.monthlySummary || data.monthlySummary || ''}
            quickInsights={insights?.quickInsights || []}
            loading={insightsLoading}
          />
        )}
      </section>

      {/* Key Performance Metrics */}
      <section>
        <h2 className="text-xl font-semibold text-pivotal-black mb-4 pb-2 border-b-2 border-pivotal-light-blue">
          Key Performance Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total Views" metric={data.keyMetrics.totalViews} />
          <MetricCard label="Avg Views Per Post" metric={data.keyMetrics.avgViewsPerPost} />
          <MetricCard label="New Followers" metric={data.keyMetrics.newFollowers} />
          <MetricCard label="Profile Visits" metric={data.keyMetrics.profileVisits} />
        </div>
      </section>

      {/* Platform Performance with Chart */}
      <section>
        <h2 className="text-xl font-semibold text-pivotal-black mb-4 pb-2 border-b-2 border-pivotal-light-blue">
          Platform Performance
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Platform Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.platformPerformance.instagram && (
              <PlatformCard
                platform="instagram"
                platformLabel="Instagram"
                metrics={data.platformPerformance.instagram}
              />
            )}
            {data.platformPerformance.tiktok && (
              <PlatformCard
                platform="tiktok"
                platformLabel="TikTok"
                metrics={data.platformPerformance.tiktok}
              />
            )}
          </div>
          {/* Platform Comparison Chart */}
          <div>
            <PlatformComparisonChart
              instagram={instagramViews}
              tiktok={tiktokViews}
            />
          </div>
        </div>
      </section>

      {/* Content Performance Section - Redesigned */}
      <section>
        <h2 className="text-xl font-semibold text-pivotal-black mb-4 pb-2 border-b-2 border-pivotal-light-blue">
          Content Performance
        </h2>

        {/* Performance Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {(data.overachievers.tiktok.length > 0 || data.underachievers.tiktok.length > 0) && (
            <ContentPerformanceChart
              overachievers={data.overachievers.tiktok}
              underachievers={data.underachievers.tiktok}
              platform="tiktok"
            />
          )}
          {(data.overachievers.instagram.length > 0 || data.underachievers.instagram.length > 0) && (
            <ContentPerformanceChart
              overachievers={data.overachievers.instagram}
              underachievers={data.underachievers.instagram}
              platform="instagram"
            />
          )}
        </div>

        {/* Compact Content Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overachievers */}
          {data.overachievers.noOverachieversNote ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-semibold text-pivotal-black mb-2">Top Performers</h3>
              <p className="text-gray-500 text-sm italic">{data.overachievers.noOverachieversNote}</p>
            </div>
          ) : (
            <>
              {data.overachievers.tiktok.length > 0 && (
                <ContentPerformanceTable
                  type="overachiever"
                  content={data.overachievers.tiktok}
                  platform="tiktok"
                />
              )}
              {data.overachievers.instagram.length > 0 && (
                <ContentPerformanceTable
                  type="overachiever"
                  content={data.overachievers.instagram}
                  platform="instagram"
                />
              )}
            </>
          )}

          {/* Underachievers */}
          {data.underachievers.tiktok.length > 0 && (
            <ContentPerformanceTable
              type="underachiever"
              content={data.underachievers.tiktok}
              platform="tiktok"
            />
          )}
          {data.underachievers.instagram.length > 0 && (
            <ContentPerformanceTable
              type="underachiever"
              content={data.underachievers.instagram}
              platform="instagram"
            />
          )}
        </div>

        {/* No content message */}
        {data.overachievers.tiktok.length === 0 &&
         data.overachievers.instagram.length === 0 &&
         data.underachievers.tiktok.length === 0 &&
         data.underachievers.instagram.length === 0 &&
         !data.overachievers.noOverachieversNote && (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-500">No content performance data available for this period</p>
          </div>
        )}
      </section>

      {/* AI-Generated Content Analysis */}
      {insights && !insightsLoading && (insights.overachieverAnalysis?.length || insights.underachieverAnalysis?.length) && (
        <section>
          <h2 className="text-xl font-semibold text-pivotal-black mb-4 pb-2 border-b-2 border-pivotal-light-blue">
            AI Content Analysis
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* What Worked */}
            {insights.overachieverAnalysis && insights.overachieverAnalysis.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-l-green-500">
                <h3 className="font-semibold text-pivotal-black mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Why Top Content Worked
                </h3>
                <div className="space-y-4">
                  {insights.overachieverAnalysis.slice(0, 2).map((analysis, index) => (
                    <div key={index} className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-pivotal-black mb-2 truncate">{analysis.title}</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {analysis.whyItWorked.slice(0, 3).map((reason, i) => (
                          <li key={i} className="flex items-start">
                            <span className="text-green-500 mr-1">+</span>
                            {reason}
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-green-700 mt-2 font-medium">
                        Hook: {analysis.hookFramework}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What Didn&apos;t Work */}
            {insights.underachieverAnalysis && insights.underachieverAnalysis.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-l-red-500">
                <h3 className="font-semibold text-pivotal-black mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Areas to Improve
                </h3>
                <div className="space-y-4">
                  {insights.underachieverAnalysis.slice(0, 2).map((analysis, index) => (
                    <div key={index} className="p-3 bg-red-50 rounded-lg">
                      <p className="text-sm font-medium text-pivotal-black mb-2 truncate">{analysis.title}</p>
                      <ul className="text-xs text-gray-600 space-y-1 mb-2">
                        {analysis.whyItFailed.slice(0, 2).map((reason, i) => (
                          <li key={i} className="flex items-start">
                            <span className="text-red-500 mr-1">-</span>
                            {reason}
                          </li>
                        ))}
                      </ul>
                      {analysis.improvedHook && (
                        <div className="p-2 bg-white rounded border border-red-100">
                          <p className="text-xs text-gray-500 mb-1">Better hook:</p>
                          <p className="text-xs text-pivotal-black italic">&ldquo;{analysis.improvedHook}&rdquo;</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* AI-Generated Recommendations, Content Ideas & Action Plan */}
      {insights && !insightsLoading && (
        <section>
          <h2 className="text-xl font-semibold text-pivotal-black mb-4 pb-2 border-b-2 border-pivotal-light-blue">
            Recommendations & Next Steps
          </h2>
          <RecommendationsPanel
            recommendations={insights.topRecommendations || []}
            contentIdeas={insights.contentIdeas || []}
            weeklyPriorities={insights.weeklyPriorities || { week1_2: [], week3_4: [] }}
          />
        </section>
      )}

      {/* Loading state for recommendations */}
      {insightsLoading && (
        <section>
          <h2 className="text-xl font-semibold text-pivotal-black mb-4 pb-2 border-b-2 border-pivotal-light-blue">
            Recommendations & Next Steps
          </h2>
          <RecommendationsPanel
            recommendations={[]}
            contentIdeas={[]}
            weeklyPriorities={{ week1_2: [], week3_4: [] }}
            loading={true}
          />
        </section>
      )}
    </div>
  );
}
