/**
 * WorkoutLogCard — now draggable, matching PlannedWorkoutCard behaviour.
 *
 * Props:
 *   log      {WorkoutLog}
 *   compact  {boolean}
 *   draggable {boolean}   default true
 */
import { displayWorkoutType } from '../domain/workoutTypes.js';
import './WorkoutLogCard.css';

export const LOG_DRAG_MIME = 'application/x-workoutlogid';

export default function WorkoutLogCard({ log, compact = false, draggable = true }) {
  const label = displayWorkoutType(log.type);
  const meta  = buildMeta(log);

  function handleDragStart(e) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(LOG_DRAG_MIME, log.id);
    setTimeout(() => e.target.classList.add('wl-card--dragging'), 0);
  }

  function handleDragEnd(e) {
    e.target.classList.remove('wl-card--dragging');
  }

  return (
    <div
      className={[
        'wl-card',
        compact          ? 'wl-card--compact'    : '',
        log.plannedWorkoutId ? 'wl-card--attached'  : 'wl-card--unplanned',
        draggable        ? 'wl-card--draggable'  : '',
      ].filter(Boolean).join(' ')}
      title={`Log: ${label}${meta ? ' · ' + meta : ''}${log.plannedWorkoutId ? '' : ' (unplanned)'} — drag to reschedule`}
      aria-label={`Logged ${label}${meta ? ', ' + meta : ''}`}
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
      onDragEnd={draggable   ? handleDragEnd   : undefined}
      role={draggable ? 'button' : undefined}
      tabIndex={draggable ? 0 : undefined}
    >
      <span className="wl-card__icon" aria-hidden="true">✏️</span>
      <span className="wl-card__type">{label}</span>
      {!compact && meta && (
        <span className="wl-card__meta">{meta}</span>
      )}
    </div>
  );
}

function buildMeta(log) {
  const parts = [];
  if (log.distance)        parts.push(`${log.distance} mi`);
  if (log.durationMinutes) parts.push(`${log.durationMinutes} min`);
  return parts.join(' · ');
}