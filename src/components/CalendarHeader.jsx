/**
 * CalendarHeader.jsx
 * ------------------
 * Top control bar for the Calendar page (spec sections 11 & 22): week/day
 * navigation, the "Today" shortcut, a Day/Week/Month view switch, the
 * current date-range label, search, a priority filter, and the
 * "+ New Activity" action. Purely controlled — all state lives in the
 * parent (WeeklyCalendar) and is passed down as props.
 */
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, Plus } from 'lucide-react';
import { MONTH_NAMES } from '../utils/dateUtils';

const VIEWS = ['day', 'week', 'month'];

export default function CalendarHeader({
  currentDate,
  rangeLabel,
  view,
  onView,
  onPrev,
  onNext,
  onToday,
  search,
  onSearch,
  priorityFilter,
  onPriorityFilter,
  onAdd,
}) {
  return (
    <div className="border-b border-navy/10 pb-4 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={onPrev} className="p-2 rounded-lg hover:bg-navy/5 text-navy" aria-label="Previous">
            <ChevronLeft size={18} />
          </button>
          <button onClick={onNext} className="p-2 rounded-lg hover:bg-navy/5 text-navy" aria-label="Next">
            <ChevronRight size={18} />
          </button>
          <h2 className="font-serif text-xl text-navy ml-1">
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button onClick={onToday} className="ml-2 text-xs font-semibold px-3 py-1.5 rounded-lg border border-navy/20 text-navy hover:bg-navy/5">
            Today
          </button>
        </div>

        <div className="flex items-center gap-1 bg-navy/5 rounded-lg p-1">
          {VIEWS.map((v) => (
            <button
              key={v}
              onClick={() => onView(v)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md capitalize transition-colors ${
                view === v ? 'bg-navy text-cream' : 'text-navy/60 hover:text-navy'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-navy text-cream hover:bg-navy-600 transition-colors"
        >
          <Plus size={16} /> New Activity
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
        <p className="text-sm text-navy/60">{rangeLabel}</p>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-navy/40" />
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search activities..."
              className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-navy/15 bg-white/70 focus:outline-none focus:ring-2 focus:ring-current/30 w-48"
            />
          </div>
          <div className="relative">
            <SlidersHorizontal size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-navy/40 pointer-events-none" />
            <select
              value={priorityFilter}
              onChange={(e) => onPriorityFilter(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-navy/15 bg-white/70 focus:outline-none focus:ring-2 focus:ring-current/30 appearance-none"
            >
              <option value="all">All priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
