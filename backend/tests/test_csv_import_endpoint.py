from fastapi.testclient import TestClient

from app.main import app


def test_csv_import_endpoint_parses_one_planned_workout_and_one_log():
    client = TestClient(app)

    planned_workouts_csv = """id,date,type,target_distance_km,target_duration_min,target_pace_min_per_km_low,target_pace_min_per_km_high,structure_text,locked,race_id,route_id
11111111-1111-1111-1111-111111111111,2026-02-28,easy run,5.0,30,,,Warmup,False,22222222-2222-2222-2222-222222222222,
"""

    workout_logs_csv = """id,date,type,actual_distance_km,actual_duration_min,notes,linked_planned_workout_id
33333333-3333-3333-3333-333333333333,2026-02-28,easy run,5.0,30,ok,
"""

    resp = client.post(
        "/csv/import",
        json={
            "planned_workouts_csv": planned_workouts_csv,
            "workout_logs_csv": workout_logs_csv,
        },
    )
    assert resp.status_code == 200, resp.text

    data = resp.json()

    assert data["planned_workouts"]["errors"] == []
    assert len(data["planned_workouts"]["items"]) == 1

    assert data["workout_logs"]["errors"] == []
    assert len(data["workout_logs"]["items"]) == 1