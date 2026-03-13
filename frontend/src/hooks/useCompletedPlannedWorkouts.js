import { useEffect, useState } from 'react';

const LS_KEY = 'pw:completedIds:v1';

function readCompletedSet() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(arr);
  } catch {
    return new Set();
  }
}

export function useCompletedPlannedWorkouts() {
  const [completedIds, setCompletedIds] = useState(() => readCompletedSet());

  useEffect(() => {
    function updateFromStorage() {
      setCompletedIds(readCompletedSet());
    }

    function handleCustomUpdate(e) {
      setCompletedIds(new Set(e.detail.completedIds));
    }

    window.addEventListener('storage', updateFromStorage);
    window.addEventListener('pw-completed-updated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', updateFromStorage);
      window.removeEventListener('pw-completed-updated', handleCustomUpdate);
    };
  }, []);

  return { completedIds };
}