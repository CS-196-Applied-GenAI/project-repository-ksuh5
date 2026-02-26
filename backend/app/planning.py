from __future__ import annotations

from datetime import date

from app.models import PlannedWorkout, RaceStatus, WorkoutType


def recalculate_plan(
    today: date, planned_workouts: list[PlannedWorkout], race_status: RaceStatus
) -> list[PlannedWorkout]:
    if race_status != RaceStatus.ACTIVE:
        # For non-active races, return unchanged (no recalculation / frozen).
        return planned_workouts

    updated: list[PlannedWorkout] = []

    for w in planned_workouts:
        # Past or today: unchanged
        if w.date <= today:
            updated.append(w)
            continue

        # Locked future: unchanged
        if w.locked:
            updated.append(w)
            continue

        # Unlocked future: default missing targets deterministically
        if w.type == WorkoutType.REST_DAY:
            # Rest day: keep distance/duration as None.
            updated.append(w)
            continue

        if w.target_distance_km is None:
            updated.append(w.model_copy(update={"target_distance_km": 5.0}))
            continue

        updated.append(w)

    return updated