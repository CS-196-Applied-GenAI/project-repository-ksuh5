import { useState } from 'react';
import { useAppData } from './hooks/useAppData.js';
import { seedSampleData } from './db/seed.js';
import { formatCount } from './utils/formatters.js';
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>Training Planner</h1>
        <p className="app-status">Step 1 — Dexie bootstrap ✓</p>
      </header>

      <main className="app-main">
        {/* ── Data counts ───────────────────────────────── */}
        <section className="counts-section">
          <h2>IndexedDB counts</h2>
          {loading ? (
            <p className="loading">Loading…</p>
          ) : error ? (
            <p className="error">Error: {error}</p>
          ) : (
            <ul className="counts-list">
              <li>
                <span className="count-number">{races.length}</span>{' '}
                {formatCount(races.length, 'race')}
              </li>
              <li>
                <span className="count-number">{plannedWorkouts.length}</span>{' '}
                {formatCount(plannedWorkouts.length, 'planned workout')}
              </li>
              <li>
                <span className="count-number">{workoutLogs.length}</span>{' '}
                {formatCount(workoutLogs.length, 'workout log')}
              </li>
            </ul>
          )}
        </section>

        {/* ── Seed button ───────────────────────────────── */}
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
            <p className={seedMsg.startsWith('Seed failed') ? 'error' : 'seed-ok'}>
              {seedMsg}
            </p>
          )}
          <p className="hint">
            Seeding inserts 1 active race, 1 planned workout, and 1 unplanned
            log into IndexedDB. Refresh the page — counts should persist.
          </p>
        </section>

        {/* ── Active race quick-view ────────────────────── */}
        {!loading && races.length > 0 && (
          <section className="active-race-section">
            <h2>Active race</h2>
            {races.filter((r) => r.status === 'active').length === 0 ? (
              <p className="hint">No active race.</p>
            ) : (
              races
                .filter((r) => r.status === 'active')
                .map((r) => (
                  <div key={r.id} className="race-card">
                    <strong>{r.name}</strong>
                    <span className="race-dates">
                      {r.startDate} → {r.endDate}
                    </span>
                  </div>
                ))
            )}
          </section>
        )}
      </main>
    </div>
  );
}