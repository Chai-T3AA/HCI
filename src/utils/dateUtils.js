/**
 * dateUtils.js
 * ------------
 * Small, dependency-free date helpers shared across the app (calendar
 * grids, dashboard week selector, workload calculations, insights).
 * Dates are always represented as "YYYY-MM-DD" strings once they leave
 * this file, and times as "HH:MM" 24-hour strings, so the rest of the
 * codebase never has to juggle raw Date objects or timezones.
 */

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Formats a Date as a "YYYY-MM-DD" key, using LOCAL time (not UTC). */
export function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses a "YYYY-MM-DD" key back into a local Date at midnight. */
export function fromDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

/**
 * Adds calendar months (not a fixed 30 days) — used for the "Fixed time"
 * recurrence duration presets (1/3/6/12 months). Clamps day-of-month so
 * e.g. Jan 31 + 1 month doesn't silently roll into March (setMonth would
 * otherwise turn "Feb 31" into "Mar 3").
 */
export function addMonths(date, amount) {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1); // avoid month-rollover surprises while changing the month
  d.setMonth(d.getMonth() + amount);
  const lastDayOfTargetMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDayOfTargetMonth));
  return d;
}

/**
 * Returns the date that starts the week containing `date`.
 * `weekStartsOn` follows JS's Date.getDay() numbering (0 = Sunday, 1 = Monday,
 * ... 6 = Saturday) and defaults to Monday — but every caller that has
 * access to the user's "Week starts on Monday" setting (SettingsContext)
 * should pass `settings.weekStartsOn` explicitly so the calendar, dashboard
 * and insights pages all agree with what the user picked.
 */
export function startOfWeek(date, weekStartsOn = 1) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day - weekStartsOn + 7) % 7; // how many days after weekStartsOn `day` falls
  return addDays(d, -diff);
}

/** Returns an array of 7 Dates for the week containing `date`, starting on `weekStartsOn`. */
export function getWeekDays(date, weekStartsOn = 1) {
  const start = startOfWeek(date, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/**
 * DAY_SHORT/DAY_NAMES are always stored Sunday-first (matching Date.getDay()
 * indices) so `DAY_SHORT[date.getDay()]` keeps working everywhere. When you
 * need a header row in week-start order instead (e.g. MonthView's "SUN MON
 * TUE..." vs "MON TUE...SUN" heading), use this to reorder them.
 */
export function getOrderedDayLabels(weekStartsOn = 1, labels = DAY_SHORT) {
  return Array.from({ length: 7 }, (_, i) => labels[(weekStartsOn + i) % 7]);
}

export function isSameDay(a, b) {
  return toDateKey(a) === toDateKey(b);
}

export function isToday(date) {
  return isSameDay(date, new Date());
}

/** "24 Jun — 30 Jun 2026" style range label used in the calendar header. */
export function formatWeekRange(weekDays) {
  const start = weekDays[0];
  const end = weekDays[6];
  const startLabel = `${start.getDate()} ${MONTH_NAMES[start.getMonth()].slice(0, 3)}`;
  const endLabel = `${end.getDate()} ${MONTH_NAMES[end.getMonth()].slice(0, 3)}`;
  return `${startLabel} — ${endLabel} ${end.getFullYear()}`;
}

/** "September 21 — September 27" style label used on the dashboard. */
export function formatWeekRangeLong(weekDays) {
  const start = weekDays[0];
  const end = weekDays[6];
  return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} — ${MONTH_NAMES[end.getMonth()]} ${end.getDate()}`;
}

/** Converts "14:30" -> 14.5 (decimal hours), used for grid positioning & math. */
export function timeToDecimal(time) {
  const [h, m] = time.split(':').map(Number);
  return h + m / 60;
}

/** Converts a decimal hour (14.5) back into "14:30". */
export function decimalToTime(decimal) {
  const h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Formats "14:30" as "2:30 PM" for display. */
export function formatTime12(time) {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12} ${period}` : `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

/** End time string given a start time and a duration in hours. */
export function addHours(time, hours) {
  return decimalToTime(timeToDecimal(time) + hours);
}

/** Days between two "YYYY-MM-DD" keys (b - a), used for deadline urgency. */
export function daysBetween(aKey, bKey) {
  const a = fromDateKey(aKey);
  const b = fromDateKey(bKey);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

/** Human label like "Deadline tomorrow" / "Deadline in 3 days" / "Deadline passed". */
export function deadlineLabel(deadlineKey, todayKey = toDateKey(new Date())) {
  const diff = daysBetween(todayKey, deadlineKey);
  if (diff < 0) return 'Deadline passed';
  if (diff === 0) return 'Deadline today';
  if (diff === 1) return 'Deadline tomorrow';
  return `Deadline in ${diff} days`;
}
