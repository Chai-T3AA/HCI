/**
 * CalendarEvent.jsx
 * -----------------
 * A single activity block positioned inside the calendar's time grid
 * (spec section 13, "Calendar Activity Blocks"). Height is proportional to
 * duration so workload is visible at a glance; width/left shrink when
 * `columnCount` > 1 so overlapping events sit side-by-side instead of
 * covering each other (section 17). Draggable via the native HTML5 DnD
 * API so it can be moved to a new day/time (section 16).
 */
import { AlertTriangle } from 'lucide-react';
import { formatTime12, addHours } from '../utils/dateUtils';

const PRIORITY_STYLE = {
  high: 'bg-navy text-cream border-navy-700',
  medium: 'bg-current text-cream border-current',
  low: 'bg-haze/80 text-cream border-haze',
};

export default function CalendarEvent({ activity, top, height, column, columnCount, onClick, onDragStart, deadlineSoon }) {
  const widthPct = 100 / columnCount;
  const leftPct = widthPct * column;
  const isSmall = height < 40;

  return (
    <button
      draggable
      onDragStart={(e) => onDragStart(e, activity)}
      onClick={(e) => {
        e.stopPropagation();
        onClick(activity);
      }}
      className={`absolute rounded-md border text-left px-2 py-1 overflow-hidden shadow-sm cursor-grab active:cursor-grabbing
        transition-transform hover:z-20 hover:scale-[1.02] ${PRIORITY_STYLE[activity.priority]} ${
        activity.completed ? 'opacity-50 line-through' : ''
      }`}
      style={{
        top,
        height: Math.max(height, 22),
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
      }}
      title={activity.name}
    >
      {!isSmall && (
        <p className="text-[10px] opacity-80 leading-tight">
          {formatTime12(activity.startTime)} – {formatTime12(addHours(activity.startTime, activity.duration))}
        </p>
      )}
      <p className={`font-semibold leading-tight truncate ${isSmall ? 'text-[10px]' : 'text-xs'}`}>{activity.name}</p>
      {!isSmall && (
        <p className="text-[10px] opacity-80 leading-tight flex items-center gap-1">
          {activity.priority.toUpperCase()} · {activity.duration}h
          {deadlineSoon && <AlertTriangle size={9} className="text-amber shrink-0" />}
        </p>
      )}
    </button>
  );
}
