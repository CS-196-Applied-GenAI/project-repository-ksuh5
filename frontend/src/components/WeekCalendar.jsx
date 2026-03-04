import {
  getWeekDays,
  groupPlannedByDate,
  shortDateLabel,
} from '../domain/calendarHelpers.js';
import { groupLogsByDate } from '../domain/logSort.js';
import { logToPlannedWorkout } from '../domain/logHelpers.js';
import DayCell from './DayCell.jsx';
import './WeekCalendar.css';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WeekCalendar({
  weekAnchor,
  plannedWorkouts,
  workoutLogs     = [],
  todayYMD,
  raceStartDate   = null,
  raceEndDate     = null,
  onPrevWeek,
  onNextWeek,
  onSelectWorkout = () => {},
  onDropWorkout   = () => {},  // handles both planned workouts AND logs by id
}) {
  const days       = getWeekDays(weekAnchor);
  const byDate     = groupPlannedByDate(plannedWorkouts);
  const logsByDate = groupLogsByDate(workoutLogs);
  const label      = buildWeekLabel(days);

  return (
    <div className="week-calendar">
      <div className="wc-nav">
        <button className="wc-nav__btn" onClick={onPrevWeek} aria-label="Previous week" type="button">‹</button>
        <span className="wc-nav__label">{label}</span>
        <button className="wc-nav__btn" onClick={onNextWeek} aria-label="Next week" type="button">›</button>
      </div>

      <div className="wc-grid wc-grid--header">
        {DAY_LABELS.map((l) => <div key={l} className="wc-col-header">{l}</div>)}
      </div>

      <div className="wc-grid wc-grid--body">
        {days.map((ymd) => {
          const isOutOfRange = raceStartDate && raceEndDate
            && (ymd < raceStartDate || ymd > raceEndDate);

          // Project logs into PlannedWorkout shape for DayCell
          const dayLogs = (logsByDate[ymd] ?? []).map(logToPlannedWorkout);

          return (
            <DayCell
              key={ymd}
              ymd={ymd}
              workouts={byDate[ymd] ?? []}
              logs={dayLogs}
              isToday={ymd === todayYMD}
              isOutOfRange={!!isOutOfRange}
              compact={false}
              onSelectWorkout={onSelectWorkout}
              onDrop={onDropWorkout}
              renderDateLabel={(d) => (
                <span className="wc-day__dom">{shortDateLabel(d)}</span>
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

function buildWeekLabel(days) {
  const start = days[0], end = days[6];
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  const fmtMonth = (y, m) =>
    new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' });
  return `${fmtMonth(sy, sm)} ${parseInt(start.split('-')[2])} – ${sm !== em ? fmtMonth(ey, em) + ' ' : ''}${ed}, ${ey}`;
}