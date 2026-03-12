/**
 * MonthCalendar — Step 10: uses DayCell (drag/drop)
 */
import {
  getMonthGrid,
  groupPlannedByDate,
  monthYearLabel,
} from '../domain/calendarHelpers.js';
import DayCell from './DayCell.jsx';
import './MonthCalendar.css';

const COL_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function MonthCalendar({
  monthAnchor,
  plannedWorkouts,
  todayYMD,
  raceStartDate   = null,
  raceEndDate     = null,
  onPrevMonth,
  onNextMonth,
  onSelectWorkout = () => {},
  onDropWorkout   = () => {},
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
            const isCurrentMonth = ymd.slice(0, 7) === viewMonth;
            const isOutOfRange   = !!(raceStartDate && raceEndDate &&
              (ymd < raceStartDate || ymd > raceEndDate));

            return (
              <DayCell
                key={ymd}
                ymd={ymd}
                workouts={byDate[ymd] ?? []}
                isToday={ymd === todayYMD}
                isOutOfRange={isOutOfRange}
                isOtherMonth={!isCurrentMonth}
                compact={true}
                dateLabel={String(parseInt(ymd.split('-')[2]))}
                onSelectWorkout={onSelectWorkout}
                onDropWorkout={onDropWorkout}
              />
            );
          })
        )}
      </div>
    </div>
  );
}