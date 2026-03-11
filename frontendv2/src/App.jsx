import { useState, useEffect }  from 'react';
import { useAppData }           from './hooks/useAppData.js';
import { seedSampleData }       from './db/seed.js';
import { formatCount }          from './utils/formatters.js';
import { getActiveRaceId, getActiveRace, makeRace } from './domain/raceHelpers.js';
import { today, addDays, startOfMonth, addMonths }  from './domain/calendarHelpers.js';
import { createRaceEnforcingSingleActive, updatePlannedWorkout } from './db/mutations.js';
import RaceBar              from './components/RaceBar.jsx';
import RaceModal            from './components/RaceModal.jsx';
import ConflictModal        from './components/ConflictModal.jsx';
import WeekCalendar         from './components/WeekCalendar.jsx';
import MonthCalendar        from './components/MonthCalendar.jsx';
import CalendarToggle       from './components/CalendarToggle.jsx';
import PlannedWorkoutModal  from './components/PlannedWorkoutModal.jsx';
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

  // ── Calendar ──────────────────────────────────────────
  const [calView, setCalView] = useState('week');
  const [anchor,  setAnchor]  = useState(today());

  useEffect(() => {
    setAnchor(activeRace ? activeRace.startDate : today());
  }, [activeRace?.id]);

  const handlePrevWeek  = () => setAnchor((a) => addDays(a, -7));
  const handleNextWeek  = () => setAnchor((a) => addDays(a, 7));
  const handlePrevMonth = () => setAnchor((a) => addMonths(startOfMonth(a), -1));
  const handleNextMonth = () => setAnchor((a) => addMonths(startOfMonth(a), 1));

  // ── Planned workout selection + save ──────────────────
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(null);

  const selectedWorkout =
    activePlannedWorkouts.find((pw) => pw.id === selectedWorkoutId) ?? null;

  function handleSelectWorkout(workout) { setSelectedWorkoutId(workout.id); }
  function handleCloseWorkoutModal()    { setSelectedWorkoutId(null); }

  /**
   * Persist a patch to a planned workout, then reload state.
   * applyPlannedWorkoutPatch (inside updatePlannedWorkout) handles
   * locked=true and updatedAt automatically.
   */
  async function handleSaveWorkout(id, patch) {
    const existing = activePlannedWorkouts.find((pw) => pw.id === id);
    if (!existing) throw new Error('Workout not found.');
    await updatePlannedWorkout(existing, patch);
    await reload();
  }

  // ── Race creation ─────────────────────────────────────
  const [raceModalOpen,     setRaceModalOpen]     = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [pendingRace,       setPendingRace]        = useState(null);
  const [creating,          setCreating]           = useState(false);

  async function handleRaceModalSave(fields) {
    const existingActive = getActiveRace(races);
    if (!existingActive) { await doCreateRace(fields, null); }
    else { setPendingRace(fields); setRaceModalOpen(false); setConflictModalOpen(true); }
  }

  async function handleConflictDecision(decision) {
    setConflictModalOpen(false);
    if (decision === 'cancel') { setPendingRace(null); return; }
    if (pendingRace) { await doCreateRace(pendingRace, decision); setPendingRace(null); }
  }

  async function doCreateRace(fields, decision) {
    setCreating(true);
    try {
      const newRace = makeRace({ name: fields.name, startDate: fields.startDate, endDate: fields.endDate });
      const result  = await createRaceEnforcingSingleActive({ newRace, decision, seedWorkout: fields.seedWorkout });
      if (!result.cancelled) { await reload(); setActiveRaceId(newRace.id); }
    } finally { setCreating(false); setRaceModalOpen(false); }
  }

  // ── Seed ──────────────────────────────────────────────
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');

  async function handleSeed() {
    setSeeding(true); setSeedMsg('');
    try { await seedSampleData(); await reload(); setSeedMsg('Sample data seeded ✓'); }
    catch (err) { setSeedMsg(`Seed failed: ${err.message}`); }
    finally { setSeeding(false); }
  }

  // ── Render ────────────────────────────────────────────
  return (
    <div className="app">
      <header className="app-header">
        <h1>Training Planner</h1>
        <p className="app-status">Step 9 — Planned workout editing ✓</p>
      </header>

      <main className="app-main">
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

        {!loading && (
          <section className="calendar-section">
            <div className="calendar-section__header">
              <h2>
                Calendar
                {!activeRace && <span className="section-hint"> — no active race</span>}
              </h2>
              <CalendarToggle view={calView} onChange={setCalView} />
            </div>

            {calView === 'week' ? (
              <WeekCalendar
                weekAnchor={anchor}
                plannedWorkouts={activePlannedWorkouts}
                todayYMD={today()}
                raceStartDate={activeRace?.startDate ?? null}
                raceEndDate={activeRace?.endDate ?? null}
                onPrevWeek={handlePrevWeek}
                onNextWeek={handleNextWeek}
                onSelectWorkout={handleSelectWorkout}
              />
            ) : (
              <MonthCalendar
                monthAnchor={anchor}
                plannedWorkouts={activePlannedWorkouts}
                todayYMD={today()}
                raceStartDate={activeRace?.startDate ?? null}
                raceEndDate={activeRace?.endDate ?? null}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                onSelectWorkout={handleSelectWorkout}
              />
            )}
          </section>
        )}

        <section className="counts-section">
          <h2>IndexedDB counts</h2>
          {loading ? (
            <p className="loading">Loading…</p>
          ) : error ? (
            <p className="error">Error: {error}</p>
          ) : (
            <ul className="counts-list">
              <li><span className="count-number">{races.length}</span>{formatCount(races.length, 'race')}</li>
              <li><span className="count-number">{plannedWorkouts.length}</span>{formatCount(plannedWorkouts.length, 'planned workout')}</li>
              <li><span className="count-number">{workoutLogs.length}</span>{formatCount(workoutLogs.length, 'workout log')}</li>
            </ul>
          )}
        </section>

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

        <section className="seed-section">
          <h2>Dev tools</h2>
          <button className="btn-seed" onClick={handleSeed} disabled={seeding || creating}>
            {seeding ? 'Seeding…' : '🌱 Seed sample data'}
          </button>
          {seedMsg && (
            <p className={seedMsg.startsWith('Seed failed') ? 'error' : 'seed-ok'}>{seedMsg}</p>
          )}
          <p className="hint">Seeds: 1 active race + 1 archived + 1 planned workout + 1 log.</p>
        </section>
      </main>

      <RaceModal
        isOpen={raceModalOpen}
        onClose={() => setRaceModalOpen(false)}
        onSave={handleRaceModalSave}
      />
      <ConflictModal
        isOpen={conflictModalOpen}
        existingRaceName={getActiveRace(races)?.name ?? ''}
        onDecide={handleConflictDecision}
      />
      <PlannedWorkoutModal
        workout={selectedWorkout}
        isOpen={selectedWorkoutId !== null}
        onClose={handleCloseWorkoutModal}
        onSave={handleSaveWorkout}
      />
    </div>
  );
}