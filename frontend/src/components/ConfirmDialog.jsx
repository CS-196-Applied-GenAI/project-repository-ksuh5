/**
 * ConfirmDialog
 *
 * A lightweight confirmation modal with a custom message.
 * Used by the drag/drop occupied-day flow.
 *
 * Props:
 *   isOpen    {boolean}
 *   title     {string}
 *   message   {string}
 *   confirmLabel  {string}   default "Confirm"
 *   cancelLabel   {string}   default "Cancel"
 *   onConfirm {() => void}
 *   onCancel  {() => void}
 */
import { useEffect, useRef } from 'react';
import './ConfirmDialog.css';

export default function ConfirmDialog({
  isOpen,
  title        = 'Are you sure?',
  message      = '',
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  onConfirm,
  onCancel,
}) {
  const confirmBtnRef = useRef(null);

  // Auto-focus the confirm button so keyboard users can act immediately
  useEffect(() => {
    if (isOpen) setTimeout(() => confirmBtnRef.current?.focus(), 30);
  }, [isOpen]);

  // Escape = cancel
  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop confirm-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="modal-box confirm-box">
        <div className="modal-header">
          <h2 id="confirm-dialog-title" className="modal-title">{title}</h2>
          <button className="modal-close" type="button" onClick={onCancel} aria-label="Cancel">✕</button>
        </div>

        <div className="confirm-body">
          {message && <p className="confirm-message">{message}</p>}
        </div>

        <div className="confirm-footer">
          <button
            type="button"
            className="btn btn-cancel"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}