'use client';

import { MetricWithChange } from '@/lib/report-dashboard/dashboard-types';

interface MetricCardProps {
  label: string;
  metric: MetricWithChange;
  formatValue?: (value: number) => string;
}

export default function MetricCard({ label, metric, formatValue }: MetricCardProps) {
  const formattedValue = formatValue
    ? formatValue(metric.value)
    : metric.value.toLocaleString('en-AU');

  const isPositive = metric.change > 0;
  const isNegative = metric.change < 0;
  const changePrefix = isPositive ? '+' : '';

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 border-l-4 border-l-pivotal-light-blue">
      <div className="text-3xl font-bold text-pivotal-black mb-1">
        {formattedValue}
      </div>
      <div className="text-sm text-gray-500 mb-2">{label}</div>
      <div
        className={`text-sm font-semibold ${
          isPositive
            ? 'text-green-600'
            : isNegative
            ? 'text-red-600'
            : 'text-gray-500'
        }`}
      >
        {changePrefix}
        {metric.change.toFixed(1)}% {metric.changeLabel}
      </div>
    </div>
  );
}
