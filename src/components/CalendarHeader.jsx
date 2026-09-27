/**
 * CalendarHeader.jsx
 * ------------------
 * Top control bar for the Calendar page (spec sections 11 & 22): week/day
 * navigation, the "Today" shortcut, a Day/Week/Month view switch, the
 * current date-range label, search, a priority filter, and the
 * "+ New Activity" action. Purely controlled — all state lives in the
 * parent (WeeklyCalendar) and is passed down as props.
 */
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, Plus, Shuffle } from 'lucide-react';
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
  onRebalance,
}) {
  return (
    <div className="border-b border-border pb-4 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={onPrev} className="p-2 rounded-lg hover:bg-textPrimary/5 text-textPrimary" aria-label="Previous">
            <ChevronLeft size={18} />
          </button>
          <button onClick={onNext} className="p-2 rounded-lg hover:bg-textPrimary/5 text-textPrimary" aria-label="Next">
            <ChevronRight size={18} />
          </button>
          <h2 className="font-serif text-xl text-textPrimary ml-1">
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button onClick={onToday} className="ml-2 text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-textPrimary hover:bg-textPrimary/5">
            Today
          </button>
        </div>

        <div className="flex items-center gap-1 bg-textPrimary/5 rounded-lg p-1">
          {VIEWS.map((v) => (
            <button
              key={v}
              onClick={() => onView(v)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md capitalize transition-colors ${
                view === v ? 'bg-primary text-onAccent' : 'text-textSecondary/90 hover:text-textPrimary'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRebalance}
            title="Redistribute this week's deadline-bound work to even out your busiest days, without cutting into your target sleep hours."
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg border border-border text-textPrimary hover:bg-textPrimary/5 transition-colors"
          >
            <Shuffle size={5} /> Rebalance Week
          </button>
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-primary text-onAccent hover:bg-primary-hover transition-colors"
          >
            <Plus size={16} /> New Activity
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
        <p className="text-sm text-textSecondary/90">{rangeLabel}</p>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-textSecondary/60" />
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search activities..."
              className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-border bg-surface/70 focus:outline-none focus:ring-2 focus:ring-primary/30 w-48"
            />
          </div>
          <div className="relative">
            <SlidersHorizontal size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-textSecondary/60 pointer-events-none" />
            <select
              value={priorityFilter}
              onChange={(e) => onPriorityFilter(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-border bg-surface/70 focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
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
