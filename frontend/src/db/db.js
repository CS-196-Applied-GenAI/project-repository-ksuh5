import Dexie from 'dexie';

export const db = new Dexie('TrainingPlannerDB');

db.version(1).stores({
  races: '&id, status',
  plannedWorkouts: '&id, raceId, date',
  workoutLogs: '&id, plannedWorkoutId, date',
});
