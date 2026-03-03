import { useState, useEffect, useCallback } from 'react';
import db from '../db/db.js';

export function useAppData() {
  const [races,           setRaces]           = useState([]);
  const [plannedWorkouts, setPlannedWorkouts] = useState([]);
  const [workoutLogs,     setWorkoutLogs]     = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // All three must be loaded together — missing workoutLogs here
      // is the most common reason logs appear to revert after a move.
      const [r, pw, wl] = await Promise.all([
        db.races.toArray(),
        db.plannedWorkouts.toArray(),
        db.workoutLogs.toArray(),
      ]);
      setRaces(r);
      setPlannedWorkouts(pw);
      setWorkoutLogs(wl);
    } catch (err) {
      console.error('[useAppData] load failed:', err);
      setError(err.message ?? 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { races, plannedWorkouts, workoutLogs, loading, error, reload: load };
}