from datetime import date
from uuid import uuid4

from app.models import PlannedWorkout, RaceStatus
from app.planning import recalculate_plan


def _pw(*, on: str, locked: bool, distance: float | None) -> PlannedWorkout:
    return PlannedWorkout.model_validate(
        {
            "id": str(uuid4()),
            "date": on,
            "type": "easy run",
            "locked": locked,
            "target_distance_km": distance,
            "target_duration_min": None,
            "target_pace_min_per_km_low": None,
            "target_pace_min_per_km_high": None,
            "structure_text": None,
            "race_id": str(uuid4()),
            "route_id": None,
        }
    )


def test_recalculate_plan_active_future_only_and_respects_locked():
    today = date(2026, 2, 26)

    past = _pw(on="2026-02-25", locked=False, distance=None)
    today_workout = _pw(on="2026-02-26", locked=False, distance=None)

    locked_future = _pw(on="2026-02-27", locked=True, distance=None)
    unlocked_future = _pw(on="2026-02-28", locked=False, distance=None)

    original = [past, today_workout, locked_future, unlocked_future]
    updated = recalculate_plan(today, original, RaceStatus.ACTIVE)

    # Past unchanged
    assert updated[0] == past
    # Today unchanged
    assert updated[1] == today_workout
    # Locked future unchanged
    assert updated[2] == locked_future

    # Unlocked future must be changed in a detectable way
    assert updated[3].date > today
    assert updated[3].locked is False
    assert updated[3].target_distance_km is not None


def test_recalculate_plan_non_active_race_returns_unchanged():
    today = date(2026, 2, 26)
    workouts = [
        _pw(on="2026-02-28", locked=False, distance=None),
        _pw(on="2026-03-01", locked=True, distance=None),
    ]

    updated = recalculate_plan(today, workouts, RaceStatus.COMPLETED)
    assert updated == workouts