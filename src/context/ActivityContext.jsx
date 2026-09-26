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

const STORAGE_KEY = 'timewise.activities.v1';
const ActivityContext = createContext(null);

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
    const withId = { id: crypto.randomUUID(), completed: false, ...activity };
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

  const value = {
    activities,
    addActivity,
    updateActivity,
    deleteActivity,
    toggleComplete,
    moveActivity,
  };

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
}

/** Hook every component uses to read/write the shared activity list. */
export function useActivities() {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error('useActivities must be used within an ActivityProvider');
  return ctx;
}
