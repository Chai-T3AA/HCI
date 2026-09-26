/**
 * Settings.jsx
 * ------------
 * Settings page (spec section 29): Profile, Appearance, Calendar
 * preferences, Notification preferences, and Scheduling preferences.
 *
 * Everything here reads/writes through useSettings() (SettingsContext) —
 * this page has no local state of its own for the settings themselves —
 * which is what actually makes every toggle take effect elsewhere in the
 * app (Calendar, Dashboard, Sidebar, Insights all read the same context).
 */
import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';

export default function Settings() {
  const { settings, set, setMaxWorkloadPerDay } = useSettings();
  const [justSaved, setJustSaved] = useState(false);

  // Every `set()` call re-renders this page immediately (it's the same
  // object reference change React always reacts to), so we just flash a
  // "Saved" hint for a second on any change rather than tracking dirty state.
  function handleChange(key, value) {
    set(key, value);
    setJustSaved(true);
    window.clearTimeout(handleChange._t);
    handleChange._t = window.setTimeout(() => setJustSaved(false), 1200);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-navy">Settings</h1>
        {justSaved && <span className="text-xs text-current font-medium">Saved</span>}
      </div>

      <Section title="Profile">
        <Field label="Display Name">
          <input value={settings.name} onChange={(e) => handleChange('name', e.target.value)} className="input" />
        </Field>
      </Section>

      <Section title="Appearance">
        <Toggle
          label="Dark mode"
          checked={settings.darkMode}
          onChange={(v) => handleChange('darkMode', v)}
          hint="Swaps the cream page background and navy text for a dark theme. Accent colors (navy, amber, blue) stay the same."
        />
      </Section>

      <Section title="Calendar Preferences">
        <Toggle
          label="Week starts on Monday"
          checked={settings.weekStartsMonday}
          onChange={(v) => handleChange('weekStartsMonday', v)}
          hint="Off = week starts on Sunday. Applies to the Dashboard, Calendar and Insights week views."
        />
        <Toggle
          label="Show completed activities on the calendar"
          checked={settings.showCompletedOnCalendar}
          onChange={(v) => handleChange('showCompletedOnCalendar', v)}
        />
      </Section>

      <Section title="Notification Preferences">
        <Toggle
          label="Notify me about approaching deadlines"
          checked={settings.notifyDeadlines}
          onChange={(v) => handleChange('notifyDeadlines', v)}
        />
        <Toggle
          label="Warn me when a day becomes overloaded"
          checked={settings.notifyOverload}
          onChange={(v) => handleChange('notifyOverload', v)}
        />
      </Section>

      <Section title="Scheduling Preferences">
        <DefaultDurationField value={settings.defaultDuration} onChange={(v) => handleChange('defaultDuration', v)} />

        <MaxWorkloadField value={settings.maxWorkloadPerDay} onChange={setMaxWorkloadPerDay} />
      </Section>
    </div>
  );
}

/**
 * Default new-activity duration (hours) — deliberately keeps a raw string
 * "draft" while typing instead of feeding `Number(e.target.value)` straight
 * back into a controlled numeric value on every keystroke. Binding a number
 * input's `value` directly to a parsed Number causes a well-known React bug
 * on mobile keyboards: typing can desync from what's rendered (e.g. the
 * field showing "01" after clearing and retyping), because the DOM's text
 * and React's re-render race each other. Converting to Number only on blur
 * — the same pattern MaxWorkloadField already used — avoids it entirely.
 */
function DefaultDurationField({ value, onChange }) {
  const [draft, setDraft] = useState(String(value));

  function commit(raw) {
    const num = Number(raw);
    const clamped = raw === '' || Number.isNaN(num) || num <= 0 ? 0.5 : Math.round(num * 2) / 2;
    onChange(clamped);
    setDraft(String(clamped));
  }

  return (
    <Field label="Default new-activity duration (hours)">
      <input
        type="number"
        min="0.5"
        step="0.5"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        className="input max-w-[140px]"
      />
    </Field>
  );
}

/**
 * Maximum workload (hours) per day — the number the whole "turn a day red
 * when it's overloaded" feature is built on (see WorkloadOverview.jsx and
 * CalendarGrid.jsx, both of which read settings.maxWorkloadPerDay).
 *
 * Validation happens in two layers on purpose:
 *  - the <input>'s own `min`/`max`/`step` attributes stop the browser's
 *    native spinner/slider affordances and most keyboard entry from going
 *    out of range in the first place;
 *  - `setMaxWorkloadPerDay` in SettingsContext ALSO clamps to (0, 24)
 *    exclusive, because a user can still type "999" and tab away, or paste
 *    an out-of-range value, which bypasses the input attributes. The
 *    context is the real enforcement point; the input attributes are just a
 *    nicer first line of UX.
 */
function MaxWorkloadField({ value, onChange }) {
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState('');

  function commit(raw) {
    const num = Number(raw);
    if (raw === '' || Number.isNaN(num)) {
      setError('Enter a number of hours.');
      setDraft(String(value));
      return;
    }
    if (num >= 24) {
      setError('Must be below 24 hours — capped at 23.5.');
    } else if (num <= 0) {
      setError('Must be greater than 0 — set to 0.5.');
    } else {
      setError('');
    }
    onChange(num); // context clamps to (0, 24) exclusive regardless of what we pass
    setDraft(String(Math.min(23.5, Math.max(0.5, Math.round(num * 2) / 2))));
  }

  return (
    <Field label="Overwork threshold — maximum workload per day (hours)">
      <input
        type="number"
        min="0.5"
        max="23.5"
        step="0.5"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        className={`input max-w-[140px] ${error ? 'border-danger focus:ring-danger/40 focus:border-danger' : ''}`}
      />
      {error ? (
        <p className="text-xs text-danger mt-1">{error}</p>
      ) : (
        <p className="text-xs text-navy/50 mt-1">
          Must be above 0 and below 24 hours. Days over this turn orange (heavy) or red (over limit) on the Calendar
          and the Workload Overview chart.
        </p>
      )}
    </Field>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white/70 border border-navy/10 rounded-xl2 p-5 shadow-soft space-y-4">
      <h3 className="font-serif text-lg text-navy">{title}</h3>
      {children}
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

function Toggle({ label, checked, onChange, disabled, hint }) {
  return (
    <label className={`flex items-center justify-between gap-4 py-1 ${disabled ? 'opacity-60' : ''}`}>
      <span>
        <span className="text-sm text-navy">{label}</span>
        {hint && <p className="text-xs text-navy/50">{hint}</p>}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange && onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-navy' : 'bg-navy/20'}`}
      >
        {/*
          left-0.5 pins the thumb's un-translated position to the track's left
          edge explicitly. Without an explicit `left`, a <button>'s default
          UA-stylesheet `text-align: center` hijacks the CSS "static position"
          fallback used for `left: auto`, so the thumb starts from the middle
          of the track instead of its edge and the translate-x below pushes
          it outside the pill.

          bg-white (not bg-cream): this thumb needs to stay light-colored in
          BOTH themes for contrast against the navy track. bg-cream is one of
          the tokens index.css flips to a dark color in dark mode (since it's
          used elsewhere as the page/card background), which would make this
          thumb nearly invisible against the also-dark track. bg-white isn't
          part of that override, so it stays a reliable light thumb always.
        */}
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
}
