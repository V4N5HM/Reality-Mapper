'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface MetricData {
  name: string;
  value: number;
  change: number;
}

interface MetricsOverviewChartProps {
  metrics: MetricData[];
  title?: string;
}

export default function MetricsOverviewChart({ metrics, title = 'Month-over-Month Change' }: MetricsOverviewChartProps) {
  const data = metrics.map(m => ({
    name: m.name,
    change: m.change,
  }));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-pivotal-black mb-4">{title}</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis
              tickFormatter={(value) => `${value}%`}
              domain={['auto', 'auto']}
            />
            <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Change']} />
            <ReferenceLine y={0} stroke="#9ca3af" />
            <Bar dataKey="change" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Bar
                  key={`bar-${index}`}
                  dataKey="change"
                  fill={entry.change >= 0 ? '#22c55e' : '#FF0022'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
