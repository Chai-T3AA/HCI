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

const LEVEL_BAR_CLASS = {
  light: 'bg-haze/50',
  moderate: 'bg-current',
  heavy: 'bg-navy',
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
    <div className="bg-white/70 border border-navy/10 rounded-xl2 p-5 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-lg text-navy">Workload Overview</h3>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-navy/50 hover:text-navy p-1 rounded-md hover:bg-navy/5"
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

          return (
            <div key={day.dateKey} className="flex-1 flex flex-col items-center gap-2 h-full">
              <div className="flex-1 w-full flex items-end justify-center">
                {/* `group` here + `group-hover:` on the tooltip below is the
                    whole tooltip mechanism — no React state involved. */}
                <div className="relative group w-full max-w-[28px] h-full flex items-end justify-center">
                  <div
                    className={`w-full rounded-t-md ${LEVEL_BAR_CLASS[day.level]} transition-all cursor-default`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <div
                    role="tooltip"
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap
                      rounded-lg bg-navy text-cream text-[10px] px-2.5 py-1.5 shadow-soft
                      opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100
                      transition-all duration-150 pointer-events-none z-20"
                  >
                    <p className="font-semibold mb-0.5">{day.hours}h total · {WORKLOAD_LABEL[day.level]}</p>
                    <p className="text-cream/80">
                      High {breakdown.high}h · Med {breakdown.medium}h · Low {breakdown.low}h
                    </p>
                    {/* little triangle pointer so the tooltip visually connects to its bar */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-navy" />
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-navy/60">{DAY_SHORT[day.date.getDay()]}</span>
              <span className="text-[10px] text-navy/40">{day.hours}h</span>
              {day.level === 'heavy' && (
                <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-700 font-semibold">
                  <AlertTriangle size={9} /> Heavy
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
