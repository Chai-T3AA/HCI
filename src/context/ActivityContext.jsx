/**
 * ActivityContext.jsx
 * -------------------
 * THE single source of truth for activity/task data (PRD section 35,
 * "Data Synchronization" — one central store, no duplicated state).
 *
 * Every page and component that reads or writes activities (Dashboard,
 * Calendar, Tasks, Insights, the Add/Edit modal, the smart-recommendation
 * panel) goes through the `useActivities()` hook exported here instead of
 * keeping its own copy of the list. Because React re-renders every
 * consumer of a context when its value changes, this automatically keeps
 * the calendar, task list, workload numbers and insights in sync the
 * instant an activity is added, edited, completed or deleted — there is
 * no manual "refresh other components" step anywhere in the app.
 *
 * Persistence: the activity list is mirrored to localStorage on every
 * change, so a page refresh (or closing/reopening the browser) doesn't
 * lose the user's schedule.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initialActivities } from '../data/mockData';
import { generateRecurringDates } from '../utils/recurrence';

const STORAGE_KEY = 'timewise.activities.v1';
const ActivityContext = createContext(null);

/**
 * `crypto.randomUUID()` only exists in a "secure context" (HTTPS, or
 * http://localhost) — per spec, NOT a plain-HTTP page loaded from a LAN
 * address like http://192.168.x.x:5173, which is exactly how this app
 * gets opened on a phone during local dev (typing the dev server's
 * network URL into the phone's browser). On that origin the whole
 * `crypto.randomUUID` method doesn't exist, so calling it threw
 * immediately — silently, since nothing here caught it — which is why
 * "Add Activity" (and "Save Changes") could look like they did nothing
 * at all on mobile while working fine on desktop at localhost.
 *
 * `crypto.getRandomValues` has no such restriction (it works in any
 * context), so it's used here instead whenever it's available, with a
 * `Math.random` fallback only for the (very old / unusual) case where
 * even that is missing. This ID is just a client-side React key /
 * localStorage key, never used for anything security-sensitive, so
 * `Math.random`'s weaker randomness is an acceptable last resort.
 */
function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {
      // fall through to the manual generator below
    }
  }
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('TimeWise: failed to read saved activities, starting fresh.', err);
  }
  // First-ever visit (or corrupted storage): seed with realistic mock data.
  return initialActivities;
}

export function ActivityProvider({ children }) {
  const [activities, setActivities] = useState(loadFromStorage);

  // Whenever the list changes, mirror it to localStorage immediately so
  // nothing added, edited, dragged or completed is ever lost on refresh.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
    } catch (err) {
      console.warn('TimeWise: failed to save activities to localStorage.', err);
    }
  }, [activities]);

  const addActivity = useCallback((activity) => {
    const withId = { id: generateId(), completed: false, ...activity };
    setActivities((prev) => [...prev, withId]);
    return withId;
  }, []);

  const updateActivity = useCallback((id, changes) => {
    setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, ...changes } : a)));
  }, []);

  const deleteActivity = useCallback((id) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const toggleComplete = useCallback((id) => {
    setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a)));
  }, []);

  /** Used by drag-and-drop: moves an activity to a new date/startTime in one atomic update. */
  const moveActivity = useCallback((id, { date, startTime }) => {
    setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, date, startTime } : a)));
  }, []);

  /**
   * Creates a "Fixed time" activity that repeats weekly/biweekly across a
   * date range (e.g. a class that meets every Monday for a semester).
   * Unlike a normal add, this materializes ONE concrete activity row per
   * occurrence up front (rather than storing an abstract "repeat" rule and
   * expanding it at render time) — simplest thing that works at this app's
   * scale (a 6-month weekly series is ~26 rows), and it means the calendar,
   * Tasks page, drag-and-drop and rebalance all keep working against plain
   * activity objects with no special-casing anywhere else in the app.
   *
   * All generated occurrences share one `seriesId` (used by updateSeries /
   * deleteSeries below to act on the group) and are always `fixedTime:
   * true` — a fixed-time item is never something Rebalance Week should move,
   * whether or not it happens to carry a deadline.
   *
   * @param {Object} baseActivity - everything BUT `date`/`id`/`seriesId`
   *   (name, startTime, duration, priority, category, etc.) — `baseActivity.date`
   *   is used only as the series' anchor/start date.
   * @param {Object} recurrence - { freq: 'weekly'|'biweekly', daysOfWeek: number[], until: 'YYYY-MM-DD' }
   * @returns {{ seriesId: string, occurrences: object[] }}
   */
  const addRecurringActivity = useCallback((baseActivity, recurrence) => {
    const seriesId = generateId();
    const dates = generateRecurringDates({
      startDate: baseActivity.date,
      daysOfWeek: recurrence.daysOfWeek,
      freq: recurrence.freq,
      until: recurrence.until,
    });

    const { date: _ignoredDate, ...rest } = baseActivity;
    const occurrences = dates.map((date) => ({
      ...rest,
      date,
      id: generateId(),
      seriesId,
      fixedTime: true,
      completed: false,
    }));

    setActivities((prev) => [...prev, ...occurrences]);
    return { seriesId, occurrences };
  }, []);

  /**
   * Applies `changes` to every occurrence of a series, optionally scoped to
   * "this and following" via `fromDate` (omit for "all events"). `changes`
   * should never include `date` — each occurrence keeps its own date; only
   * the Edit form's "this event only" path (plain `updateActivity`) may
   * change a single occurrence's date.
   */
  const updateSeries = useCallback((seriesId, changes, { fromDate } = {}) => {
    const { date: _ignoredDate, id: _ignoredId, seriesId: _ignoredSeriesId, ...safeChanges } = changes || {};
    setActivities((prev) =>
      prev.map((a) => {
        if (a.seriesId !== seriesId) return a;
        if (fromDate && a.date < fromDate) return a;
        return { ...a, ...safeChanges };
      })
    );
  }, []);

  /**
   * Deletes every occurrence of a series, optionally scoped to "this and
   * following" via `fromDate` (omit for "all events").
   */
  const deleteSeries = useCallback((seriesId, { fromDate } = {}) => {
    setActivities((prev) =>
      prev.filter((a) => {
        if (a.seriesId !== seriesId) return true; // keep unrelated activities
        if (fromDate && a.date < fromDate) return true; // keep past occurrences when scoped
        return false; // drop this occurrence
      })
    );
  }, []);

  const value = {
    activities,
    addActivity,
    updateActivity,
    deleteActivity,
    toggleComplete,
    moveActivity,
    addRecurringActivity,
    updateSeries,
    deleteSeries,
  };

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
}

/** Hook every component uses to read/write the shared activity list. */
export function useActivities() {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error('useActivities must be used within an ActivityProvider');
  return ctx;
}
