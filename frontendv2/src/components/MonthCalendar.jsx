/**
 * MonthCalendar — Step 8: uses PlannedWorkoutCard, fires onSelectWorkout
 *
 * Props:
 *   monthAnchor       {string}
 *   plannedWorkouts   {PlannedWorkout[]}
 *   todayYMD          {string}
 *   raceStartDate     {string|null}
 *   raceEndDate       {string|null}
 *   onPrevMonth       {() => void}
 *   onNextMonth       {() => void}
 *   onSelectWorkout   {(workout: PlannedWorkout) => void}
 */
import {
  getMonthGrid,
  groupPlannedByDate,
  monthYearLabel,
  parseYMD,
} from '../domain/calendarHelpers.js';
import PlannedWorkoutCard from './PlannedWorkoutCard.jsx';
import './MonthCalendar.css';

const COL_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function MonthCalendar({
  monthAnchor,
  plannedWorkouts,
  todayYMD,
  raceStartDate    = null,
  raceEndDate      = null,
  onPrevMonth,
  onNextMonth,
  onSelectWorkout  = () => {},
}) {
  const weeks     = getMonthGrid(monthAnchor);
  const byDate    = groupPlannedByDate(plannedWorkouts);
  const label     = monthYearLabel(monthAnchor);
  const viewMonth = monthAnchor.slice(0, 7);

  return (
    <div className="month-calendar">
      {/* Nav */}
      <div className="mc-nav">
        <button className="mc-nav__btn" onClick={onPrevMonth} aria-label="Previous month" type="button">‹</button>
        <span className="mc-nav__label">{label}</span>
        <button className="mc-nav__btn" onClick={onNextMonth} aria-label="Next month"     type="button">›</button>
      </div>

      {/* Column headers */}
      <div className="mc-grid mc-grid--header">
        {COL_HEADERS.map((h) => <div key={h} className="mc-col-header">{h}</div>)}
      </div>

      {/* Day cells */}
      <div className="mc-grid mc-grid--body">
        {weeks.map((week) =>
          week.map((ymd) => {
            const workouts       = byDate[ymd] ?? [];
            const isToday        = ymd === todayYMD;
            const isCurrentMonth = ymd.slice(0, 7) === viewMonth;
            const isOutOfRange   = raceStartDate && raceEndDate
              && (ymd < raceStartDate || ymd > raceEndDate);

            return (
              <div
                key={ymd}
                className={[
                  'mc-day',
                  isToday          ? 'mc-day--today'        : '',
                  !isCurrentMonth  ? 'mc-day--other-month'  : '',
                  isOutOfRange     ? 'mc-day--out-of-range' : '',
                  workouts.length > 0 ? 'mc-day--has-workouts' : '',
                ].filter(Boolean).join(' ')}
              >
                {/* Date number */}
                <div className="mc-day__date">
                  <span className="mc-day__dom">{parseInt(ymd.split('-')[2])}</span>
                  {isToday && <span className="mc-day__today-pill">today</span>}
                </div>

                {/* Planned workout cards */}
                {workouts.length > 0 && (
                  <ul className="mc-day__workouts">
                    {workouts.map((pw) => (
                      <li key={pw.id}>
                        <PlannedWorkoutCard
                          workout={pw}
                          onClick={onSelectWorkout}
                          compact={true}
                        />
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