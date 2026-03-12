import Dexie from 'dexie';

const db = new Dexie('TrainingPlannerDB');

db.version(1).stores({
  races:           '&id, status',
  plannedWorkouts: '&id, raceId, date',
  workoutLogs:     '&id, plannedWorkoutId, date',
});

// Version 2 — add routeGeometry field to plannedWorkouts
// Dexie only needs index entries here; non-indexed fields are stored automatically
db.version(2).stores({
  races:           '&id, status',
  plannedWorkouts: '&id, raceId, date',
  workoutLogs:     '&id, plannedWorkoutId, date',
});

export default db;