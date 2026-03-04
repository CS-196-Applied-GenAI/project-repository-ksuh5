/**
 * Dexie database definition.
 *
 * ALL THREE tables must be declared here with the correct primary key.
 * If workoutLogs is missing or on a stale schema version, put() will
 * throw "Table workoutLogs not part of this database" at runtime and
 * the log move silently reverts when reload() re-reads the old data.
 */
import Dexie from 'dexie';

const db = new Dexie('TrainingPlannerDB');

db.version(1).stores({
  races:           'id, status, startDate, endDate',
  plannedWorkouts: 'id, raceId, date, type',
  workoutLogs:     'id, plannedWorkoutId, date, type',
});

export default db;