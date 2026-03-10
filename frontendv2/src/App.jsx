import { useState } from 'react';
import { useAppData } from './hooks/useAppData.js';
import { seedSampleData } from './db/seed.js';
import { formatCount } from './utils/formatters.js';
import { displayWorkoutType, isQualityType } from './domain/workoutTypes.js';
import './App.css';

export default function App() {
  const { races, plannedWorkouts, workoutLogs, loading, error, reload } =
    useAppData();
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

  // Active race (for display)
  const activeRace = races.find((r) => r.status === 'active') ?? null;

  // Planned workouts belonging to the active race
  const activePlannedWorkouts = activeRace
    ? plannedWorkouts.filter((pw) => pw.raceId === activeRace.id)
    : [];

  return (
    <div className="app">
      <header className="app-header">
        <h1>Training Planner</h1>
        <p className="app-status">Step 2 — Domain layer ✓</p>
      </header>

      <main className="app-main">
        {/* ── Data counts ─────────────────────────────── */}
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

        {/* ── Active race + planned workouts ──────────── */}
        {!loading && activeRace && (
          <section className="active-race-section">
            <h2>
              Active race —{' '}
              <span className="race-name">{activeRace.name}</span>
            </h2>
            <p className="race-dates">
              {activeRace.startDate} → {activeRace.endDate}
            </p>

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
                      <span className="workout-locked" title="Locked — recalc will not change this">
                        🔒
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* ── Dev tools / seed ────────────────────────── */}
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
            Inserts 1 active race + 1 planned workout + 1 unplanned log.
            Refresh — counts persist.
          </p>
        </section>
      </main>
    </div>
  );
}