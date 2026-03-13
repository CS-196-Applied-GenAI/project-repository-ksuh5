import { useMemo } from 'react';
import { useCompletedPlannedWorkouts } from '../hooks/useCompletedPlannedWorkouts.js';
import './RunSummary.css';

const KM_TO_MI = 0.621371;

export default function RunSummary({ plannedWorkouts = [] }) {
  const { completedIds } = useCompletedPlannedWorkouts();

  const stats = useMemo(() => {
    const runs = plannedWorkouts.filter((pw) => pw.type !== 'rest');

    const total = calcTotals(runs);
    const completedRuns = runs.filter((pw) => completedIds.has(pw.id));
    const completed = calcTotals(completedRuns);

    const pct = total.distanceKm > 0 ? (completed.distanceKm / total.distanceKm) * 100 : 0;

    return {
      total,
      completed,
      pct,
    };
  }, [plannedWorkouts, completedIds]);

  return (
    <div className="run-summary">
      <div className="run-summary__cards">
        <div className="run-summary__card">
          <div className="run-summary__card-title">THIS WEEK</div>
          <div className="run-summary__grid">
            <div className="run-summary__metric">
              <div className="run-summary__metric-value">{stats.total.workoutsThisWeek}</div>
              <div className="run-summary__metric-label">WORKOUTS</div>
            </div>

            <div className="run-summary__metric run-summary__metric--completed">
              <div className="run-summary__metric-value">
                {stats.completed.workoutsThisWeek}
              </div>
              <div className="run-summary__metric-subvalue">
                {formatPct(stats.total.distanceThisWeekKm > 0
                  ? (stats.completed.distanceThisWeekKm / stats.total.distanceThisWeekKm) * 100
                  : 0)}
              </div>
              <div className="run-summary__metric-label">COMPLETED</div>
            </div>

            <div className="run-summary__metric">
              <div className="run-summary__metric-value">
                {formatDistance(stats.total.distanceThisWeekKm)}
              </div>
              <div className="run-summary__metric-label">DISTANCE</div>
            </div>

            <div className="run-summary__metric">
              <div className="run-summary__metric-value">
                {formatDuration(stats.total.durationThisWeekMin)}
              </div>
              <div className="run-summary__metric-label">DURATION</div>
            </div>

            <div className="run-summary__metric run-summary__metric--completed-distance">
              <div className="run-summary__metric-value">
                {formatDistance(stats.completed.distanceThisWeekKm)}
              </div>
              <div className="run-summary__metric-label">COMPLETED DISTANCE</div>
            </div>
          </div>
        </div>

        <div className="run-summary__card">
          <div className="run-summary__card-title">THIS MONTH</div>
          <div className="run-summary__grid">
            <div className="run-summary__metric">
              <div className="run-summary__metric-value">{stats.total.workoutsThisMonth}</div>
              <div className="run-summary__metric-label">WORKOUTS</div>
            </div>

            <div className="run-summary__metric run-summary__metric--completed">
              <div className="run-summary__metric-value">
                {stats.completed.workoutsThisMonth}
              </div>
              <div className="run-summary__metric-subvalue">
                {formatPct(stats.total.distanceThisMonthKm > 0
                  ? (stats.completed.distanceThisMonthKm / stats.total.distanceThisMonthKm) * 100
                  : 0)}
              </div>
              <div className="run-summary__metric-label">COMPLETED</div>
            </div>

            <div className="run-summary__metric">
              <div className="run-summary__metric-value">
                {formatDistance(stats.total.distanceThisMonthKm)}
              </div>
              <div className="run-summary__metric-label">DISTANCE</div>
            </div>

            <div className="run-summary__metric">
              <div className="run-summary__metric-value">
                {formatDuration(stats.total.durationThisMonthMin)}
              </div>
              <div className="run-summary__metric-label">DURATION</div>
            </div>

            <div className="run-summary__metric run-summary__metric--completed-distance">
              <div className="run-summary__metric-value">
                {formatDistance(stats.completed.distanceThisMonthKm)}
              </div>
              <div className="run-summary__metric-label">COMPLETED DISTANCE</div>
            </div>
          </div>

          <div className="run-summary__footer">
            <div className="run-summary__footer-label">TOTAL PLANNED RUN COMPLETION</div>
            <div className="run-summary__footer-value">
              {formatDistance(stats.completed.distanceKm)} / {formatDistance(stats.total.distanceKm)} ({formatPct(stats.pct)})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function calcTotals(workouts) {
  const out = {
    distanceKm: 0,
    durationMin: 0,
    workoutsThisWeek: 0,
    distanceThisWeekKm: 0,
    durationThisWeekMin: 0,
    workoutsThisMonth: 0,
    distanceThisMonthKm: 0,
    durationThisMonthMin: 0,
  };

  const now = new Date();
  const weekStart = startOfWeekMondayUTC(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  for (const pw of workouts) {
    const km = Number(pw.distance ?? 0) || 0;
    const min = Number(pw.durationMinutes ?? 0) || 0;

    out.distanceKm += km;
    out.durationMin += min;

    const d = new Date(pw.date + 'T00:00:00Z');

    if (d >= weekStart && d < weekEnd) {
      out.workoutsThisWeek += 1;
      out.distanceThisWeekKm += km;
      out.durationThisWeekMin += min;
    }

    if (d >= monthStart && d < monthEnd) {
      out.workoutsThisMonth += 1;
      out.distanceThisMonthKm += km;
      out.durationThisMonthMin += min;
    }
  }

  return out;
}

function startOfWeekMondayUTC(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = (d.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  d.setUTCDate(d.getUTCDate() - day);
  return d;
}

function formatDistance(km) {
  const kmNum = Number(km ?? 0) || 0;
  const mi = kmNum * KM_TO_MI;
  return `${kmNum.toFixed(1)} km (${mi.toFixed(1)} mi)`;
}

function formatDuration(min) {
  const m = Math.round(Number(min ?? 0) || 0);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h <= 0) return `${mm}m`;
  return `${h}h ${mm}m`;
}

function formatPct(p) {
  const n = Number.isFinite(p) ? p : 0;
  return `${Math.round(n)}%`;
}