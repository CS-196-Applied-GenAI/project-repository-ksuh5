import { useEffect, useRef } from 'react';
import { buildSnapshot } from '../db/snapshotHelpers.js';
import { saveState }     from '../api/stateApi.js';

const DEBOUNCE_MS = 1500;

/**
 * useAutoSave
 *
 * Watches races, plannedWorkouts, and workoutLogs for changes.
 * Debounces 1500ms after any change, then builds a snapshot from
 * Dexie and POSTs it to the backend via saveState().
 * Errors are logged to console only — no user-visible failure.
 *
 * @param {{ races: Array, plannedWorkouts: Array, workoutLogs: Array }} data
 */
export function useAutoSave({ races, plannedWorkouts, workoutLogs }) {
  const timerRef    = useRef(null);
  const isMountRef  = useRef(true);

  useEffect(() => {
    // Skip the very first render (mount) — no mutation has occurred yet
    if (isMountRef.current) {
      isMountRef.current = false;
      return;
    }

    // Clear any pending debounce
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        const snapshot = await buildSnapshot();
        await saveState(snapshot);
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [races, plannedWorkouts, workoutLogs]);
}