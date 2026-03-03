/**
 * PlannedWorkoutModal  (Step 12 + bugfix: logs section always visible)
 *
 * Props:
 *   workout      {PlannedWorkout | null}
 *   logs         {WorkoutLog[]}
 *   isOpen       {boolean}
 *   onClose      {() => void}
 *   onSave       {(id: string, patch: object) => Promise<void>}
 *   onAddLog     {(plannedWorkoutId: string, prefillDate: string, prefillType: string) => void}
 */
import { useState, useEffect } from 'react';
import { displayWorkoutType, isQualityType, ALL_WORKOUT_TYPES } from '../domain/workoutTypes.js';
import { normaliseWorkoutForm }  from '../domain/workoutHelpers.js';
import { getLogsForPlanned }     from '../domain/logSort.js';
import WorkoutLogList            from './WorkoutLogList.jsx';
import './PlannedWorkoutModal.css';

const LOCKABLE_FORM_FIELDS = new Set([
  'type','date','distance','durationMinutes','paceLow','paceHigh','structureText','title','notes',
]);

export default function PlannedWorkoutModal({
  workout,
  logs = [],
  isOpen,
  onClose,
  onSave,
  onAddLog = () => {},
}) {
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

  const attachedLogs = getLogsForPlanned(logs, workout.id);
  const quality      = isQualityType(form.type);
  const typeLabel    = displayWorkoutType(form.type);
  const willBeLocked = workout.locked || dirty;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (LOCKABLE_FORM_FIELDS.has(name)) setDirty(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!dirty) { onClose(); return; }
    setSaving(true); setSaveErr('');
    try {
      await onSave(workout.id, normaliseWorkoutForm(form));
      onClose();
    } catch (err) {
      setSaveErr(err.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  function handleAddLog() {
    onAddLog(workout.id, workout.date, form.type);
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

        {/* ── Header ──────────────────────────────── */}
        <div className="modal-header">
          <div className="pw-modal-title-row">
            <span className={`pw-modal-type-badge ${quality ? 'pw-modal-type-badge--quality' : ''}`}>
              {typeLabel}
            </span>
            <h2 id="pw-modal-title" className="modal-title">
              {form.title || typeLabel}
            </h2>
            {willBeLocked && (
              <span className="pw-modal-locked-header" title="Locked — recalc will not change this">🔒</span>
            )}
          </div>
          <button className="modal-close" onClick={onClose} disabled={saving} aria-label="Close" type="button">✕</button>
        </div>

        {/* ── Form ────────────────────────────────── */}
        <form className="pw-modal-form" onSubmit={handleSave} noValidate>
          <div className="pw-modal-body">

            {/* type + date */}
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

            {/* title */}
            <FormField label="Title">
              <input type="text" name="title" className="form-input" value={form.title}
                onChange={handleChange} placeholder="Optional display label" autoComplete="off" />
            </FormField>

            {/* distance + duration */}
            <div className="pw-form-row pw-form-row--2col">
              <FormField label="Distance (mi)">
                <input type="number" name="distance" className="form-input" value={form.distance}
                  onChange={handleChange} min="0" step="0.1" placeholder="e.g. 5" />
              </FormField>
              <FormField label="Duration (min)">
                <input type="number" name="durationMinutes" className="form-input" value={form.durationMinutes}
                  onChange={handleChange} min="0" step="1" placeholder="e.g. 45" />
              </FormField>
            </div>

            {/* pace range */}
            <div className="pw-form-row pw-form-row--2col">
              <FormField label="Pace low (min/mi)">
                <input type="text" name="paceLow" className="form-input" value={form.paceLow}
                  onChange={handleChange} placeholder="e.g. 8:30" />
              </FormField>
              <FormField label="Pace high (min/mi)">
                <input type="text" name="paceHigh" className="form-input" value={form.paceHigh}
                  onChange={handleChange} placeholder="e.g. 9:00" />
              </FormField>
            </div>

            {/* structure */}
            <FormField label="Workout structure">
              <textarea name="structureText" className="form-input form-textarea" value={form.structureText}
                onChange={handleChange} rows={3} placeholder="e.g. 2×10 min tempo @ 7:30/mi, 3 min recovery" />
            </FormField>

            {/* notes */}
            <FormField label="Notes">
              <textarea name="notes" className="form-input form-textarea" value={form.notes}
                onChange={handleChange} rows={2} placeholder="Optional notes" />
            </FormField>

            {/* lock status */}
            <div className="pw-lock-row">
              <label className="pw-lock-label">
                <input type="checkbox" checked={willBeLocked} readOnly
                  aria-label="Locked status (auto-set on edit)" />
                <span>
                  {willBeLocked
                    ? '�� Locked — recalculate will skip this workout'
                    : 'Unlocked — recalculate may change this workout'}
                </span>
              </label>
            </div>

            {/* ── Logs section — visually separated ─ */}
            <div className="pw-modal-section pw-logs-section">
              <div className="pw-logs-header">
                <h3 className="pw-modal-section-title">
                  Workout logs
                  {attachedLogs.length > 0 && (
                    <span className="pw-logs-count">{attachedLogs.length}</span>
                  )}
                </h3>
                <button
                  type="button"
                  className="btn-add-log"
                  onClick={handleAddLog}
                  disabled={saving}
                >
                  + Add log
                </button>
              </div>
              <WorkoutLogList logs={attachedLogs} />
            </div>

            {saveErr && <p className="field-error save-error">{saveErr}</p>}
          </div>

          {/* ── Footer ────────────────────────────── */}
          <div className="pw-modal-footer">
            <button type="button" className="btn btn-cancel" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : dirty ? 'Save' : 'Close'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────

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