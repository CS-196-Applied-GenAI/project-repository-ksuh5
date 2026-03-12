/**
 * RunStatsPanel
 *
 * Shows weekly and monthly run statistics below the calendar.
 *
 * Props:
 *   plannedWorkouts  {PlannedWorkout[]}
 *   anchor           {string}   YYYY-MM-DD  — current calendar anchor
 *   calView          {'week'|'month'}
 */
import { getWeekDays, startOfMonth, addMonths } from '../domain/calendarHelpers.js';
import './RunStatsPanel.css';

const KM_TO_MI = 0.621371;

function getMonthDays(anchor) {
  const [y, m] = anchor.split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  const end   = new Date(y, m, 0);
  const days  = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function calcStats(workouts, dates) {
  const set = new Set(dates);
  const inRange = workouts.filter((pw) => set.has(pw.date));
  const total   = inRange.length;
  const completed = inRange.filter((pw) => pw.completed).length;
  const distanceKm = inRange.reduce((sum, pw) => {
    const d = pw.routeDistanceKm ?? pw.distance ?? 0;
    return sum + Number(d);
  }, 0);
  const durationMin = inRange.reduce((sum, pw) => sum + (pw.durationMinutes ?? 0), 0);
  return { total, completed, distanceKm, durationMin };
}

function StatCard({ label, value, sub }) {
  return (
    <div className="rsp-stat">
      <span className="rsp-stat__value">{value}</span>
      {sub && <span className="rsp-stat__sub">{sub}</span>}
      <span className="rsp-stat__label">{label}</span>
    </div>
  );
}

export default function RunStatsPanel({ plannedWorkouts, anchor, calView }) {
  const weekDays  = getWeekDays(anchor);
  const monthDays = getMonthDays(anchor);

  const week  = calcStats(plannedWorkouts, weekDays);
  const month = calcStats(plannedWorkouts, monthDays);

  const fmtDist = (km) => km > 0
    ? `${km.toFixed(1)} km (${(km * KM_TO_MI).toFixed(1)} mi)`
    : '—';
  const fmtDur  = (min) => min > 0
    ? min >= 60
      ? `${Math.floor(min / 60)}h ${min % 60}m`
      : `${min}m`
    : '—';

  return (
    <div className="run-stats-panel">

      <div className="run-stats-panel__section">
        <h3 className="run-stats-panel__heading">This Week</h3>
        <div className="run-stats-panel__grid">
          <StatCard label="Workouts" value={week.total} />
          <StatCard label="Completed" value={week.completed} sub={week.total > 0 ? `${Math.round(week.completed / week.total * 100)}%` : null} />
          <StatCard label="Distance"  value={fmtDist(week.distanceKm)} />
          <StatCard label="Duration"  value={fmtDur(week.durationMin)} />
        </div>
      </div>

      <div className="run-stats-panel__section">
        <h3 className="run-stats-panel__heading">This Month</h3>
        <div className="run-stats-panel__grid">
          <StatCard label="Workouts" value={month.total} />
          <StatCard label="Completed" value={month.completed} sub={month.total > 0 ? `${Math.round(month.completed / month.total * 100)}%` : null} />
          <StatCard label="Distance"  value={fmtDist(month.distanceKm)} />
          <StatCard label="Duration"  value={fmtDur(month.durationMin)} />
        </div>
      </div>

    </div>
  );
}