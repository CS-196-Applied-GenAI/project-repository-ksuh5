// ─── Workout type enum maps ───────────────────────────────────────────────────

const WORKOUT_TYPE_TO_BACKEND = {
  easy: 'easy run',
  tempo: 'tempo',
  interval: 'interval',
  long_run: 'long run',
  cross_train: 'cross-training',
  rest: 'rest day',
};

const WORKOUT_TYPE_TO_FRONTEND = Object.fromEntries(
  Object.entries(WORKOUT_TYPE_TO_BACKEND).map(([fe, be]) => [be, fe])
);

// ─── Race status enum maps ────────────────────────────────────────────────────

const RACE_STATUS_TO_BACKEND = {
  active: 'Active',
  archived: 'Archived',
  completed: 'Completed',
};

const RACE_STATUS_TO_FRONTEND = Object.fromEntries(
  Object.entries(RACE_STATUS_TO_BACKEND).map(([fe, be]) => [be, fe])
);

// ─── Workout mappers ──────────────────────────────────────────────────────────

export function frontendWorkoutToBackend(pw) {
  return {
    race_id: pw.raceId ?? null,
    target_duration_min: pw.durationMinutes ?? null,
    target_distance_km: pw.distance ?? null,
    target_pace_min_per_km_low: pw.paceLow ?? null,
    target_pace_min_per_km_high: pw.paceHigh ?? null,
    structure_text: pw.structureText ?? null,
    type: pw.type != null ? (WORKOUT_TYPE_TO_BACKEND[pw.type] ?? pw.type) : null,
    // Pass all other fields through as-is
    ...Object.fromEntries(
      Object.entries(pw).filter(
        ([k]) =>
          ![
            'raceId',
            'durationMinutes',
            'distance',
            'paceLow',
            'paceHigh',
            'structureText',
            'type',
          ].includes(k)
      )
    ),
  };
}

export function backendWorkoutToFrontend(bw) {
  return {
    raceId: bw.race_id ?? null,
    durationMinutes: bw.target_duration_min ?? null,
    distance: bw.target_distance_km ?? null,
    paceLow: bw.target_pace_min_per_km_low ?? null,
    paceHigh: bw.target_pace_min_per_km_high ?? null,
    structureText: bw.structure_text ?? null,
    type: bw.type != null ? (WORKOUT_TYPE_TO_FRONTEND[bw.type] ?? bw.type) : null,
    // Pass all other fields through as-is
    ...Object.fromEntries(
      Object.entries(bw).filter(
        ([k]) =>
          ![
            'race_id',
            'target_duration_min',
            'target_distance_km',
            'target_pace_min_per_km_low',
            'target_pace_min_per_km_high',
            'structure_text',
            'type',
          ].includes(k)
      )
    ),
  };
}

// ─── Log mappers ──────────────────────────────────────────────────────────────

export function frontendLogToBackend(log) {
  return {
    race_id: log.raceId ?? null,
    target_duration_min: log.durationMinutes ?? null,
    target_distance_km: log.distance ?? null,
    target_pace_min_per_km_low: log.paceLow ?? null,
    target_pace_min_per_km_high: log.paceHigh ?? null,
    structure_text: log.structureText ?? null,
    type: log.type != null ? (WORKOUT_TYPE_TO_BACKEND[log.type] ?? log.type) : null,
    ...Object.fromEntries(
      Object.entries(log).filter(
        ([k]) =>
          ![
            'raceId',
            'durationMinutes',
            'distance',
            'paceLow',
            'paceHigh',
            'structureText',
            'type',
          ].includes(k)
      )
    ),
  };
}

export function backendLogToFrontend(blog) {
  return {
    raceId: blog.race_id ?? null,
    durationMinutes: blog.target_duration_min ?? null,
    distance: blog.target_distance_km ?? null,
    paceLow: blog.target_pace_min_per_km_low ?? null,
    paceHigh: blog.target_pace_min_per_km_high ?? null,
    structureText: blog.structure_text ?? null,
    type: blog.type != null ? (WORKOUT_TYPE_TO_FRONTEND[blog.type] ?? blog.type) : null,
    ...Object.fromEntries(
      Object.entries(blog).filter(
        ([k]) =>
          ![
            'race_id',
            'target_duration_min',
            'target_distance_km',
            'target_pace_min_per_km_low',
            'target_pace_min_per_km_high',
            'structure_text',
            'type',
          ].includes(k)
      )
    ),
  };
}

// ─── Race status mappers ──────────────────────────────────────────────────────

export function frontendRaceStatusToBackend(status) {
  return RACE_STATUS_TO_BACKEND[status] ?? status;
}

export function backendRaceStatusToFrontend(status) {
  return RACE_STATUS_TO_FRONTEND[status] ?? status;
}