/**
 * PlannedWorkoutCard — Step 10: draggable
 *
 * Props:
 *   workout    {PlannedWorkout}
 *   onClick    {(workout: PlannedWorkout) => void}
 *   compact    {boolean}
 *   draggable  {boolean}   default false
 *   dragMime   {string}    MIME type for dataTransfer
 */
import { useEffect, useMemo, useState } from 'react';
import { displayWorkoutType, isQualityType } from '../domain/workoutTypes.js';
import './PlannedWorkoutCard.css';

const LS_KEY = 'pw:completedIds:v1';

function readCompletedSet() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x) => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

function writeCompletedSet(set) {
  const arr = Array.from(set);

  localStorage.setItem(LS_KEY, JSON.stringify(arr));

  window.dispatchEvent(
    new CustomEvent('pw-completed-updated', {
      detail: { completedIds: arr },
    })
  );
}
export default function PlannedWorkoutCard({
  workout,
  onClick,
  compact   = false,
  draggable = false,
  dragMime  = 'application/x-plannedworkoutid',
}) {
  const quality = isQualityType(workout.type);
  const label   = displayWorkoutType(workout.type);
  const meta    = buildMeta(workout);

  const [completedIds, setCompletedIds] = useState(() => readCompletedSet());

  // keep in sync across tabs/windows
 useEffect(() => {
  function handleUpdate(e) {
    setCompletedIds(new Set(e.detail.completedIds));
  }

  window.addEventListener('pw-completed-updated', handleUpdate);
  return () => window.removeEventListener('pw-completed-updated', handleUpdate);
}, []);

  const isCompleted = useMemo(() => completedIds.has(workout.id), [completedIds, workout.id]);

  function toggleCompleted(e) {
    // e.preventDefault();
    e.stopPropagation();
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(workout.id)) next.delete(workout.id);
      else next.add(workout.id);
      writeCompletedSet(next);
      return next;
    });
  }

  // ── Drag handlers ─────────────────────────────────────

  function handleDragStart(e) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(dragMime, workout.id);
    // Small timeout so the ghost image appears before any visual changes
    setTimeout(() => e.target.classList.add('pw-card--dragging'), 0);
  }

  function handleDragEnd(e) {
    e.target.classList.remove('pw-card--dragging');
  }

  return (
    <div
      className={[
        'pw-card-row',
        isCompleted ? 'pw-card-row--completed' : '',
      ].filter(Boolean).join(' ')}
    >
      <input
        type="checkbox"
        className="pw-card-row__checkbox"
        checked={isCompleted}
        onChange={toggleCompleted}
        aria-label={`Mark ${label} as completed`}
      />

      <button
        type="button"
        className={[
          'pw-card',
          quality        ? 'pw-card--quality' : '',
          compact        ? 'pw-card--compact'  : '',
          workout.locked ? 'pw-card--locked'   : '',
          isCompleted    ? 'pw-card--completed' : '',
        ].filter(Boolean).join(' ')}
        onClick={() => onClick(workout)}
        title={workout.title || label}
        aria-label={`${label}${meta ? ', ' + meta : ''}${workout.locked ? ', locked' : ''}`}
        draggable={draggable}
        onDragStart={draggable ? handleDragStart : undefined}
        onDragEnd={draggable   ? handleDragEnd   : undefined}
      >
        <span className="pw-card__type">{label}</span>

        {!compact && meta && (
          <span className="pw-card__meta">{meta}</span>
        )}

        {workout.locked && (
          <span className="pw-card__lock" aria-hidden="true">🔒</span>
        )}
      </button>
    </div>
  );
}

function buildMeta(workout) {
  const parts = [];
  if (workout.distance)        parts.push(`${workout.distance} mi`);
  if (workout.durationMinutes) parts.push(`${workout.durationMinutes} min`);
  return parts.join(' · ');
}