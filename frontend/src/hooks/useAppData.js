import { useState, useEffect, useCallback } from 'react';
import db                from '../db/db.js';
import { loadState }     from '../api/stateApi.js';
import { applySnapshot } from '../db/snapshotHelpers.js';

async function isDexieEmpty() {
  const [rCount, pwCount, wlCount] = await Promise.all([
    db.races.count(),
    db.plannedWorkouts.count(),
    db.workoutLogs.count(),
  ]);
  return rCount === 0 && pwCount === 0 && wlCount === 0;
}

export function useAppData() {
  const [races,           setRaces]           = useState([]);
  const [plannedWorkouts, setPlannedWorkouts]  = useState([]);
  const [workoutLogs,     setWorkoutLogs]      = useState([]);
  const [loading,         setLoading]          = useState(true);
  const [error,           setError]            = useState(null);

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

  // ── Bootstrap on mount ────────────────────────────────
  // If Dexie is empty, attempt to restore from backend snapshot before
  // loading into React state. Failures are non-fatal (best-effort).
  useEffect(() => {
    async function bootstrap() {
      try {
        const empty = await isDexieEmpty();
        if (empty) {
          const snapshot = await loadState();
          if (snapshot) {
            await applySnapshot(snapshot);
          }
        }
      } catch (err) {
        console.warn('Bootstrap from backend snapshot failed:', err);
      } finally {
        await load();
      }
    }
    bootstrap();
  }, [load]);

  return { races, plannedWorkouts, workoutLogs, loading, error, reload: load };
}