import Dexie from 'dexie';

/**
 * Single Dexie database instance for the Training Planner app.
 *
 * Tables (v1):
 *   races           – Race records
 *   plannedWorkouts – PlannedWorkout records (belong to a race)
 *   workoutLogs     – WorkoutLog records (optional link to a plannedWorkout)
 *
 * Key principle: Dexie is persistence; React state is the UI cache.
 * Every mutation writes to Dexie first, then updates React state.
 */
const db = new Dexie('TrainingPlannerDB');

db.version(1).stores({
  // Primary key first, then indexed columns.
  // All other fields are stored but not indexed.
  races: 'id, status, name',
  plannedWorkouts: 'id, raceId, date, type',
  workoutLogs: 'id, plannedWorkoutId, date, type',
});

export default db;