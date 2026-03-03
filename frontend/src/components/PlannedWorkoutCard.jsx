/**
 * PlannedWorkoutCard
 *
 * Used for both real planned workouts and log-backed projected objects.
 * Pass isLog=true to apply the green log styling.
 */
import { displayWorkoutType, isQualityType } from '../domain/workoutTypes.js';
import './PlannedWorkoutCard.css';

export default function PlannedWorkoutCard({
  workout,
  onClick,
  compact   = false,
  draggable = false,
  dragMime  = 'application/x-plannedworkoutid',
  isLog     = false,
}) {
  const quality = isQualityType(workout.type);
  const label   = displayWorkoutType(workout.type);
  const meta    = buildMeta(workout);

  function handleDragStart(e) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(dragMime, workout.id);
    setTimeout(() => e.target.classList.add('pw-card--dragging'), 0);
  }

  function handleDragEnd(e) {
    e.target.classList.remove('pw-card--dragging');
  }

  return (
    <button
      type="button"
      className={[
        'pw-card',
        quality        ? 'pw-card--quality'  : '',
        compact        ? 'pw-card--compact'   : '',
        workout.locked ? 'pw-card--locked'    : '',
        isLog          ? 'pw-card--log'       : '',
      ].filter(Boolean).join(' ')}
      onClick={() => onClick(workout)}
      title={workout.title || label}
      aria-label={`${isLog ? 'Log: ' : ''}${label}${meta ? ', ' + meta : ''}${workout.locked ? ', locked' : ''}`}
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
      onDragEnd={draggable   ? handleDragEnd   : undefined}
    >
      {isLog && <span className="pw-card__log-icon" aria-hidden="true">✏️</span>}
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

function buildMeta(workout) {
  const parts = [];
  if (workout.distance)        parts.push(`${workout.distance} mi`);
  if (workout.durationMinutes) parts.push(`${workout.durationMinutes} min`);
  return parts.join(' · ');
}