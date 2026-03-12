import { useEffect } from 'react';

/**
 * Toast notification with optional action button.
 * Auto-dismisses after 5 seconds.
 *
 * @param {object}   props
 * @param {string}   props.message       - Text to display
 * @param {string}   [props.actionLabel] - Label for the action button (optional)
 * @param {Function} [props.onAction]    - Callback when action button is clicked (optional)
 * @param {Function} props.onDismiss     - Callback when toast is dismissed (auto or manual)
 */
export default function Toast({ message, actionLabel, onAction, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast__message">{message}</span>
      {actionLabel && onAction && (
        <button
          type="button"
          className="toast__action"
          onClick={() => {
            onAction();
            onDismiss();
          }}
        >
          {actionLabel}
        </button>
      )}
      <button
        type="button"
        className="toast__close"
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        ✕
      </button>
    </div>
  );
}