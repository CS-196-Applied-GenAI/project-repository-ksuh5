/**
 * ConfirmDropModal
 *
 * Asks the user to confirm a drag/drop onto an occupied day.
 *
 * Props:
 *   isOpen      {boolean}
 *   targetDate  {string}  YYYY-MM-DD
 *   count       {number}  existing workouts on target day
 *   onConfirm   {() => void}
 *   onCancel    {() => void}
 */
import { useEffect, useRef } from 'react';
import './ConfirmDropModal.css';

export default function ConfirmDropModal({ isOpen, targetDate, count, onConfirm, onCancel }) {
  const confirmRef = useRef(null);

  // Auto-focus confirm button for keyboard users
  useEffect(() => {
    if (isOpen) setTimeout(() => confirmRef.current?.focus(), 40);
  }, [isOpen]);

  // Escape = cancel
  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const workoutWord = count === 1 ? 'workout' : 'workouts';

  return (
    <div
      className="modal-backdrop confirm-drop-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-drop-title"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="modal-box confirm-drop-box">
        {/* Header */}
        <div className="modal-header">
          <h2 id="confirm-drop-title" className="modal-title">Move workout?</h2>
          <button className="modal-close" type="button" aria-label="Cancel" onClick={onCancel}>✕</button>
        </div>

        {/* Body */}
        <div className="confirm-drop-body">
          <p className="confirm-drop-message">
            <strong>{targetDate}</strong> already has{' '}
            <strong>{count} {workoutWord}</strong>.
          </p>
          <p className="confirm-drop-sub">Move here anyway?</p>
        </div>

        {/* Actions */}
        <div className="confirm-drop-actions">
          <button
            type="button"
            className="btn btn-cancel"
            onClick={onCancel}
          >
            Keep original date
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
          >
            Move anyway
          </button>
        </div>
      </div>
    </div>
  );
}