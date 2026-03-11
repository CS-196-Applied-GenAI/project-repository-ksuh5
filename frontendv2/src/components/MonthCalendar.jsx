/**
 * MonthCalendar
 *
 * Renders a Monday-based month grid (5 or 6 week rows × 7 columns).
 * Shows planned workout type chips in each day cell, same as WeekCalendar.
 *
 * Props:
 *   monthAnchor     {string}            YYYY-MM-DD — any date in the target month
 *   plannedWorkouts {PlannedWorkout[]}  filtered to the active race
 *   todayYMD        {string}
 *   raceStartDate   {string|null}
 *   raceEndDate     {string|null}
 *   onPrevMonth     {() => void}
 *   onNextMonth     {() => void}
 */
import {
  getMonthGrid,
  groupPlannedByDate,
  shortDateLabel,
  monthYearLabel,
  parseYMD,
} from '../domain/calendarHelpers.js';
import { displayWorkoutType, isQualityType } from '../domain/workoutTypes.js';
import './MonthCalendar.css';

const COL_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function MonthCalendar({
  monthAnchor,
  plannedWorkouts,
  todayYMD,
  raceStartDate = null,
  raceEndDate   = null,
  onPrevMonth,
  onNextMonth,
}) {
  const weeks  = getMonthGrid(monthAnchor);
  const byDate = groupPlannedByDate(plannedWorkouts);
  const label  = monthYearLabel(monthAnchor);

  // Determine which month we're viewing so out-of-month days can be dimmed
  const viewMonth = monthAnchor.slice(0, 7); // "YYYY-MM"

  return (
    <div className="month-calendar">
      {/* ── Navigation bar ────────────────────────── */}
      <div className="mc-nav">
        <button
          className="mc-nav__btn"
          onClick={onPrevMonth}
          aria-label="Previous month"
          type="button"
        >
          ‹
        </button>
        <span className="mc-nav__label">{label}</span>
        <button
          className="mc-nav__btn"
          onClick={onNextMonth}
          aria-label="Next month"
          type="button"
        >
          ›
        </button>
      </div>

      {/* ── Column headers ────────────────────────── */}
      <div className="mc-grid mc-grid--header">
        {COL_HEADERS.map((h) => (
          <div key={h} className="mc-col-header">{h}</div>
        ))}
      </div>

      {/* ── Week rows ─────────────────────────────── */}
      <div className="mc-grid mc-grid--body">
        {weeks.map((week) =>
          week.map((ymd) => {
            const workouts      = byDate[ymd] ?? [];
            const isToday       = ymd === todayYMD;
            const isCurrentMonth = ymd.slice(0, 7) === viewMonth;
            const isInRace      = inRace(ymd, raceStartDate, raceEndDate);
            const isOutOfRange  = raceStartDate && raceEndDate && !isInRace;

            return (
              <div
                key={ymd}
                className={[
                  'mc-day',
                  isToday          ? 'mc-day--today'           : '',
                  !isCurrentMonth  ? 'mc-day--other-month'     : '',
                  isOutOfRange     ? 'mc-day--out-of-range'    : '',
                  workouts.length > 0 ? 'mc-day--has-workouts' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {/* Date number */}
                <div className="mc-day__date">
                  <span className="mc-day__dom">
                    {parseInt(ymd.split('-')[2])}
                  </span>
                  {isToday && (
                    <span className="mc-day__today-pill">today</span>
                  )}
                </div>

                {/* Workout chips */}
                {workouts.length > 0 && (
                  <ul className="mc-day__workouts">
                    {workouts.map((pw) => (
                      <li
                        key={pw.id}
                        className={`mc-chip ${isQualityType(pw.type) ? 'mc-chip--quality' : ''}`}
                        title={pw.title || displayWorkoutType(pw.type)}
                      >
                        <span className="mc-chip__label">
                          {displayWorkoutType(pw.type)}
                        </span>
                        {pw.locked && (
                          <span className="mc-chip__lock">🔒</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────

function inRace(ymd, start, end) {
  if (!start || !end) return true;
  return ymd >= start && ymd <= end;
}