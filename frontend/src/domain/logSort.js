/**
 * Chronological comparator for WorkoutLog records.
 *
 * Sort order:
 *   1. date         ASC  (YYYY-MM-DD string comparison is safe)
 *   2. time         ASC  (HH:MM string) — null times sort LAST
 *   3. createdAt    ASC  (ISO string tiebreaker)
 *
 * Usage:
 *   const sorted = [...logs].sort(compareLogsChronological);
 *
 * @param {{ date: string, time: string|null, createdAt: string }} a
 * @param {{ date: string, time: string|null, createdAt: string }} b
 * @returns {number}
 */
export function compareLogsChronological(a, b) {
  // 1. Date (YYYY-MM-DD — lexicographic comparison is correct)
  if (a.date < b.date) return -1;
  if (a.date > b.date) return 1;

  // 2. Time — null sorts last
  const aTime = a.time ?? null;
  const bTime = b.time ?? null;

  if (aTime !== null && bTime !== null) {
    if (aTime < bTime) return -1;
    if (aTime > bTime) return 1;
  } else if (aTime === null && bTime !== null) {
    return 1; // a has no time → sort after b
  } else if (aTime !== null && bTime === null) {
    return -1; // b has no time → sort after a
  }
  // both null → fall through to createdAt

  // 3. CreatedAt tiebreaker
  if (a.createdAt < b.createdAt) return -1;
  if (a.createdAt > b.createdAt) return 1;
  return 0;
}