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

export default function CalendarGrid({ days, activities, maxWorkloadPerDay, onSlotClick, onEventClick, onMoveActivity }) {
  const [now, setNow] = useState(new Date());
  const scrollRef = useRef(null);

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

  const gridHeight = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_HEIGHT;
  const nowDecimal = timeToDecimal(`${now.getHours()}:${now.getMinutes()}`);
  const nowTop = (nowDecimal - GRID_START_HOUR) * HOUR_HEIGHT;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Day column headers: date, today emphasis, workload total */}
      <div className="flex border-b border-navy/10">
        <div className="w-16 shrink-0" />
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
          const headerBg = overloaded ? 'bg-danger/10' : heavy ? 'bg-amber-500/10' : today ? 'bg-amber/10' : '';
          const dateColor = overloaded ? 'text-danger' : heavy ? 'text-amber-600' : today ? 'text-amber-700' : 'text-navy';
          const hoursColor = overloaded ? 'text-danger font-semibold' : heavy ? 'text-amber-600 font-semibold' : 'text-navy/50';
          return (
            <div key={dateKey} className={`flex-1 min-w-[120px] text-center py-3 border-l border-navy/10 ${headerBg}`}>
              <p className="text-[11px] font-semibold text-navy/50 tracking-wider">{DAY_SHORT[day.getDay()]}</p>
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

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex relative" style={{ height: gridHeight }}>
          {/* Time axis */}
          <div className="w-16 shrink-0 relative">
            {HOURS.slice(0, -1).map((hour) => (
              <div
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-[11px] text-navy/40"
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
            const columnBg = overloaded ? 'bg-danger/5' : heavy ? 'bg-amber-500/5' : today ? 'bg-amber/5' : 'hover:bg-navy/[0.02]';

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
                className={`flex-1 min-w-[120px] relative border-l border-navy/10 no-select ${columnBg}`}
              >
                {/* Hour gridlines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-t border-navy/5"
                    style={{ top: (hour - GRID_START_HOUR) * HOUR_HEIGHT }}
                  />
                ))}

                {/* Drag-preview ghost: shows exactly where the dragged activity
                    will land, snapped the same way the drop handler snaps,
                    so there's no guessing/mis-drop from an accidental swipe. */}
                {dragPreview?.dateKey === dateKey && draggingDuration && (
                  <div
                    className="absolute left-0 right-0 mx-0.5 rounded-md border-2 border-dashed border-current bg-current/10 pointer-events-none z-10"
                    style={{ top: dragPreview.top, height: draggingDuration * HOUR_HEIGHT }}
                  />
                )}

                {/* Current-time indicator (section 18) */}
                {today && nowDecimal >= GRID_START_HOUR && nowDecimal <= GRID_END_HOUR && (
                  <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: nowTop }}>
                    <div className="h-px bg-current" />
                    <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-current" />
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
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
