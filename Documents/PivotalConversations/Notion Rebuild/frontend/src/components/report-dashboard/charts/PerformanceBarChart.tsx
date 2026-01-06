'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PerformanceBarChartProps {
  data: Array<{
    name: string;
    views: number;
    threshold?: number;
    isOverachiever?: boolean;
  }>;
  title: string;
  threshold?: number;
}

export default function PerformanceBarChart({ data, title, threshold }: PerformanceBarChartProps) {
  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-pivotal-black mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" tickFormatter={formatNumber} />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => value.length > 20 ? value.substring(0, 20) + '...' : value}
            />
            <Tooltip
              formatter={(value) => [formatNumber(value as number), 'Views']}
              labelFormatter={(label) => label}
            />
            {threshold && (
              <Bar dataKey="threshold" fill="#e5e7eb" name="Threshold" />
            )}
            <Bar dataKey="views" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isOverachiever ? '#22c55e' : '#FF0022'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
