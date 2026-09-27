/**
 * WorkloadOverview.jsx
 * --------------------
 * Bar-style visualization of hours booked per day (spec section 26).
 * Communicates "overloaded" days through height, a text label AND an
 * icon/color combo — never color alone — matching the accessibility rule.
 *
 * Two interactive additions on top of the original static chart:
 *  - An expand/collapse toggle (`expanded` state) so the chart isn't stuck
 *    at one fixed height — useful once a heavy week makes bars hard to
 *    compare at the compact size.
 *  - A hover tooltip per bar breaking hours down by priority (High/Medium/
 *    Low), built with Tailwind's `group`/`group-hover` pattern rather than
 *    JS state — the tooltip is just a normally-hidden element that a CSS
 *    rule reveals when its ancestor `.group` is hovered, so there's no
 *    onMouseEnter/onMouseLeave bookkeeping needed.
 */
import { useState } from 'react';
import { AlertTriangle, Maximize2, Minimize2 } from 'lucide-react';
import { DAY_SHORT } from '../utils/dateUtils';
import { WORKLOAD_LABEL } from '../utils/workloadUtils';

// Heavy uses the same true-orange token as the Calendar's "Heavy" day tint
// (amber-500/600/700, Tailwind's default orange scale — distinct from the
// brand's sandy `amber` DEFAULT used for "today"). `overloaded` below always
// wins and uses `danger` (red) — same token the Calendar uses for a day over
// the user's own limit — so the bar color always matches the calendar cell
// color for that same day.
const LEVEL_BAR_CLASS = {
  light: 'bg-secondary/50',
  moderate: 'bg-primary',
  heavy: 'bg-amber-500',
};

/** Sums each day's activities by priority, e.g. { high: 3, medium: 1.5, low: 0 }. */
function getPriorityBreakdown(dayActivities) {
  return dayActivities.reduce(
    (acc, a) => {
      acc[a.priority] = (acc[a.priority] ?? 0) + a.duration;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  );
}

export default function WorkloadOverview({ weekWorkload }) {
  const [expanded, setExpanded] = useState(false);
  const maxHours = Math.max(1, ...weekWorkload.map((d) => d.hours));
  const chartHeightClass = expanded ? 'h-64' : 'h-40';

  return (
    <div className="bg-surface/70 border border-border rounded-xl2 p-5 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-lg text-textPrimary">Workload Overview</h3>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-textSecondary/75 hover:text-textPrimary p-1 rounded-md hover:bg-textPrimary/5"
          aria-label={expanded ? 'Shrink chart' : 'Expand chart'}
          title={expanded ? 'Shrink chart' : 'Expand chart'}
        >
          {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>

      <div className={`flex items-end justify-between gap-3 transition-[height] duration-200 ${chartHeightClass}`}>
        {weekWorkload.map((day) => {
          const heightPct = Math.max(6, (day.hours / maxHours) * 100);
          const breakdown = getPriorityBreakdown(day.activities);
          // `overloaded` (from getWeekWorkload, driven by Settings > Maximum
          // workload per day) always wins over the generic light/moderate/
          // heavy scale — it's the user's own limit, not a fixed default.
          const barClass = day.overloaded ? 'bg-danger' : LEVEL_BAR_CLASS[day.level];

          return (
            <div key={day.dateKey} className="flex-1 flex flex-col items-center gap-2 h-full">
              <div className="flex-1 w-full flex items-end justify-center">
                {/* `group` here + `group-hover:` on the tooltip below is the
                    whole tooltip mechanism — no React state involved. */}
                <div className="relative group w-full max-w-[28px] h-full flex items-end justify-center">
                  <div
                    className={`w-full rounded-t-md ${barClass} transition-all cursor-default ${
                      day.overloaded ? 'ring-2 ring-danger/40' : ''
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <div
                    role="tooltip"
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap
                      rounded-lg bg-sidebar text-onSidebar text-[10px] px-2.5 py-1.5 shadow-soft
                      opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100
                      transition-all duration-150 pointer-events-none z-20"
                  >
                    <p className="font-semibold mb-0.5">
                      {day.hours}h total · {day.overloaded ? 'Over limit' : WORKLOAD_LABEL[day.level]}
                    </p>
                    <p className="text-onSidebar/80">
                      High {breakdown.high}h · Med {breakdown.medium}h · Low {breakdown.low}h
                    </p>
                    {/* little triangle pointer so the tooltip visually connects to its bar */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-sidebar" />
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-textSecondary/90">{DAY_SHORT[day.date.getDay()]}</span>
              {/* Status folded into one compact line instead of a separate
                  badge row underneath: color + icon (when flagged) + hours,
                  all in a single element. The full "Over limit"/"Heavy"
                  wording still lives in the tooltip above on hover, so the
                  icon+color combo here isn't the only place the state is
                  spelled out — it's just the at-a-glance version. */}
              <span
                className={`inline-flex items-center gap-0.5 text-[10px] ${
                  day.overloaded
                    ? 'text-danger font-semibold'
                    : day.level === 'heavy'
                    ? 'text-amber-600 font-semibold'
                    : 'text-textSecondary/60'
                }`}
              >
                {(day.overloaded || day.level === 'heavy') && <AlertTriangle size={9} />}
                {day.hours}h
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
