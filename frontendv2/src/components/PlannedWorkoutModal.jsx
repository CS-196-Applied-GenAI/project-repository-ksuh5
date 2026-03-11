/**
 * PlannedWorkoutModal  (read-only, Step 8)
 *
 * Displays all details of a PlannedWorkout.
 * Editing is added in Step 9.
 *
 * Props:
 *   workout   {PlannedWorkout | null}
 *   isOpen    {boolean}
 *   onClose   {() => void}
 */
import { useEffect } from 'react';
import { displayWorkoutType, isQualityType } from '../domain/workoutTypes.js';
import './PlannedWorkoutModal.css';

export default function PlannedWorkoutModal({ workout, isOpen, onClose }) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen || !workout) return null;

  const quality    = isQualityType(workout.type);
  const typeLabel  = displayWorkoutType(workout.type);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pw-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-box pw-modal-box">
        {/* ── Header ──────────────────────────────── */}
        <div className="modal-header">
          <div className="pw-modal-title-row">
            <span
              className={`pw-modal-type-badge ${quality ? 'pw-modal-type-badge--quality' : ''}`}
            >
              {typeLabel}
            </span>
            <h2 id="pw-modal-title" className="modal-title">
              {workout.title || typeLabel}
            </h2>
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* ── Body ────────────────────────────────── */}
        <div className="pw-modal-body">
          {/* Date + locked */}
          <div className="pw-modal-meta-row">
            <span className="pw-modal-date">{workout.date}</span>
            {workout.locked && (
              <span className="pw-modal-locked-badge" title="Locked — recalc will not change this">
                🔒 Locked
              </span>
            )}
          </div>

          {/* Targets grid */}
          <div className="pw-modal-targets">
            <Field label="Distance"  value={workout.distance        ? `${workout.distance} mi`        : null} />
            <Field label="Duration"  value={workout.durationMinutes ? `${workout.durationMinutes} min` : null} />
            <Field label="Pace low"  value={workout.paceLow         ? `${workout.paceLow} /mi`         : null} />
            <Field label="Pace high" value={workout.paceHigh        ? `${workout.paceHigh} /mi`        : null} />
          </div>

          {/* Structure text */}
          {workout.structureText && (
            <div className="pw-modal-section">
              <h3 className="pw-modal-section-title">Workout structure</h3>
              <p className="pw-modal-structure">{workout.structureText}</p>
            </div>
          )}

          {/* Notes */}
          {workout.notes && (
            <div className="pw-modal-section">
              <h3 className="pw-modal-section-title">Notes</h3>
              <p className="pw-modal-notes">{workout.notes}</p>
            </div>
          )}

          {/* Logs placeholder (Step 11 will fill this) */}
          <div className="pw-modal-section pw-modal-logs-placeholder">
            <h3 className="pw-modal-section-title">Workout logs</h3>
            <p className="pw-modal-empty-hint">
              Log display coming in Step 11.
            </p>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────── */}
        <div className="pw-modal-footer">
          <button type="button" className="btn btn-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Internal Field component ──────────────────────────────

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div className="pw-field">
      <span className="pw-field__label">{label}</span>
      <span className="pw-field__value">{value}</span>
    </div>
  );
}