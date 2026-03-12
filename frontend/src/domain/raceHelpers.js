/**
 * Pure helpers for race state logic.
 *
 * All functions are side-effect-free — safe to unit-test in Node.
 */

/** Canonical race status values (mirrors frontspec.md). */
export const RACE_STATUS = /** @type {const} */ ({
  ACTIVE:    'active',
  ARCHIVED:  'archived',
  COMPLETED: 'completed',
});

/** Decisions a user can make when a conflict exists. */
export const CONFLICT_DECISION = /** @type {const} */ ({
  ARCHIVE:  'archive',
  COMPLETE: 'complete',
  CANCEL:   'cancel',
});

/**
 * Returns a human-friendly label for a race status.
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
 * Returns the single active race from an array, or `null`.
 * @param {Array<{id: string, status: string}>} races
 * @returns {{id: string, status: string} | null}
 */
export function getActiveRace(races) {
  return races.find((r) => r.status === RACE_STATUS.ACTIVE) ?? null;
}

/**
 * Returns the id of the single active race, or `null`.
 * @param {Array<{id: string, status: string}>} races
 * @returns {string | null}
 */
export function getActiveRaceId(races) {
  return getActiveRace(races)?.id ?? null;
}

/**
 * Returns only the races with status "active".
 * @param {Array<{id: string, status: string}>} races
 */
export function getSelectableRaces(races) {
  return races.filter((r) => r.status === RACE_STATUS.ACTIVE);
}

/**
 * Formats a race's date range: "Mar 10, 2026 – May 1, 2026"
 * @param {{ startDate: string, endDate: string }} race
 * @returns {string}
 */
export function formatRaceDateRange(race) {
  if (!race?.startDate || !race?.endDate) return '';
  const fmt = (ymd) => {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };
  return `${fmt(race.startDate)} – ${fmt(race.endDate)}`;
}

/**
 * Constructs a new Race object ready to be persisted.
 *
 * Accepts optional `id` and `now` overrides for deterministic testing.
 *
 * @param {{ name: string, startDate: string, endDate: string }} fields
 * @param {{ id?: string, now?: string }} [overrides]
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

/**
 * Pure function: given an existing active race and a user decision,
 * returns the mutations that should be applied.
 *
 * Return shape:
 *   { cancelled: true }
 *   — OR —
 *   { cancelled: false, updatedExisting: Race }
 *
 * The caller is responsible for actually persisting the changes and
 * creating the new race.
 *
 * @param {{
 *   existingActiveRace: { id: string, status: string, updatedAt: string },
 *   decision: 'archive' | 'complete' | 'cancel',
 *   now?: string   // injectable for tests
 * }} params
 * @returns {{ cancelled: true } | { cancelled: false, updatedExisting: object }}
 */
export function applyNewRaceDecision({ existingActiveRace, decision, now }) {
  if (decision === CONFLICT_DECISION.CANCEL) {
    return { cancelled: true };
  }

  const timestamp = now ?? new Date().toISOString();

  const newStatus =
    decision === CONFLICT_DECISION.ARCHIVE
      ? RACE_STATUS.ARCHIVED
      : RACE_STATUS.COMPLETED;

  return {
    cancelled: false,
    updatedExisting: {
      ...existingActiveRace,
      status:    newStatus,
      updatedAt: timestamp,
    },
  };
}