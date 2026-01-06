'use client';

interface InsightCardProps {
  title: string;
  description: string;
  variant?: 'learning' | 'action' | 'recommendation';
}

export default function InsightCard({ title, description, variant = 'learning' }: InsightCardProps) {
  const borderColor = {
    learning: 'border-l-pivotal-light-blue',
    action: 'border-l-pivotal-red',
    recommendation: 'border-l-pivotal-beige',
  }[variant];

  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-5 border-l-4 ${borderColor}`}>
      <h4 className="font-semibold text-pivotal-black mb-2">{title}</h4>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
