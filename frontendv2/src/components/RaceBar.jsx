/**
 * RaceBar
 *
 * Displays the active race and provides a "New Race" button.
 *
 * Props:
 *   races         {Race[]}
 *   activeRaceId  {string|null}
 *   onSelect      {(id: string) => void}
 *   onNewRace     {() => void}           ← opens RaceModal
 */
import { getSelectableRaces, formatRaceDateRange } from '../domain/raceHelpers.js';
import './RaceBar.css';

export default function RaceBar({ races, activeRaceId, onSelect, onNewRace }) {
  const selectable = getSelectableRaces(races);
  const activeRace = selectable.find((r) => r.id === activeRaceId) ?? null;

  return (
    <div className={`race-bar ${selectable.length === 0 ? 'race-bar--empty' : ''}`}>
      {/* Left: status / selector */}
      <div className="race-bar__left">
        {selectable.length === 0 && (
          <>
            <span className="race-bar__label">Race</span>
            <span className="race-bar__no-race">No active race</span>
          </>
        )}

        {selectable.length === 1 && (
          <>
            <span className="race-bar__label">Active race</span>
            <span className="race-bar__name">{selectable[0].name}</span>
            <span className="race-bar__dates">
              {formatRaceDateRange(selectable[0])}
            </span>
            <span className="race-bar__badge">Active</span>
          </>
        )}

        {selectable.length > 1 && (
          <>
            <label className="race-bar__label" htmlFor="race-select">
              Active race
            </label>
            <select
              id="race-select"
              className="race-bar__select"
              value={activeRaceId ?? ''}
              onChange={(e) => onSelect(e.target.value)}
            >
              <option value="" disabled>— select a race —</option>
              {selectable.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.startDate} – {r.endDate})
                </option>
              ))}
            </select>
            {activeRace && (
              <span className="race-bar__dates">
                {formatRaceDateRange(activeRace)}
              </span>
            )}
          </>
        )}
      </div>

      {/* Right: New Race button */}
      <button
        className="race-bar__new-btn"
        onClick={onNewRace}
        type="button"
      >
        + New Race
      </button>
    </div>
  );
}