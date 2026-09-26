/**
 * scheduling.js
 * -------------
 * The "smart" part of TimeWise. Two independent responsibilities live here:
 *
 * 1. Overlap detection & layout — given a day's activities, figure out
 *    which ones overlap in time so the calendar can render them
 *    side-by-side instead of stacked on top of each other.
 *
 * 2. Smart Schedule Recommendation — given a new activity's duration,
 *    priority and deadline, scan the user's existing schedule and propose
 *    2-3 candidate time slots, ranking them so the best one can be marked
 *    "BEST MATCH". This directly implements PRD requirements FR-09/FR-10
 *    and the "Decision-Making" cognitive-process goal (give a few good
 *    options rather than making the user calculate a free slot by hand).
 */
import { addDays, addHours, daysBetween, timeToDecimal, toDateKey, fromDateKey } from './dateUtils';
import { getHoursForDate, getWorkloadLevel } from './workloadUtils';

// The window of the day we're willing to schedule new work into.
const DAY_START = 7; // 7 AM
const DAY_END = 22; // 10 PM
const SLOT_STEP = 0.5; // try every 30 minutes when searching for a free slot
const HOW_FAR_AHEAD_DAYS = 14; // never suggest more than 2 weeks out

/** True if [startA, endA) and [startB, endB) (decimal hours) overlap. */
function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

/**
 * Given all activities on ONE day, returns each activity annotated with
 * `column` and `columnCount` so the calendar can lay overlapping events
 * out side-by-side (PRD section 17, "Overlapping Events").
 */
export function layoutDayActivities(dayActivities) {
  const sorted = [...dayActivities].sort((a, b) => timeToDecimal(a.startTime) - timeToDecimal(b.startTime));
  const columns = []; // each entry: last end-time occupying that column

  const placed = sorted.map((activity) => {
    const start = timeToDecimal(activity.startTime);
    const end = start + activity.duration;
    let columnIndex = columns.findIndex((endTime) => endTime <= start);
    if (columnIndex === -1) {
      columnIndex = columns.length;
      columns.push(end);
    } else {
      columns[columnIndex] = end;
    }
    return { ...activity, __start: start, __end: end, __column: columnIndex };
  });

  // A group of mutually-overlapping events all need to know the total
  // column count so each can size itself to 1/columnCount width.
  return placed.map((activity) => {
    const overlappingGroup = placed.filter((other) =>
      rangesOverlap(activity.__start, activity.__end, other.__start, other.__end)
    );
    const columnCount = Math.max(1, ...overlappingGroup.map((o) => o.__column + 1));
    return { ...activity, column: activity.__column, columnCount };
  });
}

/** Is `candidateStart..candidateStart+duration` free of existing activities on that day? */
function isSlotFree(dayActivities, candidateStart, duration) {
  const candidateEnd = candidateStart + duration;
  if (candidateStart < DAY_START || candidateEnd > DAY_END) return false;
  return !dayActivities.some((a) => {
    const aStart = timeToDecimal(a.startTime);
    const aEnd = aStart + a.duration;
    return rangesOverlap(candidateStart, candidateEnd, aStart, aEnd);
  });
}

/**
 * Scores a candidate slot: lower is better. We prefer days that are
 * lightly loaded (spreads work out, avoids overloaded days), and among
 * equally-loaded days we prefer sooner slots (closer to "now") so users
 * aren't tempted to procrastinate right up to the deadline, balanced
 * against high-priority tasks being allowed to sit a little closer to
 * the deadline if that's the only way to fit them.
 */
function scoreSlot({ dayHoursBeforeAdd, daysFromNow, daysUntilDeadline, priority }) {
  const workloadPenalty = dayHoursBeforeAdd * 10; // heavier existing day = worse
  const soonerIsBetter = daysFromNow * 2; // mild nudge toward not procrastinating
  const priorityUrgencyBonus =
    priority === 'high' && daysUntilDeadline != null ? Math.max(0, 3 - daysUntilDeadline) * -4 : 0; // let high-priority tasks sit nearer the deadline without being penalized as much
  return workloadPenalty + soonerIsBetter + priorityUrgencyBonus;
}

/**
 * Core recommendation function.
 *
 * @param {Object} request - { duration (hours), priority ('high'|'medium'|'low'), deadline ('YYYY-MM-DD'|null) }
 * @param {Array} activities - full existing activity list (all dates)
 * @param {Date} [fromDate] - search starting from this date (defaults to today)
 * @returns {Array} up to 3 suggestions: { date, dateKey, startTime, endTime, workloadLevel, isBestMatch, score }
 */
export function getSmartRecommendations(request, activities, fromDate = new Date()) {
  const { duration, priority, deadline } = request;
  const lastDay = deadline ? fromDateKey(deadline) : addDays(fromDate, HOW_FAR_AHEAD_DAYS);
  const candidates = [];

  for (let dayOffset = 0; dayOffset <= HOW_FAR_AHEAD_DAYS; dayOffset += 1) {
    const day = addDays(fromDate, dayOffset);
    if (day > lastDay) break;
    const dateKey = toDateKey(day);
    const dayActivities = activities.filter((a) => a.date === dateKey);
    const dayHoursBeforeAdd = getHoursForDate(activities, dateKey);
    const daysUntilDeadline = deadline ? daysBetween(dateKey, deadline) : null;

    for (let start = DAY_START; start <= DAY_END - duration; start += SLOT_STEP) {
      if (!isSlotFree(dayActivities, start, duration)) continue;

      const score = scoreSlot({ dayHoursBeforeAdd, daysFromNow: dayOffset, daysUntilDeadline, priority });
      candidates.push({
        date: day,
        dateKey,
        startTime: require0Pad(start),
        endTime: require0Pad(start + duration),
        workloadLevel: getWorkloadLevel(dayHoursBeforeAdd + duration),
        dayHoursBeforeAdd,
        score,
      });
      break; // one candidate slot per day is enough diversity; move to next day
    }
  }

  candidates.sort((a, b) => a.score - b.score);

  // Keep at most one suggestion per day, prefer variety across days, cap at 3.
  const seenDays = new Set();
  const top = [];
  for (const c of candidates) {
    if (seenDays.has(c.dateKey)) continue;
    seenDays.add(c.dateKey);
    top.push(c);
    if (top.length === 3) break;
  }

  return top.map((c, i) => ({ ...c, isBestMatch: i === 0 }));
}

// Small local helper to avoid importing decimalToTime just for this file's own formatting needs.
function require0Pad(decimal) {
  const h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export { addHours };
