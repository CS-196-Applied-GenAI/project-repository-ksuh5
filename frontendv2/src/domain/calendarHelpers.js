/**
 * Calendar date helpers.
 *
 * All dates are represented as YYYY-MM-DD strings.
 * Weeks start on Monday (ISO 8601).
 *
 * NOTE: All arithmetic is done with local Date objects constructed
 * from the YYYY-MM-DD string directly (no timezone shifts) by
 * parsing the parts manually.
 */

/**
 * Parse a YYYY-MM-DD string into a local Date (midnight).
 * Avoids the UTC-shift that `new Date('YYYY-MM-DD')` causes.
 *
 * @param {string} ymd
 * @returns {Date}
 */
export function parseYMD(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Format a Date into a YYYY-MM-DD string using local time.
 *
 * @param {Date} date
 * @returns {string}
 */
export function formatYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns the Monday of the week containing the given date (YYYY-MM-DD).
 * If the given date IS Monday, returns it unchanged.
 *
 * @param {string} ymd
 * @returns {string}
 */
export function startOfWeek(ymd) {
  const date = parseYMD(ymd);
  // getDay(): 0=Sun, 1=Mon, … 6=Sat
  // We want Monday=0 offset, so shift: (day + 6) % 7 gives 0 for Mon.
  const dayOfWeek = (date.getDay() + 6) % 7; // Mon=0, Tue=1, … Sun=6
  const monday = new Date(date);
  monday.setDate(date.getDate() - dayOfWeek);
  return formatYMD(monday);
}

/**
 * Returns a new YYYY-MM-DD string that is `n` days after (or before if n<0) the given date.
 *
 * @param {string} ymd
 * @param {number} n  Number of days to add (may be negative).
 * @returns {string}
 */
export function addDays(ymd, n) {
  const date = parseYMD(ymd);
  date.setDate(date.getDate() + n);
  return formatYMD(date);
}

/**
 * Returns an array of 7 YYYY-MM-DD strings representing Mon–Sun
 * for the week that contains the given date.
 *
 * @param {string} ymd
 * @returns {string[]}  Array of length 7, index 0 = Monday.
 */
export function getWeekDays(ymd) {
  const monday = startOfWeek(ymd);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/**
 * Returns a 2D array of YYYY-MM-DD strings representing the month
 * grid for the month containing `ymd`. Each inner array is a 7-element
 * Mon–Sun week. Leading/trailing days from adjacent months are included
 * to fill the grid.
 *
 * Returns 5 or 6 weeks depending on the month layout.
 *
 * @param {string} ymd
 * @returns {string[][]}
 */
export function getMonthGrid(ymd) {
  const ref = parseYMD(ymd);
  const year = ref.getFullYear();
  const month = ref.getMonth(); // 0-indexed

  // First and last day of the month
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  // Start grid from the Monday on or before the 1st
  const gridStart = startOfWeek(formatYMD(firstOfMonth));
  // End grid from the Sunday on or after the last day
  const lastDayOfWeek = (lastOfMonth.getDay() + 6) % 7; // 0=Mon…6=Sun
  const daysToSunday = lastDayOfWeek === 6 ? 0 : 6 - lastDayOfWeek;
  const gridEnd = addDays(formatYMD(lastOfMonth), daysToSunday);

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