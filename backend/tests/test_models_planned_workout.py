from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.models import PlannedWorkout


def test_planned_workout_valid_parses_from_dict():
    payload = {
        "id": str(uuid4()),
        "date": "2026-02-26",
        "type": "easy run",
        "locked": False,
        "target_distance_km": 5.0,
        "target_duration_min": 30,
        "target_pace_min_per_km_low": 5.0,
        "target_pace_min_per_km_high": 6.0,
        "structure_text": "Warmup + easy",
        "race_id": str(uuid4()),
        "route_id": None,
    }

    w = PlannedWorkout.model_validate(payload)
    assert w.type.value == "easy run"
    assert str(w.date) == "2026-02-26"
    assert w.locked is False


def test_planned_workout_invalid_type_rejected():
    payload = {
        "id": str(uuid4()),
        "date": "2026-02-26",
        "type": "junk",
        "locked": False,
        "race_id": str(uuid4()),
        "route_id": None,
    }
    with pytest.raises(ValidationError):
        PlannedWorkout.model_validate(payload)


def test_planned_workout_locked_must_be_boolean():
    payload = {
        "id": str(uuid4()),
        "date": "2026-02-26",
        "type": "easy run",
        "locked": "not-a-bool",
        "race_id": str(uuid4()),
        "route_id": None,
    }
    with pytest.raises(ValidationError):
        PlannedWorkout.model_validate(payload)


def test_planned_workout_date_must_be_parseable():
    payload = {
        "id": str(uuid4()),
        "date": "not-a-date",
        "type": "easy run",
        "locked": False,
        "race_id": str(uuid4()),
        "route_id": None,
    }
    with pytest.raises(ValidationError):
        PlannedWorkout.model_validate(payload)