import { useEffect, useState } from 'react';

export const COMPLETED_PLANNED_WORKOUTS_LS_KEY = 'pw:completedIds:v1';

/**
 * React hook that provides a live Set of completed planned-workout IDs.
 * - Persists in localStorage
 * - Updates immediately within the same tab (via setter)
 * - Updates across tabs (via storage event)
 */
export function useCompletedPlannedWorkouts() {
  const [completedIds, setCompletedIds] = useState(() => {
    try {
      const raw = localStorage.getItem(COMPLETED_PLANNED_WORKOUTS_LS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []);
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    function onStorage(e) {
      if (e.key !== COMPLETED_PLANNED_WORKOUTS_LS_KEY) return;
      try {
        const raw = localStorage.getItem(COMPLETED_PLANNED_WORKOUTS_LS_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        setCompletedIds(new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []));
      } catch {
        setCompletedIds(new Set());
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function setCompleted(plannedWorkoutId, checked) {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(plannedWorkoutId);
      else next.delete(plannedWorkoutId);

      try {
        localStorage.setItem(
          COMPLETED_PLANNED_WORKOUTS_LS_KEY,
          JSON.stringify(Array.from(next))
        );
      } catch {
        // ignore
      }

      return next;
    });
  }

  return { completedIds, setCompleted };
}