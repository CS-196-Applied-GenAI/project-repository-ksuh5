/**
 * PlannedWorkoutModal  (Step 9 + Step 10 edit: no auto-lock)
 *
 * Props:
 *   workout   {PlannedWorkout | null}
 *   isOpen    {boolean}
 *   onClose   {() => void}
 *   onSave    {(id: string, patch: object) => Promise<void>}
 */
import { useState, useEffect } from 'react';
import { displayWorkoutType, isQualityType, ALL_WORKOUT_TYPES } from '../domain/workoutTypes.js';
import { normaliseWorkoutForm } from '../domain/workoutHelpers.js';   // ← was ./workoutHelpers.js
import './PlannedWorkoutModal.css';

export default function PlannedWorkoutModal({ workout, isOpen, onClose, onSave }) {
  const [form,    setForm]    = useState(null);
  const [dirty,   setDirty]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [saveErr, setSaveErr] = useState('');

  // Reset form whenever workout changes or modal opens
  useEffect(() => {
    if (isOpen && workout) {
      setForm(workoutToForm(workout));
      setDirty(false);
      setSaveErr('');
      setSaving(false);
    }
  }, [isOpen, workout?.id]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, saving, onClose]);

  if (!isOpen || !workout || !form) return null;

  const quality   = isQualityType(form.type);
  const typeLabel = displayWorkoutType(form.type);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setForm((prev) => ({ ...prev, [name]: newValue }));
    setDirty(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!dirty) { onClose(); return; }
    setSaving(true);
    setSaveErr('');
    try {
      // Include the current locked value from the form (controlled by checkbox)
      const patch = { ...normaliseWorkoutForm(form), locked: form.locked };
      await onSave(workout.id, patch);
      onClose();
    } catch (err) {
      setSaveErr(err.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
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

        {/* ── Header ──────────────────────────────── */}
        <div className="modal-header">
          <div className="pw-modal-title-row">
            <span className={`pw-modal-type-badge ${quality ? 'pw-modal-type-badge--quality' : ''}`}>
              {typeLabel}
            </span>
            <h2 id="pw-modal-title" className="modal-title">
              {form.title || typeLabel}
            </h2>
            {form.locked && (
              <span className="pw-modal-locked-header" title="Locked — recalc will not change this">
                🔒
              </span>
            )}
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* ── Form ────────────────────────────────── */}
        <form className="pw-modal-form" onSubmit={handleSave} noValidate>
          <div className="pw-modal-body">

            {/* Row 1: type + date */}
            <div className="pw-form-row pw-form-row--2col">
              <FormField label="Type" required>
                <select name="type" className="form-input" value={form.type} onChange={handleChange}>
                  {ALL_WORKOUT_TYPES.map((t) => (
                    <option key={t} value={t}>{displayWorkoutType(t)}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Date" required>
                <input
                  type="date"
                  name="date"
                  className="form-input"
                  value={form.date}
                  onChange={handleChange}
                />
              </FormField>
            </div>

            {/* Row 2: title */}
            <FormField label="Title">
              <input
                type="text"
                name="title"
                className="form-input"
                value={form.title}
                onChange={handleChange}
                placeholder="Optional display label"
                autoComplete="off"
              />
            </FormField>

            {/* Row 3: distance + duration */}
            <div className="pw-form-row pw-form-row--2col">
              <FormField label="Distance (mi)">
                <input
                  type="number"
                  name="distance"
                  className="form-input"
                  value={form.distance}
                  onChange={handleChange}
                  min="0"
                  step="0.1"
                  placeholder="e.g. 5"
                />
              </FormField>

              <FormField label="Duration (min)">
                <input
                  type="number"
                  name="durationMinutes"
                  className="form-input"
                  value={form.durationMinutes}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  placeholder="e.g. 45"
                />
              </FormField>
            </div>

            {/* Row 4: pace low + pace high */}
            <div className="pw-form-row pw-form-row--2col">
              <FormField label="Pace low (min/mi)">
                <input
                  type="text"
                  name="paceLow"
                  className="form-input"
                  value={form.paceLow}
                  onChange={handleChange}
                  placeholder="e.g. 8:30"
                />
              </FormField>

              <FormField label="Pace high (min/mi)">
                <input
                  type="text"
                  name="paceHigh"
                  className="form-input"
                  value={form.paceHigh}
                  onChange={handleChange}
                  placeholder="e.g. 9:00"
                />
              </FormField>
            </div>

            {/* Row 5: structure text */}
            <FormField label="Workout structure">
              <textarea
                name="structureText"
                className="form-input form-textarea"
                value={form.structureText}
                onChange={handleChange}
                rows={3}
                placeholder="e.g. 2×10 min tempo @ 7:30/mi, 3 min recovery"
              />
            </FormField>

            {/* Row 6: notes */}
            <FormField label="Notes">
              <textarea
                name="notes"
                className="form-input form-textarea"
                value={form.notes}
                onChange={handleChange}
                rows={2}
                placeholder="Optional notes"
              />
            </FormField>

            {/* Row 7: manual lock toggle */}
            <div className="pw-lock-row">
              <label className="pw-lock-label">
                <input
                  type="checkbox"
                  name="locked"
                  checked={form.locked}
                  onChange={handleChange}
                />
                <span>
                  {form.locked
                    ? '🔒 Locked — recalculate will skip this workout'
                    : 'Unlocked — recalculate may adjust this workout'}
                </span>
              </label>
            </div>

            {/* Logs placeholder */}
            <div className="pw-modal-section pw-modal-logs-placeholder">
              <h3 className="pw-modal-section-title">Workout logs</h3>
              <p className="pw-modal-empty-hint">Log display coming in Step 11.</p>
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
    locked:          w.locked          ?? false,
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