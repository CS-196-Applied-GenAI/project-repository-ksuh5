/**
 * Pure helpers for race state logic.
 *
 * All functions are side-effect-free — safe to unit-test in Node.
 */

/** Canonical race status values (mirrors frontspec.md). */
export const RACE_STATUS = /** @type {const} */ ({
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  COMPLETED: 'completed',
});

/**
 * Returns a human-friendly label for a race status.
 *
 * @param {string} status
 * @returns {string}
 */
export function displayRaceStatus(status) {
  switch (status) {
    case RACE_STATUS.ACTIVE:    return 'Active';
    case RACE_STATUS.ARCHIVED:  return 'Archived';
    case RACE_STATUS.COMPLETED: return 'Completed';
    default:                    return status ?? 'Unknown';
  }
}

/**
 * Returns the single active race from an array of races, or `null`.
 *
 * @param {Array<{id: string, status: string}>} races
 * @returns {{id: string, status: string} | null}
 */
export function getActiveRace(races) {
  return races.find((r) => r.status === RACE_STATUS.ACTIVE) ?? null;
}

/**
 * Returns the id of the single active race, or `null`.
 *
 * @param {Array<{id: string, status: string}>} races
 * @returns {string | null}
 */
export function getActiveRaceId(races) {
  const race = getActiveRace(races);
  return race ? race.id : null;
}

/**
 * Returns only the races with status "active".
 *
 * @param {Array<{id: string, status: string}>} races
 * @returns {Array<{id: string, status: string}>}
 */
export function getSelectableRaces(races) {
  return races.filter((r) => r.status === RACE_STATUS.ACTIVE);
}

/**
 * Formats a race's date range as a short string.
 * e.g. "Mar 10, 2026 – May 1, 2026"
 *
 * @param {{ startDate: string, endDate: string }} race
 * @returns {string}
 */
export function formatRaceDateRange(race) {
  if (!race?.startDate || !race?.endDate) return '';
  const fmt = (ymd) => {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  return `${fmt(race.startDate)} – ${fmt(race.endDate)}`;
}

/**
 * Constructs a new Race object ready to be persisted.
 *
 * Pure function: accepts an optional `now` ISO string and `id` so tests
 * can inject deterministic values without mocking globals.
 *
 * @param {{
 *   name: string,
 *   startDate: string,
 *   endDate: string,
 * }} fields
 * @param {{
 *   id?: string,
 *   now?: string,
 * }} [overrides]  Inject id / timestamp for tests.
 * @returns {{
 *   id: string,
 *   name: string,
 *   startDate: string,
 *   endDate: string,
 *   status: 'active',
 *   createdAt: string,
 *   updatedAt: string,
 * }}
 */
export function makeRace(fields, overrides = {}) {
  const id  = overrides.id  ?? crypto.randomUUID();
  const now = overrides.now ?? new Date().toISOString();
  return {
    id,
    name:      fields.name.trim(),
    startDate: fields.startDate,
    endDate:   fields.endDate,
    status:    RACE_STATUS.ACTIVE,
    createdAt: now,
    updatedAt: now,
  };
}