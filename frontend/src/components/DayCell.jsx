import { useState } from 'react';
import PlannedWorkoutCard from './PlannedWorkoutCard.jsx';
import './DayCell.css';

const MIME = 'application/x-plannedworkoutid';

export default function DayCell({
  ymd,
  workouts,
  isToday         = false,
  isOutOfRange    = false,
  isOtherMonth    = false,
  compact         = false,
  dateLabel,
  onSelectWorkout,
  onDropWorkout,
  onToggleComplete,
}) {
  const [dragOver, setDragOver] = useState(false);

  function handleDragStart(e, workout) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(MIME, workout.id);
    e.dataTransfer.setData('text/plain', workout.id);
  }

  function handleDragOver(e) {
    if ([...e.dataTransfer.types].some((t) => t === MIME || t === 'text/plain')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOver(true);
    }
  }

  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const workoutId = e.dataTransfer.getData(MIME) || e.dataTransfer.getData('text/plain');
    if (!workoutId) return;
    onDropWorkout(workoutId, ymd);
  }

  function handleDragEnd() { setDragOver(false); }

  const cellClass = [
    compact ? 'day-cell day-cell--compact' : 'day-cell',
    isToday      ? 'day-cell--today'        : '',
    isOutOfRange ? 'day-cell--out-of-range' : '',
    isOtherMonth ? 'day-cell--other-month'  : '',
    dragOver     ? 'day-cell--drag-over'    : '',
    workouts.length > 0 ? 'day-cell--has-workouts' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cellClass} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <div className="day-cell__date">
        <span className="day-cell__dom">{dateLabel}</span>
        {isToday && <span className="day-cell__today-pill">today</span>}
      </div>

      {workouts.length === 0 ? (
        compact ? null : <p className="day-cell__empty">—</p>
      ) : (
        <ul className="day-cell__workouts">
          {workouts.map((pw) => (
            <li
              key={pw.id}
              draggable
              onDragStart={(e) => handleDragStart(e, pw)}
              onDragEnd={handleDragEnd}
              className="day-cell__workout-item"
            >
              <PlannedWorkoutCard
                workout={pw}
                onClick={onSelectWorkout}
                onToggleComplete={onToggleComplete}
                compact={compact}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}