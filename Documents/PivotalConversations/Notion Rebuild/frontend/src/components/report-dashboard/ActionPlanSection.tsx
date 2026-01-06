'use client';

import { ActionPlan, ActionPlanItem } from '@/lib/report-dashboard/dashboard-types';

interface ActionPlanSectionProps {
  actionPlan: ActionPlan;
}

function ActionItem({ item }: { item: ActionPlanItem }) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-5 border-l-4 border-l-pivotal-light-blue">
      <h4 className="font-semibold text-pivotal-black mb-2">{item.title}</h4>
      <p className="text-sm text-gray-600">{item.description}</p>
    </div>
  );
}

export default function ActionPlanSection({ actionPlan }: ActionPlanSectionProps) {
  const hasWeek1_2 = actionPlan.week1_2 && actionPlan.week1_2.length > 0;
  const hasWeek3_4 = actionPlan.week3_4 && actionPlan.week3_4.length > 0;

  if (!hasWeek1_2 && !hasWeek3_4) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <p className="text-gray-500">No action plan items available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {hasWeek1_2 && (
        <div>
          <h3 className="text-lg font-semibold text-pivotal-black mb-4">Week 1-2 Priorities</h3>
          <div className="space-y-3">
            {actionPlan.week1_2.map((item, index) => (
              <ActionItem key={index} item={item} />
            ))}
          </div>
        </div>
      )}

      {hasWeek3_4 && (
        <div>
          <h3 className="text-lg font-semibold text-pivotal-black mb-4">Week 3-4 Priorities</h3>
          <div className="space-y-3">
            {actionPlan.week3_4.map((item, index) => (
              <ActionItem key={index} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
