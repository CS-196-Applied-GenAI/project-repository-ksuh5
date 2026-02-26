from uuid import uuid4

from app.csv_io import (
    PLANNED_WORKOUT_COLUMNS,
    WORKOUT_LOG_COLUMNS,
    export_planned_workouts_csv,
    export_workout_logs_csv,
)
from app.models import PlannedWorkout, WorkoutLog


def test_export_planned_workouts_csv_header_and_deterministic_and_quoting():
    w = PlannedWorkout.model_validate(
        {
            "id": str(uuid4()),
            "date": "2026-02-28",
            "type": "easy run",
            "locked": False,
            "target_distance_km": None,
            "target_duration_min": None,
            "target_pace_min_per_km_low": None,
            "target_pace_min_per_km_high": None,
            "structure_text": "Warmup, then easy\nCooldown",
            "race_id": str(uuid4()),
            "route_id": None,
        }
    )

    csv1 = export_planned_workouts_csv([w])
    csv2 = export_planned_workouts_csv([w])
    assert csv1 == csv2  # deterministic

    lines = csv1.splitlines()
    assert lines[0] == ",".join(PLANNED_WORKOUT_COLUMNS)

    # Ensure commas/newlines caused quoting of the structure_text cell
    # The newline will make the row potentially span multiple lines; safest check:
    assert '"Warmup, then easy' in csv1
    assert 'Cooldown"' in csv1


def test_export_workout_logs_csv_header_and_quoting():
    log = WorkoutLog.model_validate(
        {
            "id": str(uuid4()),
            "date": "2026-02-28",
            "type": "easy run",
            "actual_distance_km": 5.0,
            "actual_duration_min": 30,
            "notes": "Felt good, negative split\nNo pain",
            "linked_planned_workout_id": None,
        }
    )

    out = export_workout_logs_csv([log])
    lines = out.splitlines()
    assert lines[0] == ",".join(WORKOUT_LOG_COLUMNS)

    # Notes include comma + newline -> must be quoted in CSV output
    assert '"Felt good, negative split' in out
    assert 'No pain"' in out