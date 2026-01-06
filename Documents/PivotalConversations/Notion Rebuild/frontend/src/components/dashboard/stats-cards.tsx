import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Layers, CheckSquare, AlertCircle } from 'lucide-react';

interface StatsCardsProps {
  stats: {
    activeClients: number;
    contentThisMonth: number;
    pendingTasks: number;
    urgentTasks: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Active Clients',
      value: stats.activeClients,
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'Content This Month',
      value: stats.contentThisMonth,
      icon: Layers,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      title: 'Pending Tasks',
      value: stats.pendingTasks,
      icon: CheckSquare,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
    },
    {
      title: 'Urgent Tasks',
      value: stats.urgentTasks,
      icon: AlertCircle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${card.bg}`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
