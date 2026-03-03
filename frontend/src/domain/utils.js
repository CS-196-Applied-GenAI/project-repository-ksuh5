export function formatCounts({ races, plannedWorkouts, workoutLogs }) {
  return `Races: ${races.length} | Planned: ${plannedWorkouts.length} | Logs: ${workoutLogs.length}`;
}

export function hasData({ races, plannedWorkouts, workoutLogs }) {
  return races.length > 0 || plannedWorkouts.length > 0 || workoutLogs.length > 0;
}
