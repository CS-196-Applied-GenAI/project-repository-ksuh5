from datetime import date
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


def test_plan_recalculate_defaults_unlocked_future_workout():
    client = TestClient(app)

    today = date(2026, 2, 26)

    payload = {
        "today": str(today),
        "race_status": "Active",
        "current_planned_workouts": [
            {
                "id": str(uuid4()),
                "date": "2026-02-28",
                "type": "easy run",
                "locked": False,
                "target_distance_km": None,
                "target_duration_min": None,
                "target_pace_min_per_km_low": None,
                "target_pace_min_per_km_high": None,
                "structure_text": None,
                "race_id": str(uuid4()),
                "route_id": None,
            }
        ],
    }

    resp = client.post("/plan/recalculate", json=payload)
    assert resp.status_code == 200

    data = resp.json()
    assert "updated_planned_workouts" in data
    assert len(data["updated_planned_workouts"]) == 1
    assert data["updated_planned_workouts"][0]["target_distance_km"] == 5.0