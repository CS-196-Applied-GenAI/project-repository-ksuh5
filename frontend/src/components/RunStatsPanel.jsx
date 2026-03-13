import { useMemo } from 'react';
import { useCompletedPlannedWorkouts } from '../hooks/useCompletedPlannedWorkouts.js';
import './RunStatsPanel.css';

const KM_TO_MI = 0.621371;

export default function RunStatsPanel({ title = '', plannedWorkouts = [], mode = 'week' }) {
  const { completedIds } = useCompletedPlannedWorkouts();

  const stats = useMemo(() => {
    const runs = plannedWorkouts.filter((pw) => pw.type !== 'rest');

    const totalKm = sumKm(runs);
    const totalMin = sumMin(runs);

    const completedRuns = runs.filter((pw) => completedIds.has(pw.id));
    const completedKm = sumKm(completedRuns);
    const completedMin = sumMin(completedRuns);

    const pct = totalKm > 0 ? (completedKm / totalKm) * 100 : 0;

    return {
      workouts: runs.length,
      totalKm,
      totalMin,
      completedWorkouts: completedRuns.length,
      completedKm,
      completedMin,
      pct,
    };
  }, [plannedWorkouts, completedIds]);

  return (
    <div className="run-stats">
      <div className="run-stats__title">{title || (mode === 'month' ? 'THIS MONTH' : 'THIS WEEK')}</div>

      <div className="run-stats__grid">
        <div className="run-stats__metric">
          <div className="run-stats__metric-value">{stats.workouts}</div>
          <div className="run-stats__metric-label">WORKOUTS</div>
        </div>

        <div className="run-stats__metric run-stats__metric--completed">
          <div className="run-stats__metric-value">{stats.completedWorkouts}</div>
          <div className="run-stats__metric-subvalue">{formatPct(stats.pct)}</div>
          <div className="run-stats__metric-label">COMPLETED</div>

          <div className="run-stats__completed-distance">
            {formatDistance(stats.completedKm)}
          </div>
        </div>

        <div className="run-stats__metric">
          <div className="run-stats__metric-value">{formatDistance(stats.totalKm)}</div>
          <div className="run-stats__metric-label">DISTANCE</div>
        </div>

        <div className="run-stats__metric">
          <div className="run-stats__metric-value">{formatDuration(stats.totalMin)}</div>
          <div className="run-stats__metric-label">DURATION</div>
        </div>
      </div>
    </div>
  );
}

function sumKm(workouts) {
  return workouts.reduce((acc, w) => acc + (Number(w.distance ?? 0) || 0), 0);
}

function sumMin(workouts) {
  return workouts.reduce((acc, w) => acc + (Number(w.durationMinutes ?? 0) || 0), 0);
}

function formatDistance(km) {
  const k = Number(km ?? 0) || 0;
  const mi = k * KM_TO_MI;
  return `${k.toFixed(1)} km (${mi.toFixed(1)} mi)`;
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