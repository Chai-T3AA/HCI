/**
 * CalendarEvent.jsx
 * -----------------
 * A single activity block positioned inside the calendar's time grid
 * (spec section 13, "Calendar Activity Blocks"). Height is proportional to
 * duration so workload is visible at a glance; width/left shrink when
 * `columnCount` > 1 so overlapping events sit side-by-side instead of
 * covering each other (section 17). Draggable via the native HTML5 DnD
 * API on mouse/pen (section 16) — that API never fires on touch at all,
 * so `onTouchDragStart/Move/End` (wired up by CalendarGrid) implement the
 * same "drag to move" behavior for touch separately.
 *
 * Two touch-specific gotchas fixed here, both invisible in code review and
 * only reproducible on a real phone (a Playwright-simulated touch doesn't
 * hit either one):
 *
 * 1. React has attached `touchstart`/`touchmove` listeners as `passive`
 *    since React 17, for scroll-performance reasons. A passive listener's
 *    `event.preventDefault()` call is silently ignored by the browser — so
 *    the `onTouchMove={onTouchDragMove}` prop below could never actually
 *    stop the page from scrolling during a drag, even though the handler
 *    itself runs fine. The fix is a real (non-passive) listener attached
 *    by hand via `addEventListener(..., { passive: false })`.
 * 2. Leaving `draggable` permanently true meant that on a touchscreen,
 *    once the browser's own long-press gesture recognizer kicked in
 *    (which it's free to do, since our preventDefault was silently
 *    failing per #1), some browsers translate that into a *native*
 *    touch-to-drag emulation — complete with a translucent ghost image
 *    that isn't ours — running in parallel with our own touch handlers
 *    and racing them for the rest of the gesture. That's what produced
 *    the extra semi-transparent "ghost" floating separately from our own
 *    dashed preview box, and why the move never committed: the back half
 *    of the gesture got consumed by that native path instead of reaching
 *    our touchend handler. `draggable` is now only true when the device
 *    actually has a mouse — touch devices skip HTML5 DnD entirely and
 *    rely purely on our own handlers, so there's nothing left to race.
 */
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Repeat } from 'lucide-react';
import { formatTime12, addHours } from '../utils/dateUtils';

const PRIORITY_STYLE = {
  high: 'bg-priorityHigh text-onSidebar border-priorityHigh',
  medium: 'bg-priorityMedium text-onAccent border-priorityMedium',
  low: 'bg-priorityLow text-onAccent border-priorityLow',
};

// True once, on mount, per device — not per render. A device with a mouse
// (`hover: hover` + `pointer: fine`) gets native HTML5 drag; a touch-only
// device (phones, most tablets) does not, so it can't race our own touch
// handlers below.
function hasMouse() {
  return typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
}

export default function CalendarEvent({
  activity, top, height, column, columnCount, onClick, onDragStart, onDragEnd,
  onTouchDragStart, onTouchDragMove, onTouchDragEnd, deadlineSoon,
}) {
  const widthPct = 100 / columnCount;
  const leftPct = widthPct * column;
  const isSmall = height < 40;
  const [draggableEnabled] = useState(hasMouse);
  const buttonRef = useRef(null);

  // A fixed-time activity (whether a lone "Fixed time" item or one
  // occurrence of a recurring series) can only be rescheduled through the
  // Edit form, never by dragging it around the grid — dragging bypasses
  // the "which occurrences does this apply to" scope prompt entirely,
  // which is exactly the guardrail a fixed/recurring commitment needs.
  const isLocked = Boolean(activity.seriesId || activity.fixedTime);

  // Real (non-passive) touchmove listener — see the file-header comment
  // for why the React `onTouchMove` prop can't reliably preventDefault.
  useEffect(() => {
    const el = buttonRef.current;
    if (!el || !onTouchDragMove) return;
    const handler = (e) => onTouchDragMove(e);
    el.addEventListener('touchmove', handler, { passive: false });
    return () => el.removeEventListener('touchmove', handler);
  }, [onTouchDragMove]);

  return (
    <button
      ref={buttonRef}
      draggable={draggableEnabled && !isLocked}
      onDragStart={(e) => {
        if (isLocked) {
          e.preventDefault(); // belt-and-suspenders — draggable=false should already stop this
          return;
        }
        onDragStart(e, activity);
      }}
      onDragEnd={onDragEnd} // fires even if the drop lands outside a valid column — used to clear the drag-preview ghost
      onTouchStart={(e) => {
        if (isLocked) return; // no touch-drag either — click through to Edit instead
        onTouchDragStart?.(e, activity);
      }}
      onTouchEnd={(e) => {
        if (isLocked) return;
        onTouchDragEnd?.(e);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(activity);
      }}
      className={`absolute rounded-md border text-left px-2 py-1 overflow-hidden shadow-sm
        transition-transform hover:z-20 hover:scale-[1.02] ${isLocked ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} ${PRIORITY_STYLE[activity.priority]} ${
        activity.completed ? 'opacity-50 line-through' : ''
      }`}
      style={{
        top,
        height: Math.max(height, 22),
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
      }}
      title={isLocked ? `${activity.name} — fixed time, use Edit to reschedule` : activity.name}
    >
      {!isSmall && (
        <p className="text-[10px] opacity-80 leading-tight">
          {formatTime12(activity.startTime)} – {formatTime12(addHours(activity.startTime, activity.duration))}
        </p>
      )}
      <p className={`font-semibold leading-tight truncate flex items-center gap-1 ${isSmall ? 'text-[10px]' : 'text-xs'}`}>
        {/* Marks a fixed-time / recurring block at a glance — see fixedTime in scheduling.js's rebalanceWeek doc comment. */}
        {(activity.seriesId || activity.fixedTime) && (
          <Repeat size={isSmall ? 8 : 10} className="opacity-75 shrink-0" />
        )}
        <span className="truncate">{activity.name}</span>
      </p>
      {!isSmall && (
        <p className="text-[10px] opacity-80 leading-tight flex items-center gap-1">
          {activity.priority.toUpperCase()} · {activity.duration}h
          {deadlineSoon && <AlertTriangle size={9} className="text-warning shrink-0" />}
        </p>
      )}
    </button>
  );
}
