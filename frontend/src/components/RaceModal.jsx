/**
 * RaceModal
 *
 * A dialog for creating a new race.
 *
 * Props:
 *   isOpen         {boolean}
 *   onClose        {() => void}
 *   onSave         {(fields: { name, startDate, endDate, seedWorkout }) => Promise<void>}
 */
import { useState, useEffect, useRef } from 'react';
import './RaceModal.css';

const EMPTY = { name: '', startDate: '', endDate: '' };

function validate({ name, startDate, endDate }) {
  const errors = {};
  if (!name.trim())                      errors.name      = 'Name is required.';
  if (!startDate)                        errors.startDate = 'Start date is required.';
  if (!endDate)                          errors.endDate   = 'End date is required.';
  if (startDate && endDate && endDate <= startDate)
    errors.endDate = 'End date must be after start date.';
  return errors; // empty object = valid
}

export default function RaceModal({ isOpen, onClose, onSave }) {
  const [fields, setFields]         = useState(EMPTY);
  const [seedWorkout, setSeedWorkout] = useState(true);
  const [errors, setErrors]         = useState({});
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState('');
  const nameRef                     = useRef(null);

  // Reset form whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setFields(EMPTY);
      setSeedWorkout(true);
      setErrors({});
      setSaveError('');
      setSaving(false);
      // autofocus name field
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleChange(e) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    // clear field-level error on change
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(fields);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await onSave({ ...fields, seedWorkout });
      onClose();
    } catch (err) {
      setSaveError(err.message ?? 'Failed to create race.');
    } finally {
      setSaving(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="race-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-box">
        {/* Header */}
        <div className="modal-header">
          <h2 id="race-modal-title" className="modal-title">New Race</h2>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form className="modal-form" onSubmit={handleSubmit} noValidate>
          {/* Name */}
          <div className="form-field">
            <label htmlFor="race-name" className="form-label">
              Race name <span className="required">*</span>
            </label>
            <input
              ref={nameRef}
              id="race-name"
              name="name"
              type="text"
              className={`form-input ${errors.name ? 'form-input--error' : ''}`}
              value={fields.name}
              onChange={handleChange}
              placeholder="e.g. Spring 5K"
              autoComplete="off"
            />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>

          {/* Start date */}
          <div className="form-field">
            <label htmlFor="race-start" className="form-label">
              Start date <span className="required">*</span>
            </label>
            <input
              id="race-start"
              name="startDate"
              type="date"
              className={`form-input ${errors.startDate ? 'form-input--error' : ''}`}
              value={fields.startDate}
              onChange={handleChange}
            />
            {errors.startDate && <p className="field-error">{errors.startDate}</p>}
          </div>

          {/* End date */}
          <div className="form-field">
            <label htmlFor="race-end" className="form-label">
              End date <span className="required">*</span>
            </label>
            <input
              id="race-end"
              name="endDate"
              type="date"
              className={`form-input ${errors.endDate ? 'form-input--error' : ''}`}
              value={fields.endDate}
              onChange={handleChange}
            />
            {errors.endDate && <p className="field-error">{errors.endDate}</p>}
          </div>

          {/* Seed starter workout checkbox */}
          <div className="form-field form-field--checkbox">
            <label className="form-label-inline">
              <input
                type="checkbox"
                checked={seedWorkout}
                onChange={(e) => setSeedWorkout(e.target.checked)}
              />
              Add an opening "Easy run" on start date
            </label>
          </div>

          {/* Save error */}
          {saveError && <p className="field-error save-error">{saveError}</p>}

          {/* Actions */}
          <div className="modal-actions">
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
              disabled={saving}
            >
              {saving ? 'Creating…' : 'Create race'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}