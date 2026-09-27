/**
 * recurrence.js
 * -------------
 * Turns a "Fixed time" activity's recurrence settings (Settings section of
 * AddActivityModal: Weekly/Biweekly, which day(s) of the week, and an end
 * date) into a plain list of concrete dates. Nothing here is "smart" or
 * suggestion-based on purpose — a fixed-time activity is, by definition,
 * the user telling the app exactly when something happens, not asking for
 * help finding a slot.
 *
 * Deliberately NOT handled (out of scope): calendar holidays/breaks,
 * daylight-saving edge cases beyond what native Date already does, and any
 * notion of "skip this one week." A real semester has breaks a raw
 * weekly/biweekly rule doesn't know about — this generates the mechanical
 * pattern only; skipping a specific week means deleting that one
 * occurrence afterward (supported — see ActivityContext's deleteSeries).
 */
import { addDays, startOfWeek, toDateKey, fromDateKey } from './dateUtils';

// Sanity cap: a 12-month recurrence across all 7 days would be 365
// occurrences, which is already a lot of localStorage rows for what's
// meant to be a class/meeting schedule. This stops a clearly-wrong input
// (e.g. a duration typo) from generating something absurd.
export const MAX_OCCURRENCES = 400;

/**
 * @param {Object} opts
 * @param {string} opts.startDate - "YYYY-MM-DD", the first possible occurrence
 * @param {number[]} opts.daysOfWeek - 0-6 (Sunday-Saturday), at least one
 * @param {'weekly'|'biweekly'} opts.freq
 * @param {string} opts.until - "YYYY-MM-DD", inclusive end date
 * @returns {string[]} sorted "YYYY-MM-DD" date keys, capped at MAX_OCCURRENCES
 */
export function generateRecurringDates({ startDate, daysOfWeek, freq, until }) {
  const start = fromDateKey(startDate);
  const end = fromDateKey(until);
  if (!daysOfWeek.length || end < start) return [];

  // Weeks are grouped Monday-first purely as an internal anchor for the
  // biweekly on/off pattern — it doesn't affect which weekday the
  // occurrences land on, only which weeks count as "every other."
  let weekStart = startOfWeek(start, 1);
  let weekIndex = 0;
  const dates = [];

  while (weekStart <= end && dates.length < MAX_OCCURRENCES) {
    const includeThisWeek = freq === 'weekly' || weekIndex % 2 === 0;
    if (includeThisWeek) {
      for (const dow of daysOfWeek) {
        const offset = (dow - weekStart.getDay() + 7) % 7;
        const d = addDays(weekStart, offset);
        if (d >= start && d <= end) dates.push(d);
      }
    }
    weekStart = addDays(weekStart, 7);
    weekIndex += 1;
  }

  return dates
    .sort((a, b) => a - b)
    .slice(0, MAX_OCCURRENCES)
    .map(toDateKey);
}
