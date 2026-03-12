/**
 * AddWorkoutModal
 *
 * A form modal for creating a new planned workout.
 * The new workout is saved to Dexie via the onSave callback.
 *
 * Props:
 *   isOpen        {boolean}
 *   onClose       {() => void}
 *   onSave        {(workout: object) => Promise<void>}
 *   defaultDate   {string}   YYYY-MM-DD  (defaults to today)
 *   activeRaceId  {string|null}
 */
import { useState, useEffect } from 'react';
import { ALL_WORKOUT_TYPES, displayWorkoutType } from '../domain/workoutTypes.js';
import './AddWorkoutModal.css';

const EMPTY_FORM = {
  date:            '',
  type:            'easy',
  title:           '',
  distance:        '',
  durationMinutes: '',
  notes:           '',
};

export default function AddWorkoutModal({ isOpen, onClose, onSave, defaultDate = '', activeRaceId = null }) {
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [saveErr, setSaveErr] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm({ ...EMPTY_FORM, date: defaultDate });
      setSaveErr('');
      setSaving(false);
    }
  }, [isOpen, defaultDate]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, saving, onClose]);

  if (!isOpen) return null;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.date) { setSaveErr('Date is required.'); return; }
    if (!activeRaceId) { setSaveErr('No active race selected.'); return; }

    setSaving(true);
    setSaveErr('');
    try {
      const now = new Date().toISOString();
      const workout = {
        id:              crypto.randomUUID(),
        raceId:          activeRaceId,
        date:            form.date,
        type:            form.type,
        title:           form.title || '',
        distance:        form.distance        ? Number(form.distance)        : null,
        durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
        paceLow:         null,
        paceHigh:        null,
        structureText:   '',
        notes:           form.notes || '',
        locked:          false,
        createdAt:       now,
        updatedAt:       now,
      };
      await onSave(workout);
      onClose();
    } catch (err) {
      setSaveErr(err.message ?? 'Failed to save workout.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-workout-title"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div className="modal-box add-workout-box">

        {/* Header */}
        <div className="modal-header">
          <h2 id="add-workout-title" className="modal-title">Add Planned Workout</h2>
          <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>✕</button>
        </div>

        {/* Form */}
        <form className="add-workout-form" onSubmit={handleSubmit}>

          <div className="add-workout-row">
            <label className="add-workout-label" htmlFor="aw-date">Date <span className="add-workout-required">*</span></label>
            <input
              id="aw-date"
              name="date"
              type="date"
              className="add-workout-input"
              value={form.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="add-workout-row">
            <label className="add-workout-label" htmlFor="aw-type">Type</label>
            <select
              id="aw-type"
              name="type"
              className="add-workout-input"
              value={form.type}
              onChange={handleChange}
            >
              {ALL_WORKOUT_TYPES.map((t) => (
                <option key={t} value={t}>{displayWorkoutType(t)}</option>
              ))}
            </select>
          </div>

          <div className="add-workout-row">
            <label className="add-workout-label" htmlFor="aw-title">Title</label>
            <input
              id="aw-title"
              name="title"
              type="text"
              className="add-workout-input"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Morning easy run"
            />
          </div>

          <div className="add-workout-row add-workout-row--half">
            <div>
              <label className="add-workout-label" htmlFor="aw-distance">Distance (mi)</label>
              <input
                id="aw-distance"
                name="distance"
                type="number"
                min="0"
                step="0.1"
                className="add-workout-input"
                value={form.distance}
                onChange={handleChange}
                placeholder="e.g. 3"
              />
            </div>
            <div>
              <label className="add-workout-label" htmlFor="aw-duration">Duration (min)</label>
              <input
                id="aw-duration"
                name="durationMinutes"
                type="number"
                min="0"
                step="1"
                className="add-workout-input"
                value={form.durationMinutes}
                onChange={handleChange}
                placeholder="e.g. 30"
              />
            </div>
          </div>

          <div className="add-workout-row">
            <label className="add-workout-label" htmlFor="aw-notes">Notes</label>
            <textarea
              id="aw-notes"
              name="notes"
              className="add-workout-input add-workout-textarea"
              value={form.notes}
              onChange={handleChange}
              placeholder="Optional notes…"
              rows={3}
            />
          </div>

          {saveErr && <p className="add-workout-error">{saveErr}</p>}

          <div className="add-workout-actions">
            <button type="button" className="btn btn-cancel" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : '＋ Add Workout'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}