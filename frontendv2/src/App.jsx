import { useState, useEffect }  from 'react';
import { useAppData }           from './hooks/useAppData.js';
import { seedSampleData }       from './db/seed.js';
import { formatCount }          from './utils/formatters.js';
import { displayWorkoutType, isQualityType }          from './domain/workoutTypes.js';
import { getActiveRaceId, getActiveRace, makeRace }   from './domain/raceHelpers.js';
import { createRaceEnforcingSingleActive }             from './db/mutations.js';
import RaceBar      from './components/RaceBar.jsx';
import RaceModal    from './components/RaceModal.jsx';
import ConflictModal from './components/ConflictModal.jsx';
import './App.css';

export default function App() {
  const { races, plannedWorkouts, workoutLogs, loading, error, reload } =
    useAppData();

  // ── Active race ───────────────────────────────────────
  const [activeRaceId, setActiveRaceId] = useState(null);

  useEffect(() => {
    if (!loading) setActiveRaceId(getActiveRaceId(races));
  }, [loading, races]);

  const activeRace = races.find((r) => r.id === activeRaceId) ?? null;
  const activePlannedWorkouts = activeRace
    ? plannedWorkouts.filter((pw) => pw.raceId === activeRace.id)
    : [];

  // ── Race creation state machine ───────────────────────
  //
  // Stage 1: RaceModal — user fills in name/dates
  // Stage 2: ConflictModal — only shown if an active race already exists
  // Stage 3: createRaceEnforcingSingleActive — atomic Dexie write
  //
  const [raceModalOpen,     setRaceModalOpen]     = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [pendingRace,       setPendingRace]        = useState(null);  // { name,startDate,endDate,seedWorkout }
  const [creating,          setCreating]           = useState(false);

  /**
   * Called when RaceModal is submitted.
   * If there is no current active race → create immediately.
   * If there is one             → hold the form data and open ConflictModal.
   */
  async function handleRaceModalSave(fields) {
    const existingActive = getActiveRace(races);

    if (!existingActive) {
      // No conflict — create directly
      await doCreateRace(fields, null);
    } else {
      // Conflict — store pending fields, surface the conflict modal
      setPendingRace(fields);
      setRaceModalOpen(false);
      setConflictModalOpen(true);
    }
  }

  /**
   * Called when ConflictModal resolves (archive / complete / cancel).
   */
  async function handleConflictDecision(decision) {
    setConflictModalOpen(false);

    if (decision === 'cancel') {
      // Abort — discard pending race, reopen race modal so user can try again
      setPendingRace(null);
      return;
    }

    if (pendingRace) {
      await doCreateRace(pendingRace, decision);
      setPendingRace(null);
    }
  }

  /**
   * Performs the actual Dexie write (shared by both paths).
   */
  async function doCreateRace(fields, decision) {
    setCreating(true);
    try {
      const newRace = makeRace({
        name:      fields.name,
        startDate: fields.startDate,
        endDate:   fields.endDate,
      });

      const result = await createRaceEnforcingSingleActive({
        newRace,
        decision,
        seedWorkout: fields.seedWorkout,
      });

      if (!result.cancelled) {
        await reload();
        setActiveRaceId(newRace.id);
      }
    } finally {
      setCreating(false);
      setRaceModalOpen(false);
    }
  }

  // ── Seed ─────────────────────────────────────────────
  const [seeding,  setSeeding]  = useState(false);
  const [seedMsg,  setSeedMsg]  = useState('');

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
        <p className="app-status">Step 5 — Single-active enforcement ✓</p>
      </header>

      <main className="app-main">
        {/* ── Race bar ──────────────────────────────── */}
        {!loading && (
          <section className="racebar-section">
            <RaceBar
              races={races}
              activeRaceId={activeRaceId}
              onSelect={setActiveRaceId}
              onNewRace={() => setRaceModalOpen(true)}
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
                    <span className={`workout-type-badge ${isQualityType(pw.type) ? 'quality' : 'normal'}`}>
                      {displayWorkoutType(pw.type)}
                    </span>
                    {pw.title && <span className="workout-title">{pw.title}</span>}
                    {pw.locked && <span className="workout-locked" title="Locked">🔒</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* ── All races (debug) ────────────────────── */}
        {!loading && races.length > 0 && (
          <section className="all-races-section">
            <h2>All races ({races.length})</h2>
            <ul className="race-list">
              {races.map((r) => (
                <li key={r.id} className={`race-row race-row--${r.status}`}>
                  <span className="race-row__name">{r.name}</span>
                  <span className="race-row__dates">{r.startDate} → {r.endDate}</span>
                  <span className={`race-row__status race-row__status--${r.status}`}>{r.status}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Dev tools ────────────────────────────── */}
        <section className="seed-section">
          <h2>Dev tools</h2>
          <button className="btn-seed" onClick={handleSeed} disabled={seeding || creating}>
            {seeding ? 'Seeding…' : '🌱 Seed sample data'}
          </button>
          {seedMsg && (
            <p className={seedMsg.startsWith('Seed failed') ? 'error' : 'seed-ok'}>{seedMsg}</p>
          )}
          <p className="hint">
            Seeds: 1 active race + 1 archived race + 1 planned workout + 1 log.
          </p>
        </section>
      </main>

      {/* ── Stage 1: Race creation form ───────────── */}
      <RaceModal
        isOpen={raceModalOpen}
        onClose={() => setRaceModalOpen(false)}
        onSave={handleRaceModalSave}
      />

      {/* ── Stage 2: Conflict resolution ──────────── */}
      <ConflictModal
        isOpen={conflictModalOpen}
        existingRaceName={getActiveRace(races)?.name ?? ''}
        onDecide={handleConflictDecision}
      />
    </div>
  );
}