/**
 * ActivityCard.jsx
 * ----------------
 * Compact card used by the Weekly Planner list and the Tasks page to show
 * one activity: name, time range, duration, priority, category, deadline
 * indicator, and quick actions (complete / edit / delete). Kept separate
 * from CalendarEvent (which renders the same data positioned inside the
 * time grid) because the two need very different layouts.
 */
import { Clock, AlertTriangle, CheckCircle2, Circle, Pencil, Trash2 } from 'lucide-react';
import PriorityBadge from './PriorityBadge';
import { formatTime12, addHours, deadlineLabel, toDateKey } from '../utils/dateUtils';

export default function ActivityCard({ activity, onToggleComplete, onEdit, onDelete }) {
  const endTime = addHours(activity.startTime, activity.duration);
  const isUrgentDeadline =
    activity.deadline && !activity.completed && activity.deadline <= toDateKey(new Date(Date.now() + 86400000));

  return (
    <div
      className={`group rounded-xl border p-3.5 bg-white/70 transition-colors ${
        activity.completed ? 'border-navy/10 opacity-60' : 'border-navy/10 hover:border-current/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={() => onToggleComplete(activity.id)}
          className="mt-0.5 text-navy/40 hover:text-current shrink-0"
          aria-label={activity.completed ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {activity.completed ? <CheckCircle2 size={18} className="text-current" /> : <Circle size={18} />}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold text-navy truncate ${activity.completed ? 'line-through' : ''}`}>
            {activity.name}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-navy/60 mt-0.5">
            <Clock size={12} />
            {formatTime12(activity.startTime)} — {formatTime12(endTime)} · {activity.duration}h
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <PriorityBadge priority={activity.priority} />
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-haze/15 text-current font-medium">
              {activity.category}
            </span>
            {activity.deadline && !activity.completed && (
              <span
                className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  isUrgentDeadline ? 'bg-amber/25 text-amber-700' : 'bg-navy/5 text-navy/60'
                }`}
              >
                <AlertTriangle size={10} />
                {deadlineLabel(activity.deadline)}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(activity)} className="text-navy/50 hover:text-current" aria-label="Edit">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(activity.id)} className="text-navy/50 hover:text-red-600" aria-label="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
