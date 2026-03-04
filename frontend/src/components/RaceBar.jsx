/**
 * RaceBar
 *
 * Displays the active race name + date range.
 * If more than one active race exists (shouldn't happen, but defensive),
 * shows a dropdown to select among them.
 * If no active race exists, shows a "No active race" message.
 *
 * Props:
 *   races         {Race[]}   – full list of races from Dexie
 *   activeRaceId  {string|null}
 *   onSelect      {(id: string) => void}  – called when user picks a race
 */
import { getSelectableRaces, formatRaceDateRange } from '../domain/raceHelpers.js';
import './RaceBar.css';

export default function RaceBar({ races, activeRaceId, onSelect }) {
  const selectable = getSelectableRaces(races);
  const activeRace = selectable.find((r) => r.id === activeRaceId) ?? null;

  // ── No active race ─────────────────────────────────────
  if (selectable.length === 0) {
    return (
      <div className="race-bar race-bar--empty">
        <span className="race-bar__label">Race</span>
        <span className="race-bar__no-race">No active race</span>
      </div>
    );
  }

  // ── Exactly one active race (normal path) ──────────────
  if (selectable.length === 1) {
    const race = selectable[0];
    return (
      <div className="race-bar">
        <span className="race-bar__label">Active race</span>
        <span className="race-bar__name">{race.name}</span>
        <span className="race-bar__dates">{formatRaceDateRange(race)}</span>
        <span className="race-bar__badge">Active</span>
      </div>
    );
  }

  // ── Multiple active races (dropdown) ──────────────────
  return (
    <div className="race-bar">
      <label className="race-bar__label" htmlFor="race-select">
        Active race
      </label>
      <select
        id="race-select"
        className="race-bar__select"
        value={activeRaceId ?? ''}
        onChange={(e) => onSelect(e.target.value)}
      >
        <option value="" disabled>
          — select a race —
        </option>
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
    </div>
  );
}