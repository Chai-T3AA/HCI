/**
 * PriorityBreakdown.jsx
 * ---------------------
 * Small companion card to WorkloadOverview: instead of "how many hours per
 * day" (workload), this shows "how much of this week is High/Medium/Low
 * priority" — a quick read on whether the week is actually urgent or just
 * busy. Lives directly under WorkloadOverview on the Dashboard (see the
 * flex column wrapping both in Dashboard.jsx).
 */
import PriorityBadge from './PriorityBadge';

const BAR_CLASS = { high: 'bg-sidebar', medium: 'bg-primary', low: 'bg-secondary' };

export default function PriorityBreakdown({ activities }) {
  const totals = activities.reduce(
    (acc, a) => {
      acc[a.priority] = (acc[a.priority] ?? 0) + a.duration;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  );
  const totalHours = totals.high + totals.medium + totals.low;

  return (
    <div className="bg-surface/70 border border-border rounded-xl2 p-5 shadow-soft flex-1">
      <h3 className="font-serif text-lg text-textPrimary mb-4">Priority Breakdown</h3>

      {totalHours === 0 ? (
        <p className="text-sm text-textSecondary/75 italic">Nothing scheduled this week yet.</p>
      ) : (
        <div className="space-y-3">
          {['high', 'medium', 'low'].map((priority) => {
            const hours = totals[priority];
            const pct = totalHours === 0 ? 0 : Math.round((hours / totalHours) * 100);
            return (
              <div key={priority}>
                <div className="flex items-center justify-between mb-1">
                  <PriorityBadge priority={priority} />
                  <span className="text-xs text-textSecondary/90">{hours}h · {pct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-textPrimary/5 overflow-hidden">
                  <div className={`h-full rounded-full ${BAR_CLASS[priority]} transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
