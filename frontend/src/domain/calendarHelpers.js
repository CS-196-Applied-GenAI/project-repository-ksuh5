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
 * Returns a flat array of YYYY-MM-DD strings representing the full
 * month grid for the month containing `ymd`.
 *
 * - Length is always a multiple of 7 (complete weeks).
 * - Grid starts on the Monday on or before the 1st of the month.
 * - Grid ends on the Sunday on or after the last day of the month.
 * - Leading days from the previous month and trailing days from the
 *   next month are included to fill complete weeks.
 * - Returns 35 (5 weeks) or 42 (6 weeks) days depending on the month.
 *
 * @param {string} ymd  Any date within the target month.
 * @returns {string[]}
 */
export function getMonthGridDays(ymd) {
  const ref   = parseYMD(ymd);
  const year  = ref.getFullYear();
  const month = ref.getMonth(); // 0-indexed

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth  = new Date(year, month + 1, 0);

  // Start: Monday on or before the 1st
  const gridStart = startOfWeek(formatYMD(firstOfMonth));

  // End: Sunday on or after the last day
  const lastDaySlot  = (lastOfMonth.getDay() + 6) % 7; // Mon=0 … Sun=6
  const daysToSunday = lastDaySlot === 6 ? 0 : 6 - lastDaySlot;
  const gridEnd      = addDays(formatYMD(lastOfMonth), daysToSunday);

  const days = [];
  let current = gridStart;
  while (current <= gridEnd) {
    days.push(current);
    current = addDays(current, 1);
  }
  return days;
}

/**
 * Returns a 2-D array of YYYY-MM-DD strings (weeks × 7 days) for the
 * month grid. Thin wrapper around getMonthGridDays.
 * @param {string} ymd
 * @returns {string[][]}
 */
export function getMonthGrid(ymd) {
  const flat = getMonthGridDays(ymd);
  const weeks = [];
  for (let i = 0; i < flat.length; i += 7) {
    weeks.push(flat.slice(i, i + 7));
  }
  return weeks;
}

/**
 * Groups an array of PlannedWorkout objects by their `date` field.
 * Returns { [YYYY-MM-DD]: PlannedWorkout[] }.
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

/** Short day-of-week label ("Mon", "Tue", …) for a YYYY-MM-DD string. */
export function shortDayLabel(ymd) {
  return parseYMD(ymd).toLocaleDateString('en-US', { weekday: 'short' });
}

/** "Mar 10" style label for a YYYY-MM-DD string. */
export function shortDateLabel(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
  });
}

/**
 * Returns the first day of the month for a YYYY-MM-DD string.
 * @param {string} ymd
 * @returns {string}
 */
export function startOfMonth(ymd) {
  const [y, m] = ymd.split('-');
  return `${y}-${m}-01`;
}

/**
 * Returns the first day of the next month.
 * @param {string} ymd
 * @returns {string}
 */
export function addMonths(ymd, n) {
  const ref = parseYMD(ymd);
  ref.setDate(1); // pin to 1st to avoid month-length edge cases
  ref.setMonth(ref.getMonth() + n);
  return formatYMD(ref);
}

/**
 * "March 2026" style label for a YYYY-MM-DD string.
 * @param {string} ymd
 * @returns {string}
 */
export function monthYearLabel(ymd) {
  const [y, m] = ymd.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year:  'numeric',
  });
}