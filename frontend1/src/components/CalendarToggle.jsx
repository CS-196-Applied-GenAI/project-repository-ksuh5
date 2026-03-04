/**
 * CalendarToggle
 *
 * A segmented Week / Month toggle button.
 *
 * Props:
 *   view      {'week' | 'month'}
 *   onChange  {(view: 'week' | 'month') => void}
 */
import './CalendarToggle.css';

export default function CalendarToggle({ view, onChange }) {
  return (
    <div className="cal-toggle" role="group" aria-label="Calendar view">
      <button
        type="button"
        className={`cal-toggle__btn ${view === 'week' ? 'cal-toggle__btn--active' : ''}`}
        onClick={() => onChange('week')}
        aria-pressed={view === 'week'}
      >
        Week
      </button>
      <button
        type="button"
        className={`cal-toggle__btn ${view === 'month' ? 'cal-toggle__btn--active' : ''}`}
        onClick={() => onChange('month')}
        aria-pressed={view === 'month'}
      >
        Month
      </button>
    </div>
  );
}