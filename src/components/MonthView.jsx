/**
 * MonthView.jsx
 * -------------
 * Traditional monthly calendar grid (spec section 22, "MONTH VIEW —
 * Traditional monthly calendar with activity indicators"). Each cell shows
 * the date and up to 3 activities as compact chips (colored by priority),
 * plus a "+N more" overflow indicator. Clicking a day jumps the parent to
 * Day view for that date; clicking an activity chip opens its details.
 */
import { addDays, startOfWeek, toDateKey, isToday, getOrderedDayLabels } from '../utils/dateUtils';

const PRIORITY_DOT = { high: 'bg-navy', medium: 'bg-current', low: 'bg-haze' };

export default function MonthView({ monthDate, activities, weekStartsOn = 1, onSelectDay, onEventClick }) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = startOfWeek(firstOfMonth, weekStartsOn);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const headerLabels = getOrderedDayLabels(weekStartsOn);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="grid grid-cols-7 border-b border-navy/10 pb-2 mb-1">
        {headerLabels.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-navy/50 tracking-wider">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6 flex-1 gap-1 overflow-y-auto">
        {cells.map((day) => {
          const dateKey = toDateKey(day);
          const dayActivities = activities.filter((a) => a.date === dateKey);
          const inMonth = day.getMonth() === month;
          const today = isToday(day);

          return (
            <button
              key={dateKey}
              onClick={() => onSelectDay(day)}
              className={`text-left border rounded-lg p-1.5 flex flex-col min-h-[92px] transition-colors ${
                inMonth ? 'bg-white/60 border-navy/10' : 'bg-navy/[0.02] border-navy/5'
              } ${today ? 'ring-2 ring-amber' : 'hover:border-current/40'}`}
            >
              <span
                className={`text-xs font-semibold mb-1 ${
                  !inMonth ? 'text-navy/30' : today ? 'text-amber-700' : 'text-navy/70'
                }`}
              >
                {day.getDate()}
              </span>
              <div className="space-y-0.5 overflow-hidden">
                {dayActivities.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(a);
                    }}
                    className={`text-[9px] truncate rounded px-1 py-0.5 text-cream ${PRIORITY_DOT[a.priority]} ${
                      a.completed ? 'opacity-50 line-through' : ''
                    }`}
                  >
                    {a.name}
                  </div>
                ))}
                {dayActivities.length > 3 && (
                  <p className="text-[9px] text-navy/40 px-1">+{dayActivities.length - 3} more</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
