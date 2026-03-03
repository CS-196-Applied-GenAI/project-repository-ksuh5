/**
 * LogWorkoutModal
 *
 * Used for two flows:
 *   1. "Add another log" from PlannedWorkoutModal  → plannedWorkoutId is set, date prefilled
 *   2. Global "+ Log workout"                      → plannedWorkoutId null, date = today
 *
 * Props:
 *   isOpen           {boolean}
 *   onClose          {() => void}
 *   onSave           {(fields: NormalizedLogFields) => Promise<void>}
 *   plannedWorkoutId {string | null}   pre-attached workout id, or null
 *   prefillDate      {string | null}   YYYY-MM-DD initial value for date field
 *   prefillType      {string | null}   initial value for type dropdown
 */
import { useState, useEffect } from 'react';
import { ALL_WORKOUT_TYPES, displayWorkoutType } from '../domain/workoutTypes.js';
import { normalizeLogFormInput } from '../domain/logHelpers.js';
import './LogWorkoutModal.css';

const EMPTY_FORM = {
  date:            '',
  time:            '',
  type:            'easy',
  distance:        '',
  durationMinutes: '',
  notes:           '',
};

export default function LogWorkoutModal({
  isOpen,
  onClose,
  onSave,
  plannedWorkoutId = null,
  prefillDate      = null,
  prefillType      = null,
}) {
  const [form,     setForm]    = useState(EMPTY_FORM);
  const [saving,   setSaving]  = useState(false);
  const [saveErr,  setSaveErr] = useState('');

  // Reset form whenever modal opens or prefill values change
  useEffect(() => {
    if (isOpen) {
      setForm({
        ...EMPTY_FORM,
        date: prefillDate ?? '',
        type: prefillType ?? 'easy',
      });
      setSaveErr('');
      setSaving(false);
    }
  }, [isOpen, prefillDate, prefillType]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, saving, onClose]);

  if (!isOpen) return null;

  const isAttached = plannedWorkoutId !== null;
  const title      = isAttached ? 'Add another log' : '+ Log workout';

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setSaveErr('');
    try {
      const normalized = normalizeLogFormInput(form);
      await onSave({ ...normalized, plannedWorkoutId });
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
      aria-labelledby="log-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div className="modal-box log-modal-box">

        {/* ── Header ──────────────────────────────── */}
        <div className="modal-header">
          <h2 id="log-modal-title" className="modal-title">{title}</h2>
          <button
            className="modal-close"
            type="button"
            aria-label="Close"
            disabled={saving}
            onClick={onClose}
          >✕</button>
        </div>

        {/* ── Form ────────────────────────────────── */}
        <form className="log-modal-form" onSubmit={handleSubmit} noValidate>
          <div className="log-modal-body">

            {/* Attached hint */}
            {isAttached && (
              <p className="log-modal-hint">
                📎 This log will be attached to the selected planned workout.
              </p>
            )}

            {/* Row 1: date + time */}
            <div className="log-form-row log-form-row--2col">
              <FormField label="Date" required>
                <input
                  type="date"
                  name="date"
                  className="form-input"
                  value={form.date}
                  onChange={handleChange}
                  required
                />
              </FormField>
              <FormField label="Time (optional)">
                <input
                  type="time"
                  name="time"
                  className="form-input"
                  value={form.time}
                  onChange={handleChange}
                />
              </FormField>
            </div>

            {/* Row 2: type */}
            <FormField label="Type" required>
              <select
                name="type"
                className="form-input"
                value={form.type}
                onChange={handleChange}
              >
                {ALL_WORKOUT_TYPES.map((t) => (
                  <option key={t} value={t}>{displayWorkoutType(t)}</option>
                ))}
              </select>
            </FormField>

            {/* Row 3: distance + duration */}
            <div className="log-form-row log-form-row--2col">
              <FormField label="Distance (mi)">
                <input
                  type="number"
                  name="distance"
                  className="form-input"
                  value={form.distance}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="e.g. 3.1"
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
                  placeholder="e.g. 30"
                />
              </FormField>
            </div>

            {/* Row 4: notes */}
            <FormField label="Notes">
              <textarea
                name="notes"
                className="form-input log-textarea"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                placeholder="How did it go?"
              />
            </FormField>

            {saveErr && <p className="field-error save-error">{saveErr}</p>}
          </div>

          {/* ── Footer ────────────────────────────── */}
          <div className="log-modal-footer">
            <button
              type="button"
              className="btn btn-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !form.date || !form.type}
            >
              {saving ? 'Saving…' : 'Save log'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
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