/**
 * PlannedWorkoutCard
 *
 * Compact chip rendered inside a calendar day cell.
 *
 * Props:
 *   workout    {PlannedWorkout}
 *   onClick    {(workout: PlannedWorkout) => void}
 *   compact    {boolean}  true = month view (even smaller)
 */
import { displayWorkoutType, isQualityType } from '../domain/workoutTypes.js';
import './PlannedWorkoutCard.css';

export default function PlannedWorkoutCard({ workout, onClick, compact = false }) {
  const quality = isQualityType(workout.type);
  const label   = displayWorkoutType(workout.type);

  // Build a short meta string: "3 mi · 30 min"
  const meta = buildMeta(workout);

  return (
    <button
      type="button"
      className={[
        'pw-card',
        quality        ? 'pw-card--quality' : '',
        compact        ? 'pw-card--compact'  : '',
        workout.locked ? 'pw-card--locked'   : '',
      ].filter(Boolean).join(' ')}
      onClick={() => onClick(workout)}
      title={workout.title || label}
      aria-label={`${label}${meta ? ', ' + meta : ''}${workout.locked ? ', locked' : ''}`}
    >
      <span className="pw-card__type">{label}</span>

      {!compact && meta && (
        <span className="pw-card__meta">{meta}</span>
      )}

      {workout.locked && (
        <span className="pw-card__lock" aria-hidden="true">🔒</span>
      )}
    </button>
  );
}

// ── helpers ───────────────────────────────────────────────

function buildMeta(workout) {
  const parts = [];
  if (workout.distance)        parts.push(`${workout.distance} mi`);
  if (workout.durationMinutes) parts.push(`${workout.durationMinutes} min`);
  return parts.join(' · ');
}