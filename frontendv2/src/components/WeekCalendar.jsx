/**
 * WeekCalendar — Step 8: uses PlannedWorkoutCard, fires onSelectWorkout
 *
 * Props:
 *   weekAnchor        {string}
 *   plannedWorkouts   {PlannedWorkout[]}
 *   todayYMD          {string}
 *   raceStartDate     {string|null}
 *   raceEndDate       {string|null}
 *   onPrevWeek        {() => void}
 *   onNextWeek        {() => void}
 *   onSelectWorkout   {(workout: PlannedWorkout) => void}
 */
import {
  getWeekDays,
  groupPlannedByDate,
  shortDateLabel,
} from '../domain/calendarHelpers.js';
import PlannedWorkoutCard from './PlannedWorkoutCard.jsx';
import './WeekCalendar.css';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WeekCalendar({
  weekAnchor,
  plannedWorkouts,
  todayYMD,
  raceStartDate    = null,
  raceEndDate      = null,
  onPrevWeek,
  onNextWeek,
  onSelectWorkout  = () => {},
}) {
  const days   = getWeekDays(weekAnchor);
  const byDate = groupPlannedByDate(plannedWorkouts);
  const label  = buildWeekLabel(days);

  return (
    <div className="week-calendar">
      {/* Nav */}
      <div className="wc-nav">
        <button className="wc-nav__btn" onClick={onPrevWeek} aria-label="Previous week" type="button">‹</button>
        <span className="wc-nav__label">{label}</span>
        <button className="wc-nav__btn" onClick={onNextWeek} aria-label="Next week"     type="button">›</button>
      </div>

      {/* Column headers */}
      <div className="wc-grid wc-grid--header">
        {DAY_LABELS.map((l) => <div key={l} className="wc-col-header">{l}</div>)}
      </div>

      {/* Day cells */}
      <div className="wc-grid wc-grid--body">
        {days.map((ymd) => {
          const workouts     = byDate[ymd] ?? [];
          const isToday      = ymd === todayYMD;
          const isOutOfRange = raceStartDate && raceEndDate
            && (ymd < raceStartDate || ymd > raceEndDate);

          return (
            <div
              key={ymd}
              className={[
                'wc-day',
                isToday       ? 'wc-day--today'        : '',
                isOutOfRange  ? 'wc-day--out-of-range' : '',
                workouts.length > 0 ? 'wc-day--has-workouts' : '',
              ].filter(Boolean).join(' ')}
            >
              {/* Date label */}
              <div className="wc-day__date">
                <span className="wc-day__dom">{shortDateLabel(ymd)}</span>
                {isToday && <span className="wc-day__today-pill">today</span>}
              </div>

              {/* Planned workout cards */}
              {workouts.length === 0 ? (
                <p className="wc-day__empty">—</p>
              ) : (
                <ul className="wc-day__workouts">
                  {workouts.map((pw) => (
                    <li key={pw.id}>
                      <PlannedWorkoutCard
                        workout={pw}
                        onClick={onSelectWorkout}
                        compact={false}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildWeekLabel(days) {
  const start = days[0];
  const end   = days[6];
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  const fmtMonth = (y, m) =>
    new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' });
  const startStr = `${fmtMonth(sy, sm)} ${parseInt(start.split('-')[2])}`;
  const endStr   = `${sm !== em ? fmtMonth(ey, em) + ' ' : ''}${ed}, ${ey}`;
  return `${startStr} – ${endStr}`;
}