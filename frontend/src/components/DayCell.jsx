/**
 * DayCell
 *
 * A calendar day cell that acts as an HTML5 drop target.
 * Shared between WeekCalendar and MonthCalendar.
 *
 * Props:
 *   ymd              {string}             YYYY-MM-DD
 *   workouts         {PlannedWorkout[]}   workouts on this day
 *   isToday          {boolean}
 *   isOutOfRange     {boolean}            outside race date range
 *   isOtherMonth     {boolean}            month view: padding day
 *   compact          {boolean}            true = month view sizing
 *   dateLabel        {string}             display string for the date
 *   onSelectWorkout  {(pw) => void}
 *   onDropWorkout    {(workoutId, targetDate) => void}
 */
import { useState } from 'react';
import PlannedWorkoutCard from './PlannedWorkoutCard.jsx';
import './DayCell.css';

const MIME = 'application/x-plannedworkoutid';

export default function DayCell({
  ymd,
  workouts,
  isToday       = false,
  isOutOfRange  = false,
  isOtherMonth  = false,
  compact       = false,
  dateLabel,
  onSelectWorkout,
  onDropWorkout,
}) {
  const [dragOver, setDragOver] = useState(false);

  // ── drag source: set workout id in dataTransfer ────────
  function handleDragStart(e, workout) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(MIME, workout.id);
    // Fallback for browsers that don't support custom MIME
    e.dataTransfer.setData('text/plain', workout.id);
  }

  // ── drop target handlers ───────────────────────────────
  function handleDragOver(e) {
    // Only accept our own draggable type
    if ([...e.dataTransfer.types].some((t) => t === MIME || t === 'text/plain')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOver(true);
    }
  }

  function handleDragLeave(e) {
    // Only clear if we're actually leaving this cell (not a child element)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOver(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);

    const workoutId =
      e.dataTransfer.getData(MIME) ||
      e.dataTransfer.getData('text/plain');

    if (!workoutId) return;
    onDropWorkout(workoutId, ymd);
  }

  function handleDragEnd() {
    setDragOver(false);
  }

  // ── class assembly ─────────────────────────────────────
  const cellClass = [
    compact ? 'day-cell day-cell--compact' : 'day-cell',
    isToday       ? 'day-cell--today'        : '',
    isOutOfRange  ? 'day-cell--out-of-range' : '',
    isOtherMonth  ? 'day-cell--other-month'  : '',
    dragOver      ? 'day-cell--drag-over'    : '',
    workouts.length > 0 ? 'day-cell--has-workouts' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cellClass}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Date label */}
      <div className="day-cell__date">
        <span className="day-cell__dom">{dateLabel}</span>
        {isToday && <span className="day-cell__today-pill">today</span>}
      </div>

      {/* Workout cards */}
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
                compact={compact}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}