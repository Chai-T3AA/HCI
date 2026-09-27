/**
 * AddActivityModal.jsx
 * --------------------
 * The polished "Add Activity" modal from spec section 23, doubling as the
 * "Edit Activity" form when opened with an existing activity. Collects
 * Activity Name, Date, Start Time, Duration, Deadline, Priority and
 * Category, and — whenever there's enough info (duration + priority) —
 * live-computes Smart Schedule Recommendations (section 24/25) so the user
 * can either type an exact date/time themselves or click "Apply" on a
 * suggested slot.
 *
 * On submit it calls `onSave`, which the caller wires to
 * addActivity/updateActivity from ActivityContext — because that context
 * is the single data source, saving here automatically refreshes the
 * calendar, tasks list, workload numbers, dashboard and insights.
 */
import { useEffect, useMemo, useState } from 'react';
import { X, Sparkles, Repeat } from 'lucide-react';
import { useActivities } from '../context/ActivityContext';
import { useSettings } from '../context/SettingsContext';
import { getSmartRecommendations } from '../utils/scheduling';
import { toDateKey, fromDateKey, addMonths } from '../utils/dateUtils';
import { CATEGORIES, PRIORITIES } from '../data/mockData';
import SuggestedTimeSlots from './SuggestedTimeSlots';
import SeriesScopeDialog from './SeriesScopeDialog';

// "6 months" is explicitly labeled "1 semester" per how the user described
// their own use case (a class that meets every week for a semester).
const DURATION_PRESETS = [
  { value: '1m', label: 'After 1 month', months: 1 },
  { value: '3m', label: 'After 3 months', months: 3 },
  { value: '6m', label: 'After 6 months (1 semester)', months: 6 },
  { value: '12m', label: 'After 12 months', months: 12 },
];

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']; // index = Date.getDay()

function makeEmptyForm(defaultDuration) {
  return {
    name: '',
    date: toDateKey(new Date()),
    startTime: '09:00',
    // Was hardcoded to 1 — Settings > Scheduling Preferences > "Default
    // new-activity duration" was saved but nothing ever read it back, so
    // changing it had no visible effect anywhere. Now every new (non-edit)
    // activity starts from the user's own configured default.
    duration: defaultDuration ?? 1,
    deadline: '',
    priority: 'medium',
    category: CATEGORIES[0],
  };
}

export default function AddActivityModal({ open, onClose, activityToEdit, defaultDate, defaultStartTime }) {
  const { activities, addActivity, updateActivity, addRecurringActivity, updateSeries } = useActivities();
  const { settings } = useSettings();
  const [form, setForm] = useState(() => makeEmptyForm(settings.defaultDuration));
  const [selectedSuggestionKey, setSelectedSuggestionKey] = useState(null);

  // "Fixed time" + recurrence state — see the file-header note above the
  // JSX block below for the UX reasoning. `fixedTime` alone (no recurrence)
  // just marks a one-off activity as protected from Rebalance Week; turning
  // on `recurring` as well materializes a whole series via
  // addRecurringActivity instead of a single addActivity call.
  const [fixedTime, setFixedTime] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [freq, setFreq] = useState('weekly');
  const [daysOfWeek, setDaysOfWeek] = useState([]);
  const [durationPreset, setDurationPreset] = useState('6m');
  const [customUntil, setCustomUntil] = useState('');

  // When editing an occurrence that belongs to a series, submitting opens
  // this scope prompt ("this event" / "this and following" / "all events")
  // before anything is actually written — see handleSubmit/handleScopeChoose.
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(null);

  const isEditing = Boolean(activityToEdit);

  useEffect(() => {
    if (!open) return;
    if (activityToEdit) {
      setForm({
        name: activityToEdit.name,
        date: activityToEdit.date,
        startTime: activityToEdit.startTime,
        duration: activityToEdit.duration,
        deadline: activityToEdit.deadline ?? '',
        priority: activityToEdit.priority,
        category: activityToEdit.category,
      });
      setFixedTime(Boolean(activityToEdit.fixedTime));
      setRecurring(false);
      setDaysOfWeek([]);
    } else {
      const base = makeEmptyForm(settings.defaultDuration);
      const initialDate = defaultDate ?? base.date;
      setForm({
        ...base,
        date: initialDate,
        startTime: defaultStartTime ?? base.startTime,
      });
      setFixedTime(false);
      setRecurring(false);
      // Defaults the day-of-week picker to whatever day the chosen date
      // already falls on, since that's almost always what's meant by
      // "every Monday" when the user picked a Monday to begin with.
      setDaysOfWeek([fromDateKey(initialDate).getDay()]);
    }
    setFreq('weekly');
    setDurationPreset('6m');
    setCustomUntil('');
    setSelectedSuggestionKey(null);
    setScopeDialogOpen(false);
    setPendingChanges(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activityToEdit, defaultDate, defaultStartTime]);

  // Recompute recommendations whenever the inputs that drive them change.
  // Excludes the activity being edited from the "existing activities"
  // pool so it doesn't block its own current slot. Skipped entirely for
  // fixed-time activities — an exact time was already given, there's
  // nothing to suggest.
  const suggestions = useMemo(() => {
    if (!open || fixedTime || !form.duration || !form.priority) return [];
    const pool = activities.filter((a) => a.id !== activityToEdit?.id);
    return getSmartRecommendations(
      { duration: Number(form.duration), priority: form.priority, deadline: form.deadline || null },
      pool
    );
  }, [open, fixedTime, form.duration, form.priority, form.deadline, activities, activityToEdit]);

  if (!open) return null;

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function applySuggestion(slot) {
    setForm((prev) => ({ ...prev, date: slot.dateKey, startTime: slot.startTime }));
    setSelectedSuggestionKey(`${slot.dateKey}-${slot.startTime}`);
  }

  function toggleDay(dow) {
    setDaysOfWeek((prev) => (prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow].sort()));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (fixedTime && recurring && daysOfWeek.length === 0) return; // must pick at least one day

    const payload = {
      name: form.name.trim(),
      date: form.date,
      startTime: form.startTime,
      duration: Number(form.duration),
      deadline: form.deadline || null,
      priority: form.priority,
      category: form.category,
    };

    if (isEditing) {
      const changes = { ...payload, fixedTime };
      if (activityToEdit.seriesId) {
        // Part of a recurring series — ask which occurrences this applies
        // to before writing anything.
        setPendingChanges(changes);
        setScopeDialogOpen(true);
        return;
      }
      updateActivity(activityToEdit.id, changes);
      onClose();
      return;
    }

    if (fixedTime && recurring) {
      let until = customUntil;
      if (durationPreset !== 'custom') {
        const months = DURATION_PRESETS.find((p) => p.value === durationPreset)?.months ?? 6;
        until = toDateKey(addMonths(fromDateKey(form.date), months));
      }
      if (!until) return;
      addRecurringActivity(payload, { freq, daysOfWeek, until });
    } else {
      addActivity({ ...payload, fixedTime });
    }
    onClose();
  }

  function handleScopeChoose(scope) {
    if (!pendingChanges || !activityToEdit) return;
    if (scope === 'this') {
      updateActivity(activityToEdit.id, pendingChanges);
    } else {
      // "This and following" / "All events": every occurrence keeps its
      // own date, so `date` is dropped from what gets applied.
      const { date: _ignoredDate, ...seriesChanges } = pendingChanges;
      updateSeries(activityToEdit.seriesId, seriesChanges, scope === 'following' ? { fromDate: activityToEdit.date } : {});
    }
    setScopeDialogOpen(false);
    setPendingChanges(null);
    onClose();
  }

  return (
    // Scrollable OUTER wrapper (not just the inner box) — see the long
    // comment above `return` in ActivityDetails.jsx for why: on mobile,
    // once the on-screen keyboard opens (the instant "Activity Name" is
    // focused), a `fixed inset-0 flex items-center` box with no scroll of
    // its own can get pushed partly off the now-shrunken visible area with
    // no way to reach it — the inner `overflow-y-auto` only scrolls
    // *within* the box, it can't move the box itself back into view. This
    // was consistent with what looked like an unresponsive "Add Activity"
    // button: it wasn't unresponsive, some phones just couldn't scroll
    // down far enough to actually reach it once the keyboard was up.
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-primary/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
      <div className="min-h-full flex items-center justify-center py-4">
      <div className="bg-background w-full max-w-3xl rounded-xl2 shadow-soft border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background z-10 rounded-t-xl2">
          <h2 className="font-serif text-xl text-textPrimary">{isEditing ? 'Edit Activity' : 'Add Activity'}</h2>
          <button onClick={onClose} className="text-textSecondary/75 hover:text-textPrimary" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6 p-6">
          {/* Left column: form fields */}
          <div className="space-y-4">
            <Field label="Activity Name">
              <input
                autoFocus
                required
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Statistics Assignment"
                className="input"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Start Time">
                <input
                  type="time"
                  required
                  value={form.startTime}
                  onChange={(e) => handleChange('startTime', e.target.value)}
                  className="input"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Duration (hours)">
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  required
                  value={form.duration}
                  onChange={(e) => handleChange('duration', e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Deadline (optional)">
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => handleChange('deadline', e.target.value)}
                  className="input"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Priority">
                <select value={form.priority} onChange={(e) => handleChange('priority', e.target.value)} className="input">
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p[0].toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Category">
                <select value={form.category} onChange={(e) => handleChange('category', e.target.value)} className="input">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/*
              Fixed time / recurrence panel. "Fixed time" is optional, same
              footing as "Deadline" — it just means "this happens at an
              exact time, don't let Rebalance Week ever move it," whether or
              not it also repeats. Recurrence options (frequency, which
              days, how long) are only offered while CREATING a new
              activity: a series is materialized once, up front, as
              individual rows (see ActivityContext's addRecurringActivity) —
              there's no ongoing "recurrence rule" to re-edit afterward, so
              editing an existing occurrence only touches the fields above
              plus this on/off flag, scoped via the dialog below.
            */}
            <div className="rounded-lg border border-border p-3 space-y-3 bg-surface/40">
              <label className="flex items-center justify-between gap-2 cursor-pointer">
                <span className="flex items-center gap-2 text-sm font-medium text-textPrimary">
                  <Repeat size={14} className="text-textSecondary/75" />
                  Fixed time
                </span>
                <ToggleSwitch checked={fixedTime} onChange={setFixedTime} />
              </label>
              <p className="text-xs text-textSecondary/75 -mt-2">
                For a class, meeting or other commitment at an exact time. "Rebalance Week" will never move it, even if
                it has a deadline.
              </p>

              {fixedTime && isEditing && activityToEdit?.seriesId && (
                <p className="text-xs text-textSecondary/75 pt-1 border-t border-border">
                  This activity is part of a recurring series. Saving will ask which occurrences to apply your changes
                  to.
                </p>
              )}

              {fixedTime && !isEditing && (
                <div className="pt-2 border-t border-border space-y-3">
                  <label className="flex items-center justify-between gap-2 cursor-pointer">
                    <span className="text-sm text-textPrimary">Recurring?</span>
                    <ToggleSwitch checked={recurring} onChange={setRecurring} />
                  </label>

                  {recurring && (
                    <div className="space-y-3">
                      <Field label="Frequency">
                        <select value={freq} onChange={(e) => setFreq(e.target.value)} className="input">
                          <option value="weekly">Weekly</option>
                          <option value="biweekly">Biweekly (every other week)</option>
                        </select>
                      </Field>

                      <div>
                        <span className="block text-xs font-medium text-textSecondary/90 mb-1">Repeats on</span>
                        <div className="flex flex-wrap gap-1.5">
                          {DAY_LABELS.map((label, dow) => (
                            <button
                              key={dow}
                              type="button"
                              onClick={() => toggleDay(dow)}
                              className={`w-9 h-9 rounded-full text-xs font-medium border transition-colors ${
                                daysOfWeek.includes(dow)
                                  ? 'bg-primary text-onAccent border-primary'
                                  : 'border-border text-textSecondary hover:bg-textPrimary/5'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        {daysOfWeek.length === 0 && (
                          <p className="text-xs text-danger mt-1">Pick at least one day.</p>
                        )}
                      </div>

                      <Field label="Ends">
                        <select value={durationPreset} onChange={(e) => setDurationPreset(e.target.value)} className="input">
                          {DURATION_PRESETS.map((p) => (
                            <option key={p.value} value={p.value}>
                              {p.label}
                            </option>
                          ))}
                          <option value="custom">Custom end date</option>
                        </select>
                      </Field>

                      {durationPreset === 'custom' && (
                        <Field label="Repeat until">
                          <input
                            type="date"
                            required
                            min={form.date}
                            value={customUntil}
                            onChange={(e) => setCustomUntil(e.target.value)}
                            className="input"
                          />
                        </Field>
                      )}

                      <p className="text-xs text-textSecondary/75">
                        Creates one calendar entry per occurrence. You can edit or delete a single occurrence, or the
                        whole series, later.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-textSecondary hover:bg-textPrimary/5">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-lg text-sm font-semibold bg-primary text-onAccent hover:bg-primary-hover transition-colors">
                {isEditing ? 'Save Changes' : 'Add Activity'}
              </button>
            </div>
          </div>

          {/* Right column: smart suggestions (hidden for fixed-time activities — an exact time was already given) */}
          <div>
            {fixedTime ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-textSecondary/75 h-full min-h-[160px] flex items-center justify-center text-center">
                Fixed-time activities use the exact date and time you set above — no suggestions needed.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-amber-700" />
                  <h3 className="font-serif text-base text-textPrimary">Smart Suggestion</h3>
                </div>
                <p className="text-xs text-textSecondary/75 mb-3">
                  Based on duration, priority, deadline and your current schedule.
                </p>
                <SuggestedTimeSlots suggestions={suggestions} onApply={applySuggestion} selectedKey={selectedSuggestionKey} />
              </>
            )}
          </div>
        </form>
      </div>
      </div>

      <SeriesScopeDialog
        open={scopeDialogOpen}
        onChoose={handleScopeChoose}
        onCancel={() => {
          setScopeDialogOpen(false);
          setPendingChanges(null);
        }}
      />
    </div>
  );
}

/** Small on/off switch, same visual language as Settings.jsx's Toggle but self-contained here. */
function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-primary' : 'bg-primary/20'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-onSidebar shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-textSecondary/90 mb-1">{label}</span>
      {children}
    </label>
  );
}
