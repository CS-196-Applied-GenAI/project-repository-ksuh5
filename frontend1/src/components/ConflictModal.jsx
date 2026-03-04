/**
 * ConflictModal
 *
 * Shown when the user tries to create a new race while one is already active.
 * Asks: Archive / Complete / Cancel the previous race.
 *
 * Props:
 *   isOpen           {boolean}
 *   existingRaceName {string}   name of the current active race
 *   onDecide         {(decision: 'archive' | 'complete' | 'cancel') => void}
 */
import { useEffect } from 'react';
import './ConflictModal.css';

export default function ConflictModal({ isOpen, existingRaceName, onDecide }) {
  // Close on Escape (treat as cancel)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onDecide('cancel'); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onDecide]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop conflict-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onDecide('cancel'); }}
    >
      <div className="modal-box conflict-box">
        {/* Header */}
        <div className="modal-header">
          <h2 id="conflict-modal-title" className="modal-title">
            Active race exists
          </h2>
          <button
            className="modal-close"
            type="button"
            aria-label="Cancel"
            onClick={() => onDecide('cancel')}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="conflict-body">
          <p className="conflict-message">
            <strong>"{existingRaceName}"</strong> is currently active.
          </p>
          <p className="conflict-sub">
            Before creating a new race, choose what to do with the current one:
          </p>

          <div className="conflict-actions">
            <button
              type="button"
              className="btn btn-archive"
              onClick={() => onDecide('archive')}
            >
              📦 Archive it
            </button>
            <button
              type="button"
              className="btn btn-complete"
              onClick={() => onDecide('complete')}
            >
              🏁 Mark complete
            </button>
            <button
              type="button"
              className="btn btn-cancel-conflict"
              onClick={() => onDecide('cancel')}
            >
              Cancel
            </button>
          </div>

          <p className="conflict-hint">
            Cancelling will close this dialog and keep the current race active
            without creating a new one.
          </p>
        </div>
      </div>
    </div>
  );
}