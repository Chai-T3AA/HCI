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
import { X, Sparkles } from 'lucide-react';
import { useActivities } from '../context/ActivityContext';
import { getSmartRecommendations } from '../utils/scheduling';
import { toDateKey } from '../utils/dateUtils';
import { CATEGORIES, PRIORITIES } from '../data/mockData';
import SuggestedTimeSlots from './SuggestedTimeSlots';

const emptyForm = {
  name: '',
  date: toDateKey(new Date()),
  startTime: '09:00',
  duration: 1,
  deadline: '',
  priority: 'medium',
  category: CATEGORIES[0],
};

export default function AddActivityModal({ open, onClose, activityToEdit, defaultDate, defaultStartTime }) {
  const { activities, addActivity, updateActivity } = useActivities();
  const [form, setForm] = useState(emptyForm);
  const [selectedSuggestionKey, setSelectedSuggestionKey] = useState(null);

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
    } else {
      setForm({
        ...emptyForm,
        date: defaultDate ?? emptyForm.date,
        startTime: defaultStartTime ?? emptyForm.startTime,
      });
    }
    setSelectedSuggestionKey(null);
  }, [open, activityToEdit, defaultDate, defaultStartTime]);

  // Recompute recommendations whenever the inputs that drive them change.
  // Excludes the activity being edited from the "existing activities"
  // pool so it doesn't block its own current slot.
  const suggestions = useMemo(() => {
    if (!open || !form.duration || !form.priority) return [];
    const pool = activities.filter((a) => a.id !== activityToEdit?.id);
    return getSmartRecommendations(
      { duration: Number(form.duration), priority: form.priority, deadline: form.deadline || null },
      pool
    );
  }, [open, form.duration, form.priority, form.deadline, activities, activityToEdit]);

  if (!open) return null;

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function applySuggestion(slot) {
    setForm((prev) => ({ ...prev, date: slot.dateKey, startTime: slot.startTime }));
    setSelectedSuggestionKey(`${slot.dateKey}-${slot.startTime}`);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;

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
      updateActivity(activityToEdit.id, payload);
    } else {
      addActivity(payload);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
      <div className="bg-cream w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl2 shadow-soft border border-navy/10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy/10 sticky top-0 bg-cream z-10">
          <h2 className="font-serif text-xl text-navy">{isEditing ? 'Edit Activity' : 'Add Activity'}</h2>
          <button onClick={onClose} className="text-navy/50 hover:text-navy" aria-label="Close">
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

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-navy/70 hover:bg-navy/5">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-lg text-sm font-semibold bg-navy text-cream hover:bg-navy-600 transition-colors">
                {isEditing ? 'Save Changes' : 'Add Activity'}
              </button>
            </div>
          </div>

          {/* Right column: smart suggestions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-amber-700" />
              <h3 className="font-serif text-base text-navy">Smart Suggestion</h3>
            </div>
            <p className="text-xs text-navy/50 mb-3">
              Based on duration, priority, deadline and your current schedule.
            </p>
            <SuggestedTimeSlots suggestions={suggestions} onApply={applySuggestion} selectedKey={selectedSuggestionKey} />
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-navy/60 mb-1">{label}</span>
      {children}
    </label>
  );
}
