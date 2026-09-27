/**
 * SettingsContext.jsx
 * -------------------
 * Single source of truth for every user preference (Settings page), the
 * same pattern ActivityContext uses for activity data. Before this file
 * existed, Settings.jsx kept its own local `useState` and wrote to
 * localStorage, but nothing else in the app ever READ that localStorage
 * back reactively — Dashboard's greeting read it once on mount (a hack),
 * and the Calendar/Sidebar/Insights pages never read it at all. That's why
 * "Week starts on Monday" and the other toggles looked broken: they saved,
 * but nothing was listening.
 *
 * Every component that needs a setting now calls `useSettings()` and gets
 * live values plus setters; changing a setting anywhere re-renders every
 * consumer immediately, and this provider is the only place that talks to
 * localStorage.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'timewise.settings.v1';

const DEFAULTS = {
  name: 'Student',
  weekStartsMonday: true,
  showCompletedOnCalendar: true,
  notifyDeadlines: true,
  notifyOverload: true,
  defaultDuration: 1,
  maxWorkloadPerDay: 8, // hours; validated to stay strictly within (0, 24) — see setMaxWorkloadPerDay
  // Used by "Rebalance Week" (Calendar page) to work out how many hours of
  // each day are actually available to schedule into — the scheduling
  // window (7am–10pm, 15h) minus this, roughly, rather than assuming every
  // waking hour is fair game. Also just a genuinely useful thing for a
  // student to be able to say explicitly. Clamped 4–12h — see
  // setTargetSleepHours.
  targetSleepHours: 8,
  darkMode: false,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);

  // Persist on every change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      console.warn('TimeWise: failed to save settings.', err);
    }
  }, [settings]);

  // Reflect darkMode onto <html> so Tailwind's `dark:` variant and the
  // .dark-scoped overrides in index.css apply app-wide, not just inside
  // whatever component happens to read the setting.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.darkMode);
  }, [settings.darkMode]);

  const set = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Clamped setter: a day's limit must stay strictly greater than 0 and
  // strictly below 24 hours — 0 would make every day permanently
  // "overloaded", and 24 isn't a meaningful limit (a day only has 24 hours
  // total). Clamping here — not just on the <input> — means it's enforced no
  // matter what ever calls this, not just the Settings page's own field.
  const setMaxWorkloadPerDay = useCallback((hours) => {
    const clamped = Math.min(23.5, Math.max(0.5, Math.round(hours * 2) / 2)); // half-hour steps, 0.5–23.5
    setSettings((prev) => ({ ...prev, maxWorkloadPerDay: clamped }));
  }, []);

  // Clamped setter, same pattern as setMaxWorkloadPerDay: 4–12 hours in
  // half-hour steps. Below 4 or above 12 isn't a realistic sleep target and
  // would make the rebalance math (usable hours = window − sleep) produce
  // either a near-zero or a negative usable window.
  const setTargetSleepHours = useCallback((hours) => {
    const clamped = Math.min(12, Math.max(4, Math.round(hours * 2) / 2));
    setSettings((prev) => ({ ...prev, targetSleepHours: clamped }));
  }, []);

  const value = {
    settings,
    set,
    setMaxWorkloadPerDay,
    setTargetSleepHours,
    // Derived convenience value: dateUtils.getWeekDays/startOfWeek expect
    // Date.getDay()'s numbering (0 = Sunday, 1 = Monday), not a boolean.
    weekStartsOn: settings.weekStartsMonday ? 1 : 0,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
