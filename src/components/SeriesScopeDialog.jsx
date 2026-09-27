/**
 * SeriesScopeDialog.jsx
 * ----------------------
 * Shown whenever an Edit or Delete action targets an activity that belongs
 * to a recurring/fixed-time series (`activity.seriesId` is set) — asks
 * which occurrences the action should apply to, Google/Outlook-Calendar
 * style, rather than silently guessing.
 *
 * Deliberately NOT shown for a calendar drag-to-reschedule: interrupting a
 * drag gesture with a modal would be disruptive, so dragging a recurring
 * block always moves just that one occurrence. This dialog only gates the
 * Edit form's Save and the Delete button.
 */
import { X } from 'lucide-react';

const OPTIONS = [
  { value: 'this', label: 'This event', hint: 'Only this occurrence is changed.' },
  { value: 'following', label: 'This and following events', hint: 'This occurrence and every later one in the series.' },
  { value: 'all', label: 'All events', hint: 'Every occurrence in the series, past and future.' },
];

export default function SeriesScopeDialog({ open, title = 'Which events?', onChoose, onCancel }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto p-4 bg-primary/40 backdrop-blur-sm">
      <div className="min-h-full flex items-center justify-center py-4">
        <div className="bg-background w-full max-w-sm rounded-xl2 shadow-soft border border-border p-6">
          <div className="flex items-start justify-between">
            <h2 className="font-serif text-lg text-textPrimary pr-4">{title}</h2>
            <button onClick={onCancel} className="text-textSecondary/75 hover:text-textPrimary shrink-0" aria-label="Cancel">
              <X size={20} />
            </button>
          </div>

          <p className="mt-1 text-xs text-textSecondary/75">
            This is part of a recurring series. Choose which occurrences this applies to.
          </p>

          <div className="mt-4 space-y-2">
            {OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChoose(opt.value)}
                className="w-full text-left px-4 py-3 rounded-lg border border-border hover:border-primary hover:bg-primary/10 transition-colors"
              >
                <span className="block text-sm font-medium text-textPrimary">{opt.label}</span>
                <span className="block text-xs text-textSecondary/75 mt-0.5">{opt.hint}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="mt-4 w-full text-center text-sm font-medium text-textSecondary hover:text-textPrimary py-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
