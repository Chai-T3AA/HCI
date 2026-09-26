/**
 * WorkloadOverview.jsx
 * --------------------
 * Bar-style visualization of hours booked per day (spec section 26).
 * Communicates "overloaded" days through height, a text label AND an
 * icon/color combo — never color alone — matching the accessibility rule.
 */
import { AlertTriangle } from 'lucide-react';
import { DAY_SHORT } from '../utils/dateUtils';
import { WORKLOAD_LABEL } from '../utils/workloadUtils';

const LEVEL_BAR_CLASS = {
  light: 'bg-haze/50',
  moderate: 'bg-current',
  heavy: 'bg-navy',
};

export default function WorkloadOverview({ weekWorkload }) {
  const maxHours = Math.max(1, ...weekWorkload.map((d) => d.hours));

  return (
    <div className="bg-white/70 border border-navy/10 rounded-xl2 p-5 shadow-soft">
      <h3 className="font-serif text-lg text-navy mb-4">Workload Overview</h3>
      <div className="flex items-end justify-between gap-3 h-40">
        {weekWorkload.map((day) => {
          const heightPct = Math.max(6, (day.hours / maxHours) * 100);
          return (
            <div key={day.dateKey} className="flex-1 flex flex-col items-center gap-2 h-full">
              <div className="flex-1 w-full flex items-end justify-center">
                <div
                  className={`w-full max-w-[28px] rounded-t-md ${LEVEL_BAR_CLASS[day.level]} transition-all`}
                  style={{ height: `${heightPct}%` }}
                  title={`${day.hours}h — ${WORKLOAD_LABEL[day.level]}`}
                />
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
