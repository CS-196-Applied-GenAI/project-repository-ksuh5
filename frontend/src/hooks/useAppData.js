/**
 * useAppData
 *
 * Loads all three tables from Dexie into React state on mount.
 * Also exposes a `reload` function to re-query after mutations.
 */
import { useState, useEffect, useCallback } from 'react';
import db from '../db/db.js';

export function useAppData() {
  const [races, setRaces] = useState([]);
  const [plannedWorkouts, setPlannedWorkouts] = useState([]);
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, pw, wl] = await Promise.all([
        db.races.toArray(),
        db.plannedWorkouts.toArray(),
        db.workoutLogs.toArray(),
      ]);
      setRaces(r);
      setPlannedWorkouts(pw);
      setWorkoutLogs(wl);
    } catch (err) {
      console.error('Failed to load data from Dexie:', err);
      setError(err.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load once on mount
  useEffect(() => {
    load();
  }, [load]);

  return { races, plannedWorkouts, workoutLogs, loading, error, reload: load };
}