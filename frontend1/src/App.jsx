import { useState, useEffect }  from 'react';
import { useAppData }           from './hooks/useAppData.js';
import { seedSampleData }       from './db/seed.js';
import { formatCount }          from './utils/formatters.js';
import { getActiveRaceId, getActiveRace, makeRace } from './domain/raceHelpers.js';
import {
  today, addDays, startOfMonth, addMonths,
  groupPlannedByDate,
} from './domain/calendarHelpers.js';
import { shouldConfirmDrop, movePlannedWorkout } from './domain/workoutHelpers.js';
import { logToPlannedWorkout, plannedPatchToLogPatch } from './domain/logHelpers.js';
import {
  createRaceEnforcingSingleActive,
  updatePlannedWorkout,
  updateWorkoutLog,
  upsertPlannedWorkout,
  createWorkoutLog,
  moveWorkoutLog,
} from './db/mutations.js';
import RaceBar             from './components/RaceBar.jsx';
import RaceModal           from './components/RaceModal.jsx';
import ConflictModal       from './components/ConflictModal.jsx';
import WeekCalendar        from './components/WeekCalendar.jsx';
import MonthCalendar       from './components/MonthCalendar.jsx';
import CalendarToggle      from './components/CalendarToggle.jsx';
import PlannedWorkoutModal from './components/PlannedWorkoutModal.jsx';
import LogWorkoutModal     from './components/LogWorkoutModal.jsx';
import ConfirmDialog       from './components/ConfirmDialog.jsx';
import './App.css';

export default function App() {
  const { races, plannedWorkouts, workoutLogs, loading, error, reload } =
    useAppData();

  // ── Active race ───────────────────────────────────────
  const [activeRaceId, setActiveRaceId] = useState(null);

  useEffect(() => {
    if (!loading && activeRaceId === null) {
      setActiveRaceId(getActiveRaceId(races));
    }
  }, [loading, races]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Selected item (planned workout OR log-backed) ─────
  const [selectedId, setSelectedId] = useState(null);

  // Look up in both planned workouts and logs (projected)
  const selectedWorkout = (() => {
    if (!selectedId) return null;
    // Real planned workout?
    const pw = plannedWorkouts.find((w) => w.id === selectedId);
    if (pw) return pw;
    // Log-backed?
    const log = workoutLogs.find((l) => l.id === selectedId);
    if (log) return logToPlannedWorkout(log);
    return null;
  })();

  function handleSelectWorkout(workout) { setSelectedId(workout.id); }
  function handleClosePlannedModal()    { setSelectedId(null); }

  /**
   * Save handler — routes to the right Dexie table based on _isLog.
   */
  async function handleSaveWorkout(id, patch) {
    const log = workoutLogs.find((l) => l.id === id);
    if (log) {
      // It's a log — convert the PlannedWorkout-shaped patch back to a log patch
      const logPatch = plannedPatchToLogPatch(patch);
      await updateWorkoutLog(log, logPatch);
    } else {
      const existing = plannedWorkouts.find((pw) => pw.id === id);
      if (!existing) throw new Error('Workout not found.');
      await updatePlannedWorkout(existing, patch);
    }
    await reload();
  }

  // ── Unified drag / drop ───────────────────────────────
  // Both planned workouts and log-backed cards use the same MIME type
  // and the same onDrop callback. We disambiguate by id here.
  const [pendingDrop, setPendingDrop] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleDropWorkout(id, targetDate) {
    // Is it a log?
    const log = workoutLogs.find((l) => l.id === id);
    if (log) {
      if (log.date !== targetDate) {
        moveWorkoutLog(log, targetDate).then(reload);
      }
      return;
    }

    // It's a real planned workout
    const workout = activePlannedWorkouts.find((pw) => pw.id === id);
    if (!workout || workout.date === targetDate) return;

    const byDate      = groupPlannedByDate(activePlannedWorkouts);
    const targetCount = (byDate[targetDate] ?? [])
      .filter((pw) => pw.id !== id).length;

    if (shouldConfirmDrop(targetCount)) {
      setPendingDrop({ workout, targetDate });
      setConfirmOpen(true);
    } else {
      doMoveWorkout(workout, targetDate);
    }
  }

  async function doMoveWorkout(workout, targetDate) {
    const moved = movePlannedWorkout(workout, targetDate);
    await upsertPlannedWorkout(moved);
    await reload();
  }

  function handleConfirmMove() {
    setConfirmOpen(false);
    if (pendingDrop) {
      doMoveWorkout(pendingDrop.workout, pendingDrop.targetDate);
      setPendingDrop(null);
    }
  }

  function handleCancelMove() {
    setConfirmOpen(false);
    setPendingDrop(null);
  }

  // ── Log workout modal ─────────────────────────────────
  const [logModalOpen,        setLogModalOpen]        = useState(false);
  const [logModalWorkoutId,   setLogModalWorkoutId]   = useState(null);
  const [logModalPrefillDate, setLogModalPrefillDate] = useState(null);
  const [logModalPrefillType, setLogModalPrefillType] = useState(null);

  function handleOpenAttachedLog(plannedWorkoutId, prefillDate, prefillType) {
    setLogModalWorkoutId(plannedWorkoutId);
    setLogModalPrefillDate(prefillDate);
    setLogModalPrefillType(prefillType);
    setLogModalOpen(true);
  }

  function handleOpenUnplannedLog() {
    setLogModalWorkoutId(null);
    setLogModalPrefillDate(today());
    setLogModalPrefillType(null);
    setLogModalOpen(true);
  }

  function handleCloseLogModal() { setLogModalOpen(false); }

  async function handleSaveLog(fields) {
    await createWorkoutLog(fields);
    await reload();
    setLogModalOpen(false);
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
      if (!result.cancelled) {
        setActiveRaceId(newRace.id);
        await reload();
      }
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
        <p className="app-status">Step 12 — Add logs ✓</p>
      </header>

      <main className="app-main">
        {!loading && (
          <section className="racebar-section">
            <div className="topbar">
              <RaceBar
                races={races}
                activeRaceId={activeRaceId}
                onSelect={setActiveRaceId}
                onNewRace={() => setRaceModalOpen(true)}
              />
              <button type="button" className="btn-global-log" onClick={handleOpenUnplannedLog}>
                + Log workout
              </button>
            </div>
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
                workoutLogs={workoutLogs}
                todayYMD={today()}
                raceStartDate={activeRace?.startDate ?? null}
                raceEndDate={activeRace?.endDate ?? null}
                onPrevWeek={handlePrevWeek}
                onNextWeek={handleNextWeek}
                onSelectWorkout={handleSelectWorkout}
                onDropWorkout={handleDropWorkout}
              />
            ) : (
              <MonthCalendar
                monthAnchor={anchor}
                plannedWorkouts={activePlannedWorkouts}
                workoutLogs={workoutLogs}
                todayYMD={today()}
                raceStartDate={activeRace?.startDate ?? null}
                raceEndDate={activeRace?.endDate ?? null}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                onSelectWorkout={handleSelectWorkout}
                onDropWorkout={handleDropWorkout}
              />
            )}
          </section>
        )}

        <section className="counts-section">
          <h2>IndexedDB counts</h2>
          {loading ? <p className="loading">Loading…</p> : error ? <p className="error">Error: {error}</p> : (
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
          {seedMsg && <p className={seedMsg.startsWith('Seed failed') ? 'error' : 'seed-ok'}>{seedMsg}</p>}
          <p className="hint">Seeds: 1 active race + 1 archived + 1 planned workout + 3 attached logs + 1 unplanned log.</p>
        </section>
      </main>

      <RaceModal isOpen={raceModalOpen} onClose={() => setRaceModalOpen(false)} onSave={handleRaceModalSave} />
      <ConflictModal isOpen={conflictModalOpen} existingRaceName={getActiveRace(races)?.name ?? ''} onDecide={handleConflictDecision} />
      <PlannedWorkoutModal
        workout={selectedWorkout}
        logs={workoutLogs}
        isOpen={selectedId !== null}
        onClose={handleClosePlannedModal}
        onSave={handleSaveWorkout}
        onAddLog={handleOpenAttachedLog}
      />
      <LogWorkoutModal
        isOpen={logModalOpen}
        onClose={handleCloseLogModal}
        onSave={handleSaveLog}
        plannedWorkoutId={logModalWorkoutId}
        prefillDate={logModalPrefillDate}
        prefillType={logModalPrefillType}
      />
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Day already has workouts"
        message={pendingDrop ? `Move "${pendingDrop.workout.title || 'this workout'}" to ${pendingDrop.targetDate}? That day already has planned workouts.` : ''}
        confirmLabel="Move anyway"
        cancelLabel="Keep original date"
        onConfirm={handleConfirmMove}
        onCancel={handleCancelMove}
      />
    </div>
  );
}