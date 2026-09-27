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

// --- Rebalance Week: time-of-day preferences ---------------------------
// DAY_START..DAY_END is where work is *allowed*; COMFORT_START..COMFORT_END
// is where it's *preferred*. Slots outside the comfort window are still
// usable when a day is packed, they just cost more.
const COMFORT_START = 9; // 9 AM — before this counts as "early morning"
const COMFORT_END = 21; // 9 PM — ending after this eats into wind-down/sleep
const PEAK_HOUR = 14; // 2 PM — where moved work drifts toward when there's no better anchor
const EARLY_PENALTY_PER_HOUR = 4;
const LATE_PENALTY_PER_HOUR = 4;
const PEAK_DRIFT_PER_HOUR = 0.25;
const ANCHOR_DRIFT_PER_HOUR = 0.5; // pull toward the time the user originally picked
const BUFFER_HOURS = 0.5; // gap wanted between blocks
const BACK_TO_BACK_PENALTY = 1.5;
const LOAD_PENALTY_PER_HOUR = 4; // one extra hour on a day ≈ one hour of early-morning start
const STAY_ON_DAY_BONUS = 2;

/**
 * How good is `start..start+duration` as a time of day? Lower is better.
 * `anchorStart` is the activity's original start when it was already at a
 * sensible hour — keeping it near there beats moving it somewhere
 * arbitrary. With no anchor (e.g. it was sitting at 7 AM), it drifts
 * toward the early afternoon instead.
 */
function scoreTimeOfDay(start, duration, dayActs, anchorStart) {
  const end = start + duration;
  let score = 0;
  score += Math.max(0, COMFORT_START - start) * EARLY_PENALTY_PER_HOUR;
  score += Math.max(0, end - COMFORT_END) * LATE_PENALTY_PER_HOUR;
  score +=
    anchorStart != null
      ? Math.abs(start - anchorStart) * ANCHOR_DRIFT_PER_HOUR
      : Math.abs((start + end) / 2 - PEAK_HOUR) * PEAK_DRIFT_PER_HOUR;

  // Prefer a breather between blocks over stacking them back-to-back.
  for (const a of dayActs) {
    const aStart = timeToDecimal(a.startTime);
    const aEnd = aStart + a.duration;
    if (start >= aEnd && start - aEnd < BUFFER_HOURS) score += BACK_TO_BACK_PENALTY;
    if (aStart >= end && aStart - end < BUFFER_HOURS) score += BACK_TO_BACK_PENALTY;
  }
  return score;
}

/**
 * "Rebalance Week" — the Calendar page's one-click "spread my stress out
 * and don't eat into my sleep" action.
 *
 * What it's allowed to move: any activity that is (a) already scheduled
 * somewhere in `weekDays`, (b) not completed, and (c) NOT marked
 * `fixedTime`. A deadline is NOT required anymore — see below for why —
 * so a plain "test" or "Study Session" block with no deadline is just as
 * movable as an assignment with one, as long as it isn't fixed-time.
 * Anything marked `fixedTime` (see AddActivityModal's "Fixed time" toggle)
 * — a recurring class, a meeting, the gym, or any other activity
 * explicitly marked as happening at an exact time — is treated as a FIXED
 * commitment and never touched; its hours still count against each day's
 * load, they just can't be the thing that moves.
 *
 * Earlier versions of this function required a deadline to consider
 * something movable, using "has a deadline?" as a stand-in for "is this
 * flexible work?". That stopped working the moment `fixedTime` was added:
 * `fixedTime` is now the actual, explicit signal for "don't touch this,"
 * so requiring a deadline ON TOP of that was redundant — and actively
 * harmful, because most everyday activities (a study block, a plain
 * to-do) never get a deadline typed in at all. The practical effect was
 * that Rebalance Week silently ignored most of a user's real schedule and
 * reported "already balanced" even when a day was visibly overloaded with
 * non-deadline activities. Deadline still matters — see the risk-score
 * step below — it's just no longer a gate on eligibility.
 *
 * How "spread stress evenly + protect sleep" actually happens:
 *  1. Each day's cap = min(Settings > Overwork threshold, 24 − Settings >
 *     Target sleep hours) — whichever is stricter. That second half is the
 *     sleep protection: even if the overwork threshold is set generously,
 *     the day still can't be packed past what would cut into sleep.
 *  2. Movable activities are placed in RISK-FIRST order, not pure
 *     earliest-deadline-first: each activity gets a risk score of
 *     `daysUntilDeadline − priorityBonus` (high priority = 2 days "more
 *     urgent" than its raw deadline, medium = 1, low = 0), so a high-
 *     priority task due in 4 days is treated as riskier — and placed
 *     before — a low-priority task due in 2 days would otherwise crowd out.
 *     An activity with NO deadline is scored as if it were due in
 *     `NO_DEADLINE_BASE_URGENCY` days (moderate — behind anything with a
 *     real deadline inside that window, ahead of a low-priority task with
 *     a deadline further out), so plain undated work still gets placed
 *     and still competes on priority, it just doesn't jump the queue ahead
 *     of something with a real, soon deadline. A tie in risk score falls
 *     back to priority, then to duration descending (heavier/longer blocks
 *     first, so they claim the emptiest day while it's still empty instead
 *     of getting squeezed into whatever scraps are left). Each activity
 *     then goes to whichever *eligible* day (today..its deadline if it has
 *     one, otherwise any day left in the week, within this week) currently
 *     has the MOST remaining capacity — i.e. always fill the least-busy
 *     day next. That greedy "always pick the emptiest option" rule is what
 *     actually produces the leveling-out effect instead of everything
 *     piling onto one day.
 *  3. A day only qualifies as "has room" if it can fit the ENTIRE activity
 *     under the cap (`loadedHours + activity.duration <= dailyCap`), not
 *     just if it isn't already full — a day sitting at 7.5/8h no longer
 *     silently accepts a 3-hour task and blows past the cap unflagged.
 *     If nothing fits without breaking the cap anywhere in the eligible
 *     window (the week is just overcommitted), the activity is placed
 *     anyway in the least-busy slot that exists and flagged `tight` in the
 *     result, rather than silently failing — the caller can tell the user
 *     "this one's still tight" instead of the activity just vanishing.
 *  4. Sunday is treated as a rest day, tried dead last. Sunday is almost
 *     always the emptiest day (nothing's on it by default), and step 2's
 *     "always fill the least-busy day" rule would otherwise pick it first
 *     nearly every time — turning "balance the week" into "dump everything
 *     on Sunday," which defeats the point. Every non-Sunday eligible day
 *     is tried first (both the under-cap pass AND the tight/over-cap
 *     fallback from step 3) before Sunday is considered at all. Sunday
 *     only gets used once every weekday genuinely has no room left, and
 *     `usedRestDay: true` is set on the move so the caller can flag it.
 *  5. If it truly can't be placed at all (no free slot anywhere within its
 *     own deadline window, weekday or Sunday), it's left exactly where it
 *     was and reported in `unplaced` instead of being moved somewhere
 *     wrong.
 *  6. Time of day: within each pass, every free slot on every candidate
 *     day is scored (day load + scoreTimeOfDay) and the cheapest wins —
 *     not the first free slot from 7 AM. That prefers 9 AM–9 PM, keeps an
 *     activity near its original time when that was reasonable (otherwise
 *     drifts toward early afternoon), leaves 30-min buffers between blocks,
 *     never uses a time today that has already passed, and slightly
 *     favours leaving an activity on the day it's already on.
 *
 * @param {Date[]} weekDays - the 7 days currently being viewed
 * @param {Array} activities - full activity list (all dates)
 * @param {{maxWorkloadPerDay:number, targetSleepHours:number}} settings
 * @param {Date} [today]
 * @returns {{ moves: Array, unplaced: Array, dailyCap: number }}
 *   `moves`: [{ id, name, fromDate, fromTime, toDate, toTime, tight, usedRestDay }] —
 *   only entries whose slot actually changed (already-well-placed
 *   activities are left out, not "moved" to their own current slot).
 *   `usedRestDay` is true only when every weekday was full and the
 *   activity had to go on Sunday as a last resort.
 */
export function rebalanceWeek(weekDays, activities, settings, today = new Date()) {
  const todayKey = toDateKey(today);
  const weekKeys = weekDays.map(toDateKey);
  const weekKeySet = new Set(weekKeys);
  const dailyCap = Math.max(0, Math.min(settings.maxWorkloadPerDay, 24 - settings.targetSleepHours));

  const fixedByDay = {};
  weekKeys.forEach((k) => { fixedByDay[k] = []; });

  const movable = [];
  for (const a of activities) {
    if (!weekKeySet.has(a.date)) continue; // scope: just this week, per the "just up to next week for now" ask
    if (!a.completed && !a.fixedTime) movable.push(a); // deadline is no longer required — see the doc comment above
    else fixedByDay[a.date].push(a);
  }

  // Running per-day occupancy used for collision checks as items get
  // placed — starts as just the fixed load; each movable activity is added
  // to whichever day it lands on as the loop below places it.
  const dayActivities = {};
  weekKeys.forEach((k) => { dayActivities[k] = [...fixedByDay[k]]; });
  const loadedHours = (k) => dayActivities[k].reduce((sum, a) => sum + a.duration, 0);

  // Risk score: lower = higher priority to place. A raw "days until
  // deadline" count alone treats a low-priority task due tomorrow as more
  // urgent than a high-priority task due in 4 days — technically true by
  // the calendar, but not what "balance the heavy work and high risk"
  // means in practice. Each priority level buys a task a few days of
  // "effective" urgency so it competes fairly for the emptiest days against
  // less-important work that just happens to be due slightly sooner.
  const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
  const PRIORITY_URGENCY_BONUS = { high: 2, medium: 1, low: 0 };
  // No deadline = no hard "days until due" number to work with. Treating it
  // as moderately urgent (rather than either "most urgent" or "never
  // urgent") means undated work still gets placed and still competes on
  // priority, without either starving genuinely-deadlined work of the best
  // slots or getting starved itself and never moving at all.
  const NO_DEADLINE_BASE_URGENCY = 5;
  const riskScore = (a) => {
    const urgencyDays = a.deadline ? daysBetween(todayKey, a.deadline) : NO_DEADLINE_BASE_URGENCY;
    return urgencyDays - PRIORITY_URGENCY_BONUS[a.priority];
  };

  const sorted = [...movable].sort((a, b) => {
    const scoreDiff = riskScore(a) - riskScore(b);
    if (scoreDiff !== 0) return scoreDiff; // riskiest (soonest + most important) first
    if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority]) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    return b.duration - a.duration; // bigger blocks first — claim the emptiest day while it's still empty
  });

  // First schedulable half-hour today — nothing gets rebalanced into a
  // time that has already passed.
  const nowSlot = Math.ceil((today.getHours() + today.getMinutes() / 60) * 2) / 2;

  // Scores EVERY free slot across the given days and takes the cheapest,
  // instead of the old "first free slot scanning up from 7 AM" (which is
  // why everything used to land at 7–8 AM). Cost = how loaded the day
  // already is (keeps the week level) + how good that time of day is (see
  // scoreTimeOfDay), with a small bonus for staying on the activity's
  // current day so an already-fine activity isn't shuffled for nothing.
  function findAndPlace(activity, eligibleDays) {
    const origStart = timeToDecimal(activity.startTime);
    const anchorStart =
      origStart >= COMFORT_START && origStart + activity.duration <= COMFORT_END ? origStart : null;

    let best = null;
    for (const k of eligibleDays) {
      const dayActs = dayActivities[k];
      const earliest = k === todayKey ? Math.max(DAY_START, nowSlot) : DAY_START;
      const dayCost = loadedHours(k) * LOAD_PENALTY_PER_HOUR - (k === activity.date ? STAY_ON_DAY_BONUS : 0);
      for (let start = earliest; start <= DAY_END - activity.duration; start += SLOT_STEP) {
        if (!isSlotFree(dayActs, start, activity.duration)) continue;
        const score = dayCost + scoreTimeOfDay(start, activity.duration, dayActs, anchorStart);
        if (!best || score < best.score) best = { k, start, score };
      }
    }
    if (!best) return null;

    const newStartTime = require0Pad(best.start);
    dayActivities[best.k] = [...dayActivities[best.k], { startTime: newStartTime, duration: activity.duration }];
    return { toDate: best.k, toTime: newStartTime };
  }

  const moves = [];
  const unplaced = [];

  // Sunday is a rest day, not just "the day that happens to be free." A
  // student's Sunday is almost always the emptiest day in the whole week
  // (nothing's scheduled on it by default), and BOTH placement passes sort
  // "emptiest day first" — so before this fix, Sunday won that sort nearly
  // every time regardless of whether a weekday still had room, turning
  // Rebalance Week into "dump everything on Sunday" instead of actually
  // balancing the week. It's now tried dead last: every non-Sunday day is
  // exhausted (both the under-cap pass AND the tight/over-cap fallback)
  // before Sunday is ever considered, and only as its own last-resort pass.
  const isRestDay = (k) => fromDateKey(k).getDay() === 0;

  for (const activity of sorted) {
    // Bounded by the activity's own deadline when it has one; otherwise any
    // remaining day in the viewed week is fair game. (Bug note: comparing
    // `k <= activity.deadline` when `deadline` is `null` is always false in
    // JS — every no-deadline activity would silently get ZERO eligible
    // days and end up in `unplaced` no matter what. The `!activity.deadline
    // ||` short-circuit below is what actually makes no-deadline activities
    // movable at all, not just eligible in the earlier movable/fixed split.)
    const eligibleDays = weekKeys.filter((k) => k >= todayKey && (!activity.deadline || k <= activity.deadline));
    if (eligibleDays.length === 0) {
      const reason = activity.deadline ? 'deadline already passed, or before today' : 'no day left this week to place it in';
      unplaced.push({ id: activity.id, name: activity.name, reason });
      continue;
    }

    const weekdayEligible = eligibleDays.filter((k) => !isRestDay(k));
    const sundayEligible = eligibleDays.filter(isRestDay);

    // Pass 1: only WEEKDAY days that can fit this activity's FULL duration
    // without breaking the cap, emptiest first (this is the actual
    // "balance the week" step). Checking `loadedHours(k) < dailyCap` alone
    // (the old bug) only asked "is this day not already full?" — a day
    // sitting at 7.5 of an 8h cap would still pass that check for a
    // 3-hour task, silently landing the day at 10.5h with no warning.
    // Checking `loadedHours(k) + activity.duration <= dailyCap` asks the
    // right question: does the WHOLE task fit here without going over.
    const withRoom = weekdayEligible
      .filter((k) => loadedHours(k) + activity.duration <= dailyCap)
      .sort((a, b) => loadedHours(a) - loadedHours(b) || a.localeCompare(b));
    let result = findAndPlace(activity, withRoom);
    let tight = false;
    let usedRestDay = false;

    // Pass 2 (fallback, still weekdays only): the week's genuinely
    // overcommitted for this item — place it in the least-busy WEEKDAY
    // regardless of the cap rather than reaching for Sunday, and say so
    // via `tight`.
    if (!result) {
      const byLoad = [...weekdayEligible].sort((a, b) => loadedHours(a) - loadedHours(b) || a.localeCompare(b));
      result = findAndPlace(activity, byLoad);
      tight = true;
    }

    // Pass 3 (last resort): either every weekday genuinely had no room, OR
    // (a distinct case, see `noWeekdayInWindow` below) there simply wasn't
    // a weekday in the eligible window to begin with — e.g. it's Sunday
    // right now and the viewed week's Mon–Sat have already passed, so they
    // were never eligible targets at all, let alone "checked and full."
    // Sunday is fair game here, under-cap first, then over-cap if it must.
    const noWeekdayInWindow = weekdayEligible.length === 0;
    if (!result && sundayEligible.length > 0) {
      const sundayWithRoom = sundayEligible.filter((k) => loadedHours(k) + activity.duration <= dailyCap);
      result = findAndPlace(activity, sundayWithRoom);
      if (!result) {
        result = findAndPlace(activity, sundayEligible);
        tight = true;
      }
      usedRestDay = Boolean(result);
    }

    if (!result) {
      const reason = activity.deadline ? 'no free slot before its deadline' : 'no free slot left this week';
      unplaced.push({ id: activity.id, name: activity.name, reason });
      continue;
    }

    if (result.toDate !== activity.date || result.toTime !== activity.startTime) {
      moves.push({
        id: activity.id,
        name: activity.name,
        fromDate: activity.date,
        fromTime: activity.startTime,
        toDate: result.toDate,
        toTime: result.toTime,
        tight,
        usedRestDay,
        // Which of the two genuinely different reasons a move landed on
        // Sunday — the UI shouldn't say "no weekday had room" when the
        // real reason is "there was no weekday left to even check" (e.g.
        // rebalancing on a Sunday, with the rest of that week already in
        // the past). Only meaningful when `usedRestDay` is true.
        restDayReason: usedRestDay ? (noWeekdayInWindow ? 'no-weekday-in-window' : 'weekday-full') : null,
      });
    }
  }

  return { moves, unplaced, dailyCap };
}

export { addHours };
