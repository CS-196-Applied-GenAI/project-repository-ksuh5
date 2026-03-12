/**
 * Pure formatting helpers.
 * No side-effects, no Dexie imports — safe to unit-test in Node.
 */

/**
 * Format a table count for display.
 * Returns a human-readable string like "3 races" or "1 planned workout".
 *
 * @param {number} count
 * @param {string} singular  e.g. "race"
 * @param {string} [plural]  e.g. "races"  (defaults to singular + "s")
 * @returns {string}
 */
export function formatCount(count, singular, plural) {
  const label = count === 1 ? singular : (plural ?? singular + 's');
  return `${count} ${label}`;
}

/**
 * Returns true if there is at least one record with status === 'active'.
 *
 * @param {Array<{status: string}>} records
 * @returns {boolean}
 */
export function hasActiveRecord(records) {
  return records.some((r) => r.status === 'active');
}