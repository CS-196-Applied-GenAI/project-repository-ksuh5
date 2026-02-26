from fastapi.testclient import TestClient

from app.main import app


def test_routes_snap_requires_at_least_two_waypoints():
    client = TestClient(app)

    resp = client.post(
        "/routes/snap",
        json={"waypoints": [{"lat": 40.0, "lng": -88.0}]},
    )
    assert resp.status_code == 422