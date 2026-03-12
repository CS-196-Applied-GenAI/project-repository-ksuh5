/**
 * PlannedWorkoutModal
 */
import { useState, useEffect } from 'react';
import { displayWorkoutType, isQualityType, ALL_WORKOUT_TYPES } from '../domain/workoutTypes.js';
import { normaliseWorkoutForm } from '../domain/workoutHelpers.js';
import { getLogsForPlanned, logSummary, formatLogTime } from '../domain/logHelpers.js';
import RouteSnapPanel from './RouteSnapPanel.jsx';
import './PlannedWorkoutModal.css';

export default function PlannedWorkoutModal({ workout, workoutLogs = [], isOpen, onClose, onSave }) {
  const [form,    setForm]    = useState(null);
  const [dirty,   setDirty]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [saveErr, setSaveErr] = useState('');

  useEffect(() => {
    if (isOpen && workout) {
      setForm(workoutToForm(workout));
      setDirty(false);
      setSaveErr('');
      setSaving(false);
    }
  }, [isOpen, workout?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, saving, onClose]);

  if (!isOpen || !workout || !form) return null;

  const attachedLogs = getLogsForPlanned(workoutLogs, workout.id);
  const quality      = isQualityType(form.type);
  const typeLabel    = displayWorkoutType(form.type);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setDirty(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!dirty) { onClose(); return; }
    setSaving(true);
    setSaveErr('');
    try {
      const patch = { ...normaliseWorkoutForm(form), locked: form.locked };
      if (form.routeDistanceKm != null) patch.routeDistanceKm = form.routeDistanceKm;
      if (form.routeGeometry   != null) patch.routeGeometry   = form.routeGeometry;
      if (form.routeWaypoints  != null) patch.routeWaypoints  = form.routeWaypoints;
      await onSave(workout.id, patch);
      onClose();
    } catch (err) {
      setSaveErr(err.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  // Auto-save all route data immediately when backend snap succeeds
  async function handleSnap(result) {
    const routePatch = {
      distance:        result.distanceKm != null ? String(result.distanceKm.toFixed(2)) : form.distance,
      routeDistanceKm: result.distanceKm,
      routeGeometry:   result.geometry,
      routeWaypoints:  result.waypoints ?? null,   // ← full waypoint list from panel
    };
    setForm((prev) => ({ ...prev, ...routePatch }));
    setDirty(true);

    try {
      const patch = {
        ...normaliseWorkoutForm({ ...form, ...routePatch }),
        locked:          form.locked,
        routeDistanceKm: result.distanceKm,
        routeGeometry:   result.geometry,
        routeWaypoints:  result.waypoints ?? null,
      };
      await onSave(workout.id, patch);
      setDirty(false);
    } catch {
      // Auto-save failed — user can still manually save
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pw-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div className="modal-box pw-modal-box">

        <div className="modal-header">
          <div className="pw-modal-title-row">
            <span className={`pw-modal-type-badge ${quality ? 'pw-modal-type-badge--quality' : ''}`}>
              {typeLabel}
            </span>
            <h2 id="pw-modal-title" className="modal-title">
              {form.title || typeLabel}
            </h2>
            {form.locked && (
              <span className="pw-modal-locked-header" title="Locked — recalc will not change this">🔒</span>
            )}
          </div>
          <button className="modal-close" onClick={onClose} disabled={saving} aria-label="Close" type="button">✕</button>
        </div>

        <form className="pw-modal-form" onSubmit={handleSave} noValidate>
          <div className="pw-modal-body">

            <div className="pw-form-row pw-form-row--2col">
              <FormField label="Type" required>
                <select name="type" className="form-input" value={form.type} onChange={handleChange}>
                  {ALL_WORKOUT_TYPES.map((t) => (
                    <option key={t} value={t}>{displayWorkoutType(t)}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Date" required>
                <input type="date" name="date" className="form-input" value={form.date} onChange={handleChange} />
              </FormField>
            </div>

            <FormField label="Title">
              <input type="text" name="title" className="form-input" value={form.title} onChange={handleChange} placeholder="Optional display label" autoComplete="off" />
            </FormField>

            <div className="pw-form-row pw-form-row--2col">
              <FormField label="Distance (km)">
                <input type="number" name="distance" className="form-input" value={form.distance} onChange={handleChange} min="0" step="0.01" placeholder="e.g. 8.05" />
              </FormField>
              <FormField label="Duration (min)">
                <input type="number" name="durationMinutes" className="form-input" value={form.durationMinutes} onChange={handleChange} min="0" step="1" placeholder="e.g. 45" />
              </FormField>
            </div>

            <div className="pw-form-row pw-form-row--2col">
              <FormField label="Pace low (min/km)">
                <input type="text" name="paceLow" className="form-input" value={form.paceLow} onChange={handleChange} placeholder="e.g. 5:00" />
              </FormField>
              <FormField label="Pace high (min/km)">
                <input type="text" name="paceHigh" className="form-input" value={form.paceHigh} onChange={handleChange} placeholder="e.g. 5:30" />
              </FormField>
            </div>

            <FormField label="Workout structure">
              <textarea name="structureText" className="form-input form-textarea" value={form.structureText} onChange={handleChange} rows={3} placeholder="e.g. 2×10 min tempo @ 4:30/km, 3 min recovery" />
            </FormField>

            <FormField label="Notes">
              <textarea name="notes" className="form-input form-textarea" value={form.notes} onChange={handleChange} rows={2} placeholder="Optional notes" />
            </FormField>

            <div className="pw-lock-row">
              <label className="pw-lock-label">
                <input type="checkbox" name="locked" checked={form.locked} onChange={handleChange} />
                <span>
                  {form.locked
                    ? '🔒 Locked — recalculate will skip this workout'
                    : 'Unlocked — recalculate may adjust this workout'}
                </span>
              </label>
            </div>

            {/* ── Route Snap ── */}
            <div className="pw-modal-section pw-route-section">
              <h3 className="pw-modal-section-title">
                Snap Route
                {form.routeDistanceKm != null && (
                  <span className="pw-route-saved-badge">
                    ✓ {Number(form.routeDistanceKm).toFixed(2)} km saved
                  </span>
                )}
              </h3>
              <RouteSnapPanel
                onSnap={handleSnap}
                savedGeometry={workout.routeGeometry ?? null}
                savedDistanceKm={workout.routeDistanceKm ?? null}
                savedWaypoints={workout.routeWaypoints ?? null}
              />
            </div>

            {/* ── Logs ── */}
            <div className="pw-modal-section pw-logs-section">
              <h3 className="pw-modal-section-title">
                Workout logs
                {attachedLogs.length > 0 && <span className="pw-logs-count">{attachedLogs.length}</span>}
              </h3>
              {attachedLogs.length === 0 ? (
                <p className="pw-modal-empty-hint">No logs yet for this workout.</p>
              ) : (
                <ul className="pw-log-list">
                  {attachedLogs.map((log) => <LogEntry key={log.id} log={log} />)}
                </ul>
              )}
            </div>

            {saveErr && <p className="field-error save-error">{saveErr}</p>}
          </div>

          <div className="pw-modal-footer">
            <button type="button" className="btn btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : dirty ? 'Save' : 'Close'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LogEntry({ log }) {
  const summary   = logSummary(log);
  const timeStr   = formatLogTime(log.time);
  const typeLabel = log.type
    ? log.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : '';
  return (
    <li className="pw-log-entry">
      <div className="pw-log-entry__header">
        <span className="pw-log-entry__date">{log.date}</span>
        {timeStr && <span className="pw-log-entry__time">{timeStr}</span>}
        <span className="pw-log-entry__type">{typeLabel}</span>
      </div>
      {summary && <p className="pw-log-entry__summary">{summary}</p>}
      {log.notes && <p className="pw-log-entry__notes">{log.notes}</p>}
    </li>
  );
}

function workoutToForm(w) {
  return {
    type:            w.type            ?? 'easy',
    date:            w.date            ?? '',
    title:           w.title           ?? '',
    distance:        w.distance        != null ? String(w.distance)        : '',
    durationMinutes: w.durationMinutes != null ? String(w.durationMinutes) : '',
    paceLow:         w.paceLow         ?? '',
    paceHigh:        w.paceHigh        ?? '',
    structureText:   w.structureText   ?? '',
    notes:           w.notes           ?? '',
    locked:          w.locked          ?? false,
    routeDistanceKm: w.routeDistanceKm ?? null,
    routeGeometry:   w.routeGeometry   ?? null,
    routeWaypoints:  w.routeWaypoints  ?? null,
  };
}

function FormField({ label, required, children }) {
  return (
    <div className="form-field">
      <label className="form-label">
        {label}{required && <span className="required"> *</span>}
      </label>
      {children}
    </div>
  );
}