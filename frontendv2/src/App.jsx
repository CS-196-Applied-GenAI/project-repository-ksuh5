import { useState, useEffect } from 'react';
import { useAppData } from './hooks/useAppData.js';
import { seedSampleData } from './db/seed.js';
import { formatCount } from './utils/formatters.js';
import { displayWorkoutType, isQualityType } from './domain/workoutTypes.js';
import { getActiveRaceId } from './domain/raceHelpers.js';
import RaceBar from './components/RaceBar.jsx';
import './App.css';

export default function App() {
  const { races, plannedWorkouts, workoutLogs, loading, error, reload } =
    useAppData();

  // ── Active race selection ──────────────────────────────
  // Derived from Dexie on every load; no separate settings table needed.
  const [activeRaceId, setActiveRaceId] = useState(null);

  // Auto-select when data loads: pick the one active race if it exists.
  useEffect(() => {
    if (!loading) {
      const id = getActiveRaceId(races);
      setActiveRaceId(id);
    }
  }, [loading, races]);

  const activeRace =
    races.find((r) => r.id === activeRaceId) ?? null;

  const activePlannedWorkouts = activeRace
    ? plannedWorkouts.filter((pw) => pw.raceId === activeRace.id)
    : [];

  // ── Seed ──────────────────────────────────────────────
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');

  async function handleSeed() {
    setSeeding(true);
    setSeedMsg('');
    try {
      await seedSampleData();
      await reload();
      setSeedMsg('Sample data seeded ✓');
    } catch (err) {
      setSeedMsg(`Seed failed: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  }

  // ── Render ────────────────────────────────────────────
  return (
    <div className="app">
      <header className="app-header">
        <h1>Training Planner</h1>
        <p className="app-status">Step 3 — RaceBar ✓</p>
      </header>

      <main className="app-main">
        {/* ── Race bar ──────────────────────────────── */}
        {!loading && (
          <section className="racebar-section">
            <RaceBar
              races={races}
              activeRaceId={activeRaceId}
              onSelect={setActiveRaceId}
            />
          </section>
        )}

        {/* ── Counts ───────────────────────────────── */}
        <section className="counts-section">
          <h2>IndexedDB counts</h2>
          {loading ? (
            <p className="loading">Loading…</p>
          ) : error ? (
            <p className="error">Error: {error}</p>
          ) : (
            <ul className="counts-list">
              <li>
                <span className="count-number">{races.length}</span>
                {formatCount(races.length, 'race')}
              </li>
              <li>
                <span className="count-number">{plannedWorkouts.length}</span>
                {formatCount(plannedWorkouts.length, 'planned workout')}
              </li>
              <li>
                <span className="count-number">{workoutLogs.length}</span>
                {formatCount(workoutLogs.length, 'workout log')}
              </li>
            </ul>
          )}
        </section>

        {/* ── Planned workouts for active race ─────── */}
        {!loading && activeRace && (
          <section className="active-race-section">
            <h2>
              Planned workouts —{' '}
              <span className="race-name">{activeRace.name}</span>
            </h2>
            {activePlannedWorkouts.length === 0 ? (
              <p className="hint">No planned workouts for this race.</p>
            ) : (
              <ul className="workout-list">
                {activePlannedWorkouts.map((pw) => (
                  <li key={pw.id} className="workout-card">
                    <span className="workout-date">{pw.date}</span>
                    <span
                      className={`workout-type-badge ${
                        isQualityType(pw.type) ? 'quality' : 'normal'
                      }`}
                    >
                      {displayWorkoutType(pw.type)}
                    </span>
                    {pw.title && (
                      <span className="workout-title">{pw.title}</span>
                    )}
                    {pw.locked && (
                      <span
                        className="workout-locked"
                        title="Locked — recalc will not change this"
                      >
                        🔒
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* ── All races (debug view) ────────────────── */}
        {!loading && races.length > 0 && (
          <section className="all-races-section">
            <h2>All races ({races.length})</h2>
            <ul className="race-list">
              {races.map((r) => (
                <li
                  key={r.id}
                  className={`race-row race-row--${r.status}`}
                >
                  <span className="race-row__name">{r.name}</span>
                  <span className="race-row__dates">
                    {r.startDate} → {r.endDate}
                  </span>
                  <span className={`race-row__status race-row__status--${r.status}`}>
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Dev tools ────────────────────────────── */}
        <section className="seed-section">
          <h2>Dev tools</h2>
          <button
            className="btn-seed"
            onClick={handleSeed}
            disabled={seeding}
          >
            {seeding ? 'Seeding…' : '🌱 Seed sample data'}
          </button>
          {seedMsg && (
            <p
              className={
                seedMsg.startsWith('Seed failed') ? 'error' : 'seed-ok'
              }
            >
              {seedMsg}
            </p>
          )}
          <p className="hint">
            Seeds: 1 active race (Spring 5K) + 1 archived race (Winter Race)
            + 1 planned workout + 1 unplanned log.
          </p>
        </section>
      </main>
    </div>
  );
}