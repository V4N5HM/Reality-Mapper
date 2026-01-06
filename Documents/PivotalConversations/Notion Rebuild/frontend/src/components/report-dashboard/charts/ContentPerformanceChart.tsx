'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList } from 'recharts';
import { Overachiever, Underachiever } from '@/lib/report-dashboard/dashboard-types';

interface ContentPerformanceChartProps {
  overachievers: Array<Overachiever>;
  underachievers: Array<Underachiever>;
  threshold?: number;
  platform: 'instagram' | 'tiktok';
}

export default function ContentPerformanceChart({
  overachievers,
  underachievers,
  threshold,
  platform
}: ContentPerformanceChartProps) {
  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  const truncateLabel = (label: string, maxLength: number = 25) => {
    if (label.length <= maxLength) return label;
    return label.substring(0, maxLength) + '...';
  };

  // Combine and sort data
  const data = [
    ...overachievers.slice(0, 3).map(o => ({
      name: truncateLabel(o.title),
      views: o.views || 0,
      isOverachiever: true,
    })),
    ...underachievers.slice(0, 3).map(u => ({
      name: truncateLabel(u.title),
      views: u.views || 0,
      isOverachiever: false,
    })),
  ].sort((a, b) => b.views - a.views);

  if (data.length === 0) {
    return null;
  }

  const platformColor = platform === 'instagram' ? '#E1306C' : '#000000';
  const platformName = platform === 'instagram' ? 'Instagram' : 'TikTok';

  // Calculate average threshold from underachievers
  const avgThreshold = threshold || (underachievers.length > 0
    ? underachievers.reduce((acc, u) => acc + (u.threshold || 0), 0) / underachievers.length
    : 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: platformColor }}
        />
        <h3 className="text-lg font-semibold text-pivotal-black">{platformName} Content Performance</h3>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" tickFormatter={formatNumber} />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(value) => [formatNumber(value as number), 'Views']}
              labelFormatter={(label) => label}
            />
            {avgThreshold > 0 && (
              <ReferenceLine
                x={avgThreshold}
                stroke="#9ca3af"
                strokeDasharray="5 5"
                label={{ value: 'Threshold', position: 'top', fontSize: 10, fill: '#9ca3af' }}
              />
            )}
            <Bar dataKey="views" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isOverachiever ? '#22c55e' : '#ef4444'}
                />
              ))}
              <LabelList
                dataKey="views"
                position="right"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => formatNumber(Number(value || 0))}
                style={{ fontSize: 11, fill: '#374151' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-gray-600">Overachievers</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-gray-600">Underachievers</span>
        </div>
        {avgThreshold > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-gray-400 border-dashed" />
            <span className="text-gray-600">Threshold ({formatNumber(avgThreshold)})</span>
          </div>
        )}
      </div>
    </div>
  );
}
