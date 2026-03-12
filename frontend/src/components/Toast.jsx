import React from 'react';

/**
 * Toast – lightweight notification banner.
 *
 * Props:
 *   message  {string}   – text to display
 *   type     {string}   – 'success' | 'error' | 'info'  (default: 'info')
 *   onClose  {function} – called when the dismiss button is clicked
 */
export default function Toast({ message, type = 'info', onClose }) {
  if (!message) return null;

  return (
    <div className={`toast toast--${type}`} role="alert">
      <span className="toast__message">{message}</span>
      {onClose && (
        <button
          type="button"
          className="toast__close"
          aria-label="Dismiss"
          onClick={onClose}
        >
          ×
        </button>
      )}
    </div>
  );
}