/**
 * Calendar date helpers.
 *
 * All dates are YYYY-MM-DD strings.
 * Weeks start on Monday (ISO 8601).
 */

/**
 * Parse a YYYY-MM-DD string into a local Date (midnight).
 * Avoids the UTC-shift that `new Date('YYYY-MM-DD')` causes.
 * @param {string} ymd
 * @returns {Date}
 */
export function parseYMD(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Format a local Date into a YYYY-MM-DD string.
 * @param {Date} date
 * @returns {string}
 */
export function formatYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today as YYYY-MM-DD (local time). */
export function today() {
  return formatYMD(new Date());
}

/**
 * Returns the Monday of the week containing `ymd`.
 * @param {string} ymd
 * @returns {string}
 */
export function startOfWeek(ymd) {
  const date = parseYMD(ymd);
  const dayOfWeek = (date.getDay() + 6) % 7; // Mon=0 … Sun=6
  const monday = new Date(date);
  monday.setDate(date.getDate() - dayOfWeek);
  return formatYMD(monday);
}

/**
 * Returns a new YYYY-MM-DD that is `n` days after (or before if n<0) `ymd`.
 * @param {string} ymd
 * @param {number} n
 * @returns {string}
 */
export function addDays(ymd, n) {
  const date = parseYMD(ymd);
  date.setDate(date.getDate() + n);
  return formatYMD(date);
}

/**
 * Returns 7 YYYY-MM-DD strings (Mon–Sun) for the week containing `ymd`.
 * Index 0 = Monday, index 6 = Sunday.
 * @param {string} ymd
 * @returns {string[]}
 */
export function getWeekDays(ymd) {
  const monday = startOfWeek(ymd);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/**
 * Returns a 2-D array of YYYY-MM-DD strings for the month grid
 * containing `ymd`. Each inner array is a Mon–Sun week (7 elements).
 * Leading/trailing days from adjacent months fill the grid.
 * @param {string} ymd
 * @returns {string[][]}
 */
export function getMonthGrid(ymd) {
  const ref = parseYMD(ymd);
  const year  = ref.getFullYear();
  const month = ref.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth  = new Date(year, month + 1, 0);

  const gridStart    = startOfWeek(formatYMD(firstOfMonth));
  const lastDaySlot  = (lastOfMonth.getDay() + 6) % 7; // Mon=0
  const daysToSunday = lastDaySlot === 6 ? 0 : 6 - lastDaySlot;
  const gridEnd      = addDays(formatYMD(lastOfMonth), daysToSunday);

  const weeks = [];
  let current = gridStart;
  while (current <= gridEnd) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(current);
      current = addDays(current, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

/**
 * Groups an array of PlannedWorkout objects by their `date` field.
 *
 * Returns a plain object: { [YYYY-MM-DD]: PlannedWorkout[] }
 * Days with no workouts are omitted from the map.
 * The order of workouts within each bucket matches insertion order.
 *
 * @param {Array<{ id: string, date: string }>} plannedWorkouts
 * @returns {Record<string, Array<{ id: string, date: string }>>}
 */
export function groupPlannedByDate(plannedWorkouts) {
  const map = {};
  for (const pw of plannedWorkouts) {
    if (!map[pw.date]) map[pw.date] = [];
    map[pw.date].push(pw);
  }
  return map;
}

/** Short day-of-week label (Mon, Tue, …) for a YYYY-MM-DD string. */
export function shortDayLabel(ymd) {
  return parseYMD(ymd).toLocaleDateString('en-US', { weekday: 'short' });
}

/** Short month+day label (Mar 10) for a YYYY-MM-DD string. */
export function shortDateLabel(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
  });
}