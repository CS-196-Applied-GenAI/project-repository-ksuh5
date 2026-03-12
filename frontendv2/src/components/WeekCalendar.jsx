/**
 * WeekCalendar — Step 10: uses DayCell (drag/drop)
 */
import {
  getWeekDays,
  groupPlannedByDate,
  shortDateLabel,
} from '../domain/calendarHelpers.js';
import DayCell from './DayCell.jsx';
import './WeekCalendar.css';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WeekCalendar({
  weekAnchor,
  plannedWorkouts,
  todayYMD,
  raceStartDate   = null,
  raceEndDate     = null,
  onPrevWeek,
  onNextWeek,
  onSelectWorkout = () => {},
  onDropWorkout   = () => {},
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
          const isOutOfRange = !!(raceStartDate && raceEndDate &&
            (ymd < raceStartDate || ymd > raceEndDate));

          return (
            <DayCell
              key={ymd}
              ymd={ymd}
              workouts={byDate[ymd] ?? []}
              isToday={ymd === todayYMD}
              isOutOfRange={isOutOfRange}
              isOtherMonth={false}
              compact={false}
              dateLabel={shortDateLabel(ymd)}
              onSelectWorkout={onSelectWorkout}
              onDropWorkout={onDropWorkout}
            />
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