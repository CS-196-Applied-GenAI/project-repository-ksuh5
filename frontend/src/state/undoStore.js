// Module-level variable — intentionally NOT React state.
// This allows undo to work across re-renders without triggering re-renders itself.
let _snapshot = null;

/**
 * Save a snapshot of workouts for potential undo.
 * @param {Array} workouts
 */
export function setSnapshot(workouts) {
  _snapshot = workouts;
}

/**
 * Retrieve the current snapshot.
 * @returns {Array|null}
 */
export function getSnapshot() {
  return _snapshot;
}

/**
 * Clear the snapshot (e.g. after undo is used or a new mutation invalidates it).
 */
export function clearSnapshot() {
  _snapshot = null;
}