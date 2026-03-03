/**
 * WorkoutLogList
 *
 * Renders a sorted list of WorkoutLog entries inside the
 * PlannedWorkoutModal.  No add/edit yet (Step 12).
 *
 * Props:
 *   logs  {WorkoutLog[]}  Already sorted chronologically by the caller.
 */
import { displayWorkoutType } from '../domain/workoutTypes.js';
import './WorkoutLogList.css';

export default function WorkoutLogList({ logs }) {
  if (logs.length === 0) {
    return (
      <p className="wll-empty">No logs recorded for this workout yet.</p>
    );
  }

  return (
    <ul className="wll-list">
      {logs.map((log) => (
        <LogRow key={log.id} log={log} />
      ))}
    </ul>
  );
}

// ── LogRow ────────────────────────────────────────────────

function LogRow({ log }) {
  const meta = buildMeta(log);

  return (
    <li className="wll-row">
      {/* Left: date + time */}
      <div className="wll-row__when">
        <span className="wll-row__date">{log.date}</span>
        {log.time && (
          <span className="wll-row__time">{log.time}</span>
        )}
      </div>

      {/* Centre: type + meta */}
      <div className="wll-row__details">
        <span className="wll-row__type">{displayWorkoutType(log.type)}</span>
        {meta && <span className="wll-row__meta">{meta}</span>}
      </div>

      {/* Right: notes (truncated) */}
      {log.notes && (
        <p className="wll-row__notes" title={log.notes}>
          {log.notes}
        </p>
      )}
    </li>
  );
}

// ── helpers ───────────────────────────────────────────────

function buildMeta(log) {
  const parts = [];
  if (log.distance)        parts.push(`${log.distance} mi`);
  if (log.durationMinutes) parts.push(`${log.durationMinutes} min`);
  return parts.join(' · ');
}