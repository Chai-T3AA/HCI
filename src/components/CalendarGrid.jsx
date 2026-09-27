/**
 * CalendarGrid.jsx
 * ----------------
 * The scrollable vertical time grid that is the heart of the Calendar page
 * (spec sections 11-20): a time axis on the left, one column per day,
 * fixed hourly rows, activities positioned/sized by time, overlapping
 * events placed side-by-side, a live current-time indicator, per-day
 * workload totals, and today's subtle highlight. Also owns the
 * click-empty-slot -> add, and native drag-and-drop -> move, interactions.
 *
 * Used for both the Week view (7 days) and the Day view (1 day) — the
 * caller just passes a different `days` array.
 */
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import CalendarEvent from './CalendarEvent';
import { DAY_SHORT, isToday, timeToDecimal, toDateKey, deadlineLabel } from '../utils/dateUtils';
import { layoutDayActivities } from '../utils/scheduling';
import { getHoursForDate, getWorkloadLevel, isOverloaded, WORKLOAD_LABEL } from '../utils/workloadUtils';

export const GRID_START_HOUR = 7;
export const GRID_END_HOUR = 22;
export const HOUR_HEIGHT = 64; // px per hour — drives every position/height calc below

const HOURS = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR + 1 }, (_, i) => GRID_START_HOUR + i);

function formatHourLabel(hour) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${period}`;
}

/**
 * Shared snapping math: turns a raw mouse/touch Y position (relative to the
 * top of a day column) into a decimal hour clamped to the grid and snapped
 * to the nearest 30 minutes. Both the live drag-preview (onDragOver, below)
 * and the actual drop handler use this, so the ghost box you see while
 * dragging always matches exactly where the activity will actually land.
 */
function snapToSlot(clientY, columnTop) {
  const rawHour = GRID_START_HOUR + (clientY - columnTop) / HOUR_HEIGHT;
  const snapped = Math.round(rawHour * 2) / 2;
  return Math.min(Math.max(snapped, GRID_START_HOUR), GRID_END_HOUR - 0.5);
}

function decimalHourToTimeString(decimal) {
  const h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// How far (px) a touch has to travel horizontally, and how much more
// horizontal than vertical movement it needs, before an edge-swipe counts
// as "change week" rather than noise. Matches the threshold the old
// WeeklyCalendar-level swipe used.
const SWIPE_THRESHOLD_PX = 60;

// Narrower on phones (fits closer to 4 columns in view instead of ~2) —
// the 120px desktop width was designed for a mouse-driven wide screen and
// felt oversized once the grid actually became scrollable on mobile.
function useDayColWidth() {
  const [width, setWidth] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 640 ? 84 : 120));
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth < 640 ? 84 : 120);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

export default function CalendarGrid({ days, activities, maxWorkloadPerDay, onSlotClick, onEventClick, onMoveActivity, onSwipeWeek }) {
  const [now, setNow] = useState(new Date());
  const scrollRef = useRef(null);
  const dayColWidth = useDayColWidth();
  // The 7 day-columns (120px min-width each = up to 840px) are wider than
  // any phone screen. Previously they had no scroll container of their
  // own, so anything past what fit in the viewport was silently clipped by
  // `overflow-x-hidden` on the page's <main> — Thursday onward simply
  // didn't exist anywhere on screen, not even by scrolling. `hScrollRef` is
  // this component's own horizontal scroll region, independent of that
  // page-level clipping, so every day is actually reachable on mobile.
  const hScrollRef = useRef(null);
  const hTouchStart = useRef(null); // { x, y, scrollLeft } | null

  // What's currently being dragged (if anything) and where it would land if
  // dropped right now. `dragPreview` drives the dashed ghost box rendered
  // inside the hovered day column further down.
  const [draggingDuration, setDraggingDuration] = useState(null);
  const [dragPreview, setDragPreview] = useState(null); // { dateKey, top } | null

  // Keep the current-time indicator live (section 18).
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll so "now" (or 8 AM if today isn't visible) starts near the top on first render.
  useEffect(() => {
    if (!scrollRef.current) return;
    const anchorHour = Math.max(GRID_START_HOUR, now.getHours() - 1);
    scrollRef.current.scrollTop = (anchorHour - GRID_START_HOUR) * HOUR_HEIGHT;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDrop(e, dateKey) {
    e.preventDefault();
    const activityId = e.dataTransfer.getData('text/activity-id');
    if (!activityId) return;
    const container = e.currentTarget.getBoundingClientRect();
    const snappedHour = snapToSlot(e.clientY, container.top);
    onMoveActivity(activityId, dateKey, decimalHourToTimeString(snappedHour));
    setDragPreview(null);
    setDraggingDuration(null);
  }

  // --- Touch-based drag-to-move (mobile) ---
  // HTML5 Drag-and-Drop (used above for mouse) is defined by spec to never
  // fire from touch input at all — not "buggy on mobile", just genuinely
  // not part of that API. Without this, touching an activity and dragging
  // it sideways did nothing locally, but the gesture still bubbled up to
  // WeeklyCalendar's swipe-to-change-week handler, which read it as "swipe"
  // and jumped the whole view to the next week. `touchDragRef` tracks which
  // activity is being dragged; `elementFromPoint` finds which day column is
  // currently under the finger (there's no native touch equivalent of
  // dragover's target element). Each day column below gets a
  // `data-day-col` attribute so this lookup works.
  const touchDragRef = useRef(null); // { activityId, duration } | null

  function handleEventTouchStart(e, activity) {
    // Stops this touch from ever reaching the edge-swipe handler below —
    // the two gesture systems (drag-an-activity vs swipe-the-week) would
    // otherwise fight over the same finger motion.
    e.stopPropagation();
    touchDragRef.current = { activityId: activity.id, duration: activity.duration };
    setDraggingDuration(activity.duration);
  }

  function handleEventTouchMove(e) {
    if (!touchDragRef.current) return;
    e.stopPropagation();
    e.preventDefault(); // don't let the page scroll while actively dragging
    const touch = e.touches[0];
    const column = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('[data-day-col]');
    if (!column) return;
    const dateKey = column.dataset.dayCol;
    const columnTop = column.getBoundingClientRect().top;
    const snappedHour = snapToSlot(touch.clientY, columnTop);
    setDragPreview({ dateKey, top: (snappedHour - GRID_START_HOUR) * HOUR_HEIGHT });
  }

  function handleEventTouchEnd(e) {
    if (!touchDragRef.current) return;
    e.stopPropagation();
    const touch = e.changedTouches[0];
    const column = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('[data-day-col]');
    if (column) {
      const dateKey = column.dataset.dayCol;
      const columnTop = column.getBoundingClientRect().top;
      const snappedHour = snapToSlot(touch.clientY, columnTop);
      onMoveActivity(touchDragRef.current.activityId, dateKey, decimalHourToTimeString(snappedHour));
    }
    touchDragRef.current = null;
    setDragPreview(null);
    setDraggingDuration(null);
  }

  // --- Edge-swipe to change week/day (mobile) ---
  // Lives here (not in WeeklyCalendar) because it needs this component's
  // own horizontal scroll position to decide what a sideways swipe means.
  // A phone is only wide enough to show ~3 of the 7 day-columns at once, so
  // "swipe left/right" is now genuinely ambiguous: it could mean "scroll
  // over to see Thursday" or "jump to next week" — those can't both fire
  // for the same gesture. The rule: if you're mid-week (not scrolled all
  // the way to either edge), the swipe scrolls within the week, same as
  // any horizontally-scrollable list. Only a swipe that starts already at
  // the leftmost/rightmost day changes the week — the same "edge swipe"
  // pattern most calendar and gallery apps use, so it never fights with
  // just wanting to see the rest of this week's days.
  function handleGridTouchStart(e) {
    const t = e.touches[0];
    hTouchStart.current = { x: t.clientX, y: t.clientY, scrollLeft: hScrollRef.current?.scrollLeft ?? 0 };
  }

  function handleGridTouchEnd(e) {
    if (!hTouchStart.current || !onSwipeWeek) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - hTouchStart.current.x;
    const dy = t.clientY - hTouchStart.current.y;
    const startScrollLeft = hTouchStart.current.scrollLeft;
    hTouchStart.current = null;

    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return; // not a horizontal swipe
    const el = hScrollRef.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    const atLeftEdge = startScrollLeft <= 2;
    const atRightEdge = startScrollLeft >= maxScrollLeft - 2;
    if (dx > 0 && atLeftEdge) onSwipeWeek(-1); // swiped right, already showing the first day -> previous week
    else if (dx < 0 && atRightEdge) onSwipeWeek(1); // swiped left, already showing the last day -> next week
    // otherwise: the swipe just scrolled within the week (native behavior); don't also change week
  }

  const gridHeight = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_HEIGHT;
  const nowDecimal = timeToDecimal(`${now.getHours()}:${now.getMinutes()}`);
  const nowTop = (nowDecimal - GRID_START_HOUR) * HOUR_HEIGHT;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Own horizontal scroll region, independent of the page's
          overflow-x-hidden — without this, days past what fits on a phone
          screen (~3 of the 7 columns) weren't just hard to reach, they were
          clipped out of the page entirely, unreachable by any gesture. */}
      <div
        ref={hScrollRef}
        onTouchStart={handleGridTouchStart}
        onTouchEnd={handleGridTouchEnd}
        className="flex-1 min-h-0 overflow-x-auto"
      >
        {/* Explicit pixel width (64px time axis + 120px per day), not
            `min-w-max` — that class asks the browser to compute this
            container's intrinsic max-content width from `flex-1` children,
            and flex-1 (flex-basis: 0%) makes that computation unreliable
            across browsers, silently collapsing back to the viewport width
            with no error. An explicit number always works. */}
        <div className="flex flex-col h-full" style={{ width: 64 + days.length * dayColWidth, minWidth: '100%' }}>
      {/* Day column headers: date, today emphasis, workload total */}
      <div className="flex border-b border-border">
        <div className="w-16 shrink-0 left-0 bg-background z-20" />
        {days.map((day) => {
          const dateKey = toDateKey(day);
          const hours = getHoursForDate(activities, dateKey);
          const level = getWorkloadLevel(hours);
          const overloaded = isOverloaded(hours, maxWorkloadPerDay);
          // "Heavy" (generic light/moderate/heavy scale) vs "today" (brand
          // sandy amber) are visually distinct tokens on purpose — heavy uses
          // Tailwind's true orange (amber-500/600/700), today uses the
          // brand's `amber` DEFAULT. `overloaded` (over the user's own
          // Settings limit) always wins over both, in red, same as the
          // Workload Overview bar for this exact day.
          const heavy = !overloaded && level === 'heavy';
          const today = isToday(day);
          const headerBg = overloaded ? 'bg-danger/10' : heavy ? 'bg-amber-500/10' : today ? 'bg-accent/10' : '';
          const dateColor = overloaded ? 'text-danger' : heavy ? 'text-amber-600' : today ? 'text-amber-700' : 'text-textPrimary';
          const hoursColor = overloaded ? 'text-danger font-semibold' : heavy ? 'text-amber-600 font-semibold' : 'text-textSecondary/75';
          return (
            <div
              key={dateKey}
              style={{ minWidth: dayColWidth }}
              className={`flex-1 text-center py-3 border-l border-border ${headerBg}`}
            >
              <p className="text-[11px] font-semibold text-textSecondary/75 tracking-wider">{DAY_SHORT[day.getDay()]}</p>
              <p className={`font-serif text-xl ${dateColor}`}>{day.getDate()}</p>
              <p className={`text-[11px] mt-0.5 ${hoursColor}`}>{hours > 0 ? `${hours}h` : '—'}</p>
              {overloaded ? (
                <span className="inline-flex items-center gap-0.5 text-[9px] text-danger font-semibold">
                  <AlertTriangle size={9} /> Over limit
                </span>
              ) : (
                heavy && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-700 font-semibold">
                    <AlertTriangle size={9} /> {WORKLOAD_LABEL.heavy}
                  </span>
                )
              )}
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid (vertical only — horizontal scroll is the
          ancestor above, shared with the header so they move together) */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex relative" style={{ height: gridHeight }}>
          {/* Time axis — pinned to the left edge with `sticky` so it stays
              visible while horizontally scrolling through the days. */}
          <div className="w-16 shrink-0 relative sticky left-0 bg-background z-20">
            {HOURS.slice(0, -1).map((hour) => (
              <div
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-[11px] text-textSecondary/60"
                style={{ top: (hour - GRID_START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT }}
              >
                {formatHourLabel(hour)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dateKey = toDateKey(day);
            const dayActivities = activities.filter((a) => a.date === dateKey);
            const positioned = layoutDayActivities(dayActivities);
            const dayHours = getHoursForDate(activities, dateKey);
            const overloaded = isOverloaded(dayHours, maxWorkloadPerDay);
            const heavy = !overloaded && getWorkloadLevel(dayHours) === 'heavy';
            const today = isToday(day);
            const soonKey = toDateKey(new Date(Date.now() + 86400000));
            const columnBg = overloaded ? 'bg-danger/5' : heavy ? 'bg-amber-500/5' : today ? 'bg-accent/5' : 'hover:bg-textPrimary/[0.03]';

            return (
              <div
                key={dateKey}
                onDragOver={(e) => {
                  e.preventDefault(); // required for onDrop to fire at all — see MDN's HTML5 DnD docs
                  const columnTop = e.currentTarget.getBoundingClientRect().top;
                  const snappedHour = snapToSlot(e.clientY, columnTop);
                  setDragPreview({ dateKey, top: (snappedHour - GRID_START_HOUR) * HOUR_HEIGHT });
                }}
                onDragLeave={() => setDragPreview((prev) => (prev?.dateKey === dateKey ? null : prev))}
                onDrop={(e) => handleDrop(e, dateKey)}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const offsetY = e.clientY - rect.top;
                  const rawHour = GRID_START_HOUR + offsetY / HOUR_HEIGHT;
                  const snapped = Math.round(rawHour * 2) / 2;
                  const h = Math.floor(snapped);
                  const m = Math.round((snapped - h) * 60);
                  onSlotClick(dateKey, `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
                }}
                data-day-col={dateKey}
                style={{ minWidth: dayColWidth }}
                className={`flex-1 relative border-l border-border no-select ${columnBg}`}
              >
                {/* Hour gridlines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-t border-border/60"
                    style={{ top: (hour - GRID_START_HOUR) * HOUR_HEIGHT }}
                  />
                ))}

                {/* Drag-preview ghost: shows exactly where the dragged activity
                    will land, snapped the same way the drop handler snaps,
                    so there's no guessing/mis-drop from an accidental swipe. */}
                {dragPreview?.dateKey === dateKey && draggingDuration && (
                  <div
                    className="absolute left-0 right-0 mx-0.5 rounded-md border-2 border-dashed border-primary bg-primary/10 pointer-events-none z-10"
                    style={{ top: dragPreview.top, height: draggingDuration * HOUR_HEIGHT }}
                  />
                )}

                {/* Current-time indicator (section 18) */}
                {today && nowDecimal >= GRID_START_HOUR && nowDecimal <= GRID_END_HOUR && (
                  <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: nowTop }}>
                    <div className="h-px bg-primary" />
                    <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-primary" />
                  </div>
                )}

                {/* Activities */}
                {positioned.map((activity) => (
                  <CalendarEvent
                    key={activity.id}
                    activity={activity}
                    top={(timeToDecimal(activity.startTime) - GRID_START_HOUR) * HOUR_HEIGHT}
                    height={activity.duration * HOUR_HEIGHT}
                    column={activity.column}
                    columnCount={activity.columnCount}
                    deadlineSoon={activity.deadline && activity.deadline <= soonKey && !activity.completed}
                    onClick={onEventClick}
                    onDragStart={(e, a) => {
                      e.dataTransfer.setData('text/activity-id', a.id);
                      setDraggingDuration(a.duration); // so the ghost box below is sized to match
                    }}
                    onDragEnd={() => {
                      setDragPreview(null);
                      setDraggingDuration(null);
                    }}
                    onTouchDragStart={handleEventTouchStart}
                    onTouchDragMove={handleEventTouchMove}
                    onTouchDragEnd={handleEventTouchEnd}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}
