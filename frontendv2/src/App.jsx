import { useState, useEffect }  from 'react';
import { useAppData }           from './hooks/useAppData.js';
import { seedSampleData }       from './db/seed.js';
import { formatCount }          from './utils/formatters.js';
import { displayWorkoutType, isQualityType }        from './domain/workoutTypes.js';
import { getActiveRaceId, getActiveRace, makeRace } from './domain/raceHelpers.js';
import {
  today, addDays, startOfMonth, addMonths,
} from './domain/calendarHelpers.js';
import { createRaceEnforcingSingleActive }          from './db/mutations.js';
import RaceBar       from './components/RaceBar.jsx';
import RaceModal     from './components/RaceModal.jsx';
import ConflictModal from './components/ConflictModal.jsx';
import WeekCalendar  from './components/WeekCalendar.jsx';
import MonthCalendar from './components/MonthCalendar.jsx';
import CalendarToggle from './components/CalendarToggle.jsx';
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

  // ── Calendar view toggle ──────────────────────────────
  const [calView, setCalView] = useState('week'); // 'week' | 'month'

  // ── Shared anchor — one date that drives both views ───
  // weekAnchor  : any date inside the displayed week
  // monthAnchor : any date inside the displayed month
  // We keep a single `anchor` and derive both from it.
  const [anchor, setAnchor] = useState(today());

  // Sync anchor to active race start date when race changes
  useEffect(() => {
    setAnchor(activeRace ? activeRace.startDate : today());
  }, [activeRace?.id]);

  // Week navigation
  const handlePrevWeek  = () => setAnchor((a) => addDays(a, -7));
  const handleNextWeek  = () => setAnchor((a) => addDays(a, 7));

  // Month navigation — move anchor to the 1st of the target month
  const handlePrevMonth = () => setAnchor((a) => addMonths(startOfMonth(a), -1));
  const handleNextMonth = () => setAnchor((a) => addMonths(startOfMonth(a), 1));

  // ── Race creation state machine ───────────────────────
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
        <p className="app-status">Step 7 — Month view + toggle ✓</p>
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

        {/* ── Calendar (week or month) ───────────────── */}
        {!loading && (
          <section className="calendar-section">
            {/* Section header row: title + toggle */}
            <div className="calendar-section__header">
              <h2>
                Calendar
                {!activeRace && (
                  <span className="section-hint"> — no active race</span>
                )}
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
              />
            )}
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
              <li><span className="count-number">{races.length}</span>{formatCount(races.length, 'race')}</li>
              <li><span className="count-number">{plannedWorkouts.length}</span>{formatCount(plannedWorkouts.length, 'planned workout')}</li>
              <li><span className="count-number">{workoutLogs.length}</span>{formatCount(workoutLogs.length, 'workout log')}</li>
            </ul>
          )}
        </section>

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
    </div>
  );
}