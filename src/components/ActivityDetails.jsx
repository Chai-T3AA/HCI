/**
 * ActivityDetails.jsx
 * -------------------
 * Quick-view popover opened by clicking an activity in the calendar
 * (spec section 15, "Click an activity -> Open Activity Details"). Shows
 * the full details and offers Complete / Edit / Delete. "Edit" hands off
 * to AddActivityModal (opened in edit mode by the parent Calendar page)
 * rather than duplicating the form here.
 */
import { useState } from 'react';
import { X, Clock, Tag, AlertTriangle, CheckCircle2, Circle, Pencil, Trash2, Repeat } from 'lucide-react';
import PriorityBadge from './PriorityBadge';
import SeriesScopeDialog from './SeriesScopeDialog';
import { useActivities } from '../context/ActivityContext';
import { formatTime12, addHours, deadlineLabel } from '../utils/dateUtils';

export default function ActivityDetails({ activity, onClose, onToggleComplete, onEdit }) {
  const { deleteActivity, deleteSeries } = useActivities();
  const [scopeOpen, setScopeOpen] = useState(false);

  if (!activity) return null;
  const endTime = addHours(activity.startTime, activity.duration);

  // A plain (non-series) activity deletes immediately, same as before. One
  // that belongs to a recurring series asks which occurrences to remove
  // first — see SeriesScopeDialog.
  function handleDeleteClick() {
    if (activity.seriesId) {
      setScopeOpen(true);
    } else {
      deleteActivity(activity.id);
      onClose();
    }
  }

  function handleScopeChoose(scope) {
    if (scope === 'this') {
      deleteActivity(activity.id);
    } else {
      deleteSeries(activity.seriesId, scope === 'following' ? { fromDate: activity.date } : {});
    }
    setScopeOpen(false);
    onClose();
  }

  return (
    // Scrollable OUTER wrapper, not just a centered box — on mobile, a
    // `fixed inset-0 flex items-center` box with no scroll of its own can
    // end up partly hidden behind the on-screen keyboard (or simply below
    // a short viewport) with no way to reach the rest of it. Wrapping a
    // `min-h-full flex items-center` INSIDE a scrollable outer div fixes
    // that: the browser can always scroll to reveal whatever's cut off.
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-primary/40 backdrop-blur-sm">
      <div className="min-h-full flex items-center justify-center py-4">
      <div className="bg-background w-full max-w-sm rounded-xl2 shadow-soft border border-border p-6">
        <div className="flex items-start justify-between">
          <h2 className="font-serif text-xl text-textPrimary pr-4 flex items-center gap-2">
            {activity.name}
            {activity.seriesId && <Repeat size={14} className="text-textSecondary/75 shrink-0" title="Part of a recurring series" />}
          </h2>
          <button onClick={onClose} className="text-textSecondary/75 hover:text-textPrimary shrink-0" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 space-y-2.5 text-sm text-textPrimary/80">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-textSecondary/75" />
            {activity.date} · {formatTime12(activity.startTime)} — {formatTime12(endTime)} ({activity.duration}h)
          </div>
          <div className="flex items-center gap-2">
            <Tag size={14} className="text-textSecondary/75" />
            {activity.category}
          </div>
          {activity.deadline && (
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-700" />
              {deadlineLabel(activity.deadline)} ({activity.deadline})
            </div>
          )}
          <div className="pt-1">
            <PriorityBadge priority={activity.priority} size="md" />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => onToggleComplete(activity.id)}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-textPrimary"
          >
            {activity.completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
            {activity.completed ? 'Completed' : 'Mark Complete'}
          </button>
          <div className="flex items-center gap-3">
            <button onClick={() => onEdit(activity)} className="inline-flex items-center gap-1.5 text-sm font-medium text-textPrimary hover:text-primary">
              <Pencil size={14} /> Edit
            </button>
            <button
              onClick={handleDeleteClick}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      </div>
      </div>

      <SeriesScopeDialog
        open={scopeOpen}
        title="Delete which events?"
        onChoose={handleScopeChoose}
        onCancel={() => setScopeOpen(false)}
      />
    </div>
  );
}
