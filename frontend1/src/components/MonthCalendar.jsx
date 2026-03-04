import {
  getMonthGrid,
  groupPlannedByDate,
  monthYearLabel,
} from '../domain/calendarHelpers.js';
import { groupLogsByDate } from '../domain/logSort.js';
import { logToPlannedWorkout } from '../domain/logHelpers.js';
import DayCell from './DayCell.jsx';
import './MonthCalendar.css';

const COL_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function MonthCalendar({
  monthAnchor,
  plannedWorkouts,
  workoutLogs     = [],
  todayYMD,
  raceStartDate   = null,
  raceEndDate     = null,
  onPrevMonth,
  onNextMonth,
  onSelectWorkout = () => {},
  onDropWorkout   = () => {},
}) {
  const weeks      = getMonthGrid(monthAnchor);
  const byDate     = groupPlannedByDate(plannedWorkouts);
  const logsByDate = groupLogsByDate(workoutLogs);
  const viewMonth  = monthAnchor.slice(0, 7);

  return (
    <div className="month-calendar">
      <div className="mc-nav">
        <button className="mc-nav__btn" onClick={onPrevMonth} aria-label="Previous month" type="button">‹</button>
        <span className="mc-nav__label">{monthYearLabel(monthAnchor)}</span>
        <button className="mc-nav__btn" onClick={onNextMonth} aria-label="Next month" type="button">›</button>
      </div>

      <div className="mc-grid mc-grid--header">
        {COL_HEADERS.map((h) => <div key={h} className="mc-col-header">{h}</div>)}
      </div>

      <div className="mc-grid mc-grid--body">
        {weeks.map((week) =>
          week.map((ymd) => {
            const isOutOfRange = raceStartDate && raceEndDate
              && (ymd < raceStartDate || ymd > raceEndDate);

            const dayLogs = (logsByDate[ymd] ?? []).map(logToPlannedWorkout);

            return (
              <DayCell
                key={ymd}
                ymd={ymd}
                workouts={byDate[ymd] ?? []}
                logs={dayLogs}
                isToday={ymd === todayYMD}
                isOtherMonth={ymd.slice(0, 7) !== viewMonth}
                isOutOfRange={!!isOutOfRange}
                compact={true}
                onSelectWorkout={onSelectWorkout}
                onDrop={onDropWorkout}
                renderDateLabel={(d) => (
                  <span className="mc-day__dom">{parseInt(d.split('-')[2])}</span>
                )}
              />
            );
          })
        )}
      </div>
    </div>
  );
}