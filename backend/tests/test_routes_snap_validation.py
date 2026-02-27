import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app


def test_routes_snap_success_with_mocked_osrm(monkeypatch):
    sample = {
        "routes": [
            {
                "distance": 2500.0,
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[-88.0, 40.0], [-88.1, 40.1]],
                },
            }
        ]
    }

    def handler(request: httpx.Request) -> httpx.Response:
        # basic sanity: correct path
        assert request.url.path.startswith("/route/v1/driving/")
        return httpx.Response(200, json=sample)

    transport = httpx.MockTransport(handler)

    # Monkeypatch httpx.Client constructor used by OsrmClient
    real_client = httpx.Client

    def mocked_client(*args, **kwargs):
        kwargs["transport"] = transport
        return real_client(*args, **kwargs)

    monkeypatch.setattr(httpx, "Client", mocked_client)

    client = TestClient(app)
    resp = client.post(
        "/routes/snap",
        json={"waypoints": [{"lat": 40.0, "lng": -88.0}, {"lat": 40.1, "lng": -88.1}]},
    )
    assert resp.status_code == 200, resp.text

    data = resp.json()
    assert data["distance_km"] == 2.5
    assert data["geometry"]["type"] == "LineString"
    assert data["geometry"]["coordinates"] == [[-88.0, 40.0], [-88.1, 40.1]]
    assert data["start"] == {"lat": 40.0, "lng": -88.0}
    assert data["end"] == {"lat": 40.1, "lng": -88.1}


def test_routes_snap_connection_error_returns_503(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("no route to host", request=request)

    transport = httpx.MockTransport(handler)

    real_client = httpx.Client

    def mocked_client(*args, **kwargs):
        kwargs["transport"] = transport
        return real_client(*args, **kwargs)

    monkeypatch.setattr(httpx, "Client", mocked_client)

    client = TestClient(app)
    resp = client.post(
        "/routes/snap",
        json={"waypoints": [{"lat": 40.0, "lng": -88.0}, {"lat": 40.1, "lng": -88.1}]},
    )
    assert resp.status_code == 503
    assert "Unable to reach OSRM" in resp.json()["detail"]