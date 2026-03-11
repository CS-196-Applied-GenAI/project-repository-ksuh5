/**
 * WeekCalendar
 *
 * Renders a Monday-based 7-column week grid.
 *
 * Props:
 *   weekAnchor      {string}            YYYY-MM-DD — any date in the target week
 *   plannedWorkouts {PlannedWorkout[]}  filtered to the active race
 *   todayYMD        {string}
 *   raceStartDate   {string|null}
 *   raceEndDate     {string|null}
 *   onPrevWeek      {() => void}
 *   onNextWeek      {() => void}
 */
import {
  getWeekDays,
  groupPlannedByDate,
  shortDateLabel,
} from '../domain/calendarHelpers.js';
import { displayWorkoutType, isQualityType } from '../domain/workoutTypes.js';
import './WeekCalendar.css';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WeekCalendar({
  weekAnchor,
  plannedWorkouts,
  todayYMD,
  raceStartDate = null,
  raceEndDate   = null,
  onPrevWeek,
  onNextWeek,
}) {
  const days   = getWeekDays(weekAnchor);
  const byDate = groupPlannedByDate(plannedWorkouts);
  const label  = buildWeekLabel(days);

  return (
    <div className="week-calendar">
      {/* ── Navigation bar ────────────────────────── */}
      <div className="wc-nav">
        <button className="wc-nav__btn" onClick={onPrevWeek} aria-label="Previous week" type="button">‹</button>
        <span className="wc-nav__label">{label}</span>
        <button className="wc-nav__btn" onClick={onNextWeek} aria-label="Next week"     type="button">›</button>
      </div>

      {/* ── Column headers ────────────────────────── */}
      <div className="wc-grid wc-grid--header">
        {DAY_LABELS.map((l) => (
          <div key={l} className="wc-col-header">{l}</div>
        ))}
      </div>

      {/* ── Day cells ─────────────────────────────── */}
      <div className="wc-grid wc-grid--body">
        {days.map((ymd) => {
          const workouts    = byDate[ymd] ?? [];
          const isToday     = ymd === todayYMD;
          const isOutOfRange = raceStartDate && raceEndDate
            && (ymd < raceStartDate || ymd > raceEndDate);

          return (
            <div
              key={ymd}
              className={[
                'wc-day',
                isToday      ? 'wc-day--today'        : '',
                isOutOfRange ? 'wc-day--out-of-range' : '',
                workouts.length > 0 ? 'wc-day--has-workouts' : '',
              ].filter(Boolean).join(' ')}
            >
              <div className="wc-day__date">
                <span className="wc-day__dom">{shortDateLabel(ymd)}</span>
                {isToday && <span className="wc-day__today-pill">today</span>}
              </div>

              {workouts.length === 0 ? (
                <p className="wc-day__empty">—</p>
              ) : (
                <ul className="wc-day__workouts">
                  {workouts.map((pw) => (
                    <li
                      key={pw.id}
                      className={`wc-chip ${isQualityType(pw.type) ? 'wc-chip--quality' : ''}`}
                      title={pw.title || displayWorkoutType(pw.type)}
                    >
                      {displayWorkoutType(pw.type)}
                      {pw.locked && <span className="wc-chip__lock">🔒</span>}
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

// ── helpers ───────────────────────────────────────────────

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