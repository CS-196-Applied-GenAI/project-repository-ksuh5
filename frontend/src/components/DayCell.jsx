/**
 * DayCell
 *
 * Renders planned workouts AND workout logs using PlannedWorkoutCard for
 * both, so logs get identical drag/drop and click-to-open behaviour.
 *
 * Log-backed cards are visually distinguished by the `.pw-card--log` modifier.
 *
 * Props:
 *   ymd             {string}
 *   workouts        {PlannedWorkout[]}          real planned workouts
 *   logs            {PlannedWorkout-shaped[]}   logToPlannedWorkout() results
 *   isToday         {boolean}
 *   isOutOfRange    {boolean}
 *   isOtherMonth    {boolean}
 *   compact         {boolean}
 *   onSelectWorkout {(pw) => void}
 *   onDrop          {(id, targetDate) => void}  handles both pw and log ids
 *   renderDateLabel {(ymd) => ReactNode}
 */
import { useState } from 'react';
import PlannedWorkoutCard from './PlannedWorkoutCard.jsx';
import './DayCell.css';

const DRAG_MIME = 'application/x-plannedworkoutid';

export default function DayCell({
  ymd,
  workouts        = [],
  logs            = [],
  isToday         = false,
  isOutOfRange    = false,
  isOtherMonth    = false,
  compact         = false,
  onSelectWorkout = () => {},
  onDrop          = () => {},
  renderDateLabel,
}) {
  const [dragOver, setDragOver] = useState(false);

  function isDragOurs(e) {
    return [...e.dataTransfer.types].includes(DRAG_MIME);
  }

  function handleDragEnter(e) {
    if (isDragOurs(e)) { e.preventDefault(); setDragOver(true); }
  }

  function handleDragOver(e) {
    if (isDragOurs(e)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!dragOver) setDragOver(true);
    }
  }

  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const id = e.dataTransfer.getData(DRAG_MIME);
    if (id) onDrop(id, ymd);
  }

  const hasContent = workouts.length > 0 || logs.length > 0;

  const classes = [
    'day-cell',
    compact      ? 'day-cell--compact'     : '',
    isToday      ? 'day-cell--today'        : '',
    isOutOfRange ? 'day-cell--out-of-range' : '',
    isOtherMonth ? 'day-cell--other-month'  : '',
    hasContent   ? 'day-cell--has-workouts' : '',
    dragOver     ? 'day-cell--drag-over'    : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="day-cell__date">
        {renderDateLabel ? renderDateLabel(ymd) : <span>{ymd}</span>}
        {isToday && <span className="day-cell__today-pill">today</span>}
      </div>

      {!hasContent && !compact && (
        <p className="day-cell__empty">—</p>
      )}

      {/* Real planned workouts */}
      {workouts.length > 0 && (
        <ul className="day-cell__workouts">
          {workouts.map((pw) => (
            <li key={pw.id}>
              <PlannedWorkoutCard
                workout={pw}
                onClick={onSelectWorkout}
                compact={compact}
                draggable={true}
                dragMime={DRAG_MIME}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Log-backed cards — same component, log modifier applied inside */}
      {logs.length > 0 && (
        <ul className="day-cell__logs">
          {logs.map((lw) => (
            <li key={lw.id}>
              <PlannedWorkoutCard
                workout={lw}
                onClick={onSelectWorkout}
                compact={compact}
                draggable={true}
                dragMime={DRAG_MIME}
                isLog={true}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}