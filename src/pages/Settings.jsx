/**
 * Settings.jsx
 * ------------
 * Minimal settings page (spec section 29): Profile, Appearance, Calendar
 * preferences, Notification preferences, and Scheduling preferences. Kept
 * intentionally simple, but every control is wired to real state
 * persisted in localStorage (key "timewise.settings.v1") rather than being
 * a dead/no-op control — the display name saved here is what the
 * Dashboard's "Good morning, {name}" greeting reads.
 */
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'timewise.settings.v1';
const DEFAULTS = {
  name: 'Student',
  weekStartsMonday: true,
  showCompletedOnCalendar: true,
  notifyDeadlines: true,
  notifyOverload: true,
  defaultDuration: 1,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export default function Settings() {
  const [settings, setSettings] = useState(loadSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1200);
    return () => clearTimeout(t);
  }, [settings]);

  function set(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-navy">Settings</h1>
        {saved && <span className="text-xs text-current font-medium">Saved</span>}
      </div>

      <Section title="Profile">
        <Field label="Display Name">
          <input value={settings.name} onChange={(e) => set('name', e.target.value)} className="input" />
        </Field>
      </Section>

      <Section title="Appearance">
        <Toggle
          label="Use warm cream theme (default)"
          checked={true}
          disabled
          hint="TimeWise's editorial palette is fixed for a consistent identity."
        />
      </Section>

      <Section title="Calendar Preferences">
        <Toggle
          label="Week starts on Monday"
          checked={settings.weekStartsMonday}
          onChange={(v) => set('weekStartsMonday', v)}
        />
        <Toggle
          label="Show completed activities on the calendar"
          checked={settings.showCompletedOnCalendar}
          onChange={(v) => set('showCompletedOnCalendar', v)}
        />
      </Section>

      <Section title="Notification Preferences">
        <Toggle label="Notify me about approaching deadlines" checked={settings.notifyDeadlines} onChange={(v) => set('notifyDeadlines', v)} />
        <Toggle label="Warn me when a day becomes overloaded" checked={settings.notifyOverload} onChange={(v) => set('notifyOverload', v)} />
      </Section>

      <Section title="Scheduling Preferences">
        <Field label="Default new-activity duration (hours)">
          <input
            type="number"
            min="0.5"
            step="0.5"
            value={settings.defaultDuration}
            onChange={(e) => set('defaultDuration', Number(e.target.value))}
            className="input max-w-[140px]"
          />
        </Field>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white/70 border border-navy/10 rounded-xl2 p-5 shadow-soft space-y-3">
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
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-cream shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
}
