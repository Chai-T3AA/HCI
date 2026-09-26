/**
 * workloadUtils.js
 * ----------------
 * Turns a flat list of activities into the workload numbers the rest of the
 * app displays: hours-per-day, a light/moderate/heavy label per day, and
 * the weekly stats shown on the Dashboard and Insights pages. Centralizing
 * this math means the calendar, dashboard and insights pages can never
 * disagree about what "overloaded" means.
 */
import { toDateKey } from './dateUtils';

// Thresholds (in hours) that decide a day's workload label.
// Tune these in one place and every workload badge in the app follows.
export const WORKLOAD_THRESHOLDS = { light: 4, moderate: 7 };

/** Total scheduled hours for one specific date (all non-completed + completed count). */
export function getHoursForDate(activities, dateKey) {
  return activities
    .filter((a) => a.date === dateKey)
    .reduce((sum, a) => sum + a.duration, 0);
}

/** light | moderate | heavy, based on total hours booked that day. */
export function getWorkloadLevel(hours) {
  if (hours <= WORKLOAD_THRESHOLDS.light) return 'light';
  if (hours <= WORKLOAD_THRESHOLDS.moderate) return 'moderate';
  return 'heavy';
}

export const WORKLOAD_LABEL = { light: 'Light', moderate: 'Moderate', heavy: 'Heavy' };

/**
 * True once a day's hours exceed the user's own configured daily limit
 * (Settings > Scheduling Preferences > "Maximum workload per day"). This is
 * separate from the light/moderate/heavy scale above — that scale is a
 * fixed, generic visualization; `overloaded` is the personalized "you set a
 * limit and blew past it" flag that turns things red in the UI.
 * `maxWorkloadPerDay` of `null`/`undefined` means "no limit set", so nothing
 * is ever flagged overloaded in that case.
 */
export function isOverloaded(hours, maxWorkloadPerDay) {
  return typeof maxWorkloadPerDay === 'number' && maxWorkloadPerDay > 0 && hours > maxWorkloadPerDay;
}

/**
 * Builds a { date, hours, level, overloaded, activities } summary for each
 * day in `weekDays`. This one array drives the calendar's per-column
 * workload badges and the Workload Overview bar chart on the dashboard.
 */
export function getWeekWorkload(activities, weekDays, maxWorkloadPerDay) {
  return weekDays.map((date) => {
    const dateKey = toDateKey(date);
    const dayActivities = activities.filter((a) => a.date === dateKey);
    const hours = dayActivities.reduce((sum, a) => sum + a.duration, 0);
    return {
      date,
      dateKey,
      hours,
      level: getWorkloadLevel(hours),
      overloaded: isOverloaded(hours, maxWorkloadPerDay),
      activities: dayActivities,
    };
  });
}

/**
 * Aggregate stats for a week, used by the Dashboard summary cards and the
 * Insights page (total tasks, hours planned, upcoming deadlines, % complete).
 * `maxWorkloadPerDay` (from Settings) is threaded through to getWeekWorkload
 * so the `overloaded` flag on each day reflects the user's own limit.
 */
export function getWeeklyStats(activities, weekDays, maxWorkloadPerDay) {
  const weekKeys = new Set(weekDays.map(toDateKey));
  const weekActivities = activities.filter((a) => weekKeys.has(a.date));

  const totalTasks = weekActivities.length;
  const hoursPlanned = weekActivities.reduce((sum, a) => sum + a.duration, 0);
  const completed = weekActivities.filter((a) => a.completed);
  const hoursCompleted = completed.reduce((sum, a) => sum + a.duration, 0);
  const hoursRemaining = Math.max(0, hoursPlanned - hoursCompleted);
  const completion = totalTasks === 0 ? 0 : Math.round((completed.length / totalTasks) * 100);

  const todayKey = toDateKey(new Date());
  const upcomingDeadlines = activities.filter(
    (a) => a.deadline && a.deadline >= todayKey && !a.completed
  ).length;

  const weekWorkload = getWeekWorkload(activities, weekDays, maxWorkloadPerDay);
  const busiest = weekWorkload.reduce((max, d) => (d.hours > (max?.hours ?? -1) ? d : max), null);
  const freest = weekWorkload.reduce((min, d) => (d.hours < (min?.hours ?? Infinity) ? d : min), null);

  return {
    totalTasks,
    hoursPlanned,
    hoursCompleted,
    hoursRemaining,
    completion,
    upcomingDeadlines,
    busiestDay: busiest,
    freestDay: freest,
    weekWorkload,
  };
}
