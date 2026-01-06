'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface PlatformComparisonChartProps {
  instagram: number;
  tiktok: number;
  title?: string;
}

const COLORS = {
  instagram: '#E1306C',
  tiktok: '#000000',
};

export default function PlatformComparisonChart({ instagram, tiktok, title = 'Views by Platform' }: PlatformComparisonChartProps) {
  const data = [
    { name: 'Instagram', value: instagram, color: COLORS.instagram },
    { name: 'TikTok', value: tiktok, color: COLORS.tiktok },
  ].filter(d => d.value > 0);

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  const total = instagram + tiktok;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-pivotal-black mb-4">{title}</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatNumber(value as number)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-pivotal-black">{formatNumber(instagram)}</div>
          <div className="text-xs text-gray-500">Instagram ({total > 0 ? ((instagram / total) * 100).toFixed(0) : 0}%)</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-pivotal-black">{formatNumber(tiktok)}</div>
          <div className="text-xs text-gray-500">TikTok ({total > 0 ? ((tiktok / total) * 100).toFixed(0) : 0}%)</div>
        </div>
      </div>
    </div>
  );
}
