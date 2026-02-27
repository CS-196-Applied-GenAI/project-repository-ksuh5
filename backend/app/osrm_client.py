from __future__ import annotations

from dataclasses import dataclass

import httpx

from app.models import LatLng, RouteSnapResponse


class OsrmError(RuntimeError):
    """Raised when OSRM returns a non-OK response or invalid payload."""


@dataclass
class OsrmClient:
    base_url: str
    http: httpx.Client | None = None

    def __post_init__(self) -> None:
        self.base_url = self.base_url.rstrip("/")

    def route(self, waypoints: list[LatLng]) -> RouteSnapResponse:
        if len(waypoints) < 2:
            # This should normally be enforced by Pydantic at the API boundary,
            # but keep client safe if called directly.
            raise ValueError("At least 2 waypoints are required")

        coords = ";".join([f"{p.lng},{p.lat}" for p in waypoints])
        url = f"{self.base_url}/route/v1/driving/{coords}"
        params = {"geometries": "geojson", "overview": "full"}

        client = self.http or httpx.Client(timeout=10.0)
        close_client = self.http is None

        try:
            resp = client.get(url, params=params)
        finally:
            if close_client:
                client.close()

        if resp.status_code != 200:
            raise OsrmError(f"OSRM returned {resp.status_code}: {resp.text}")

        data = resp.json()
        try:
            routes = data["routes"]
            if not routes:
                raise OsrmError("OSRM response contained no routes")
            r0 = routes[0]
            distance_m = r0["distance"]
            geometry = r0["geometry"]
        except Exception as e:
            raise OsrmError(f"Invalid OSRM response shape: {data}") from e

        # We require GeoJSON-like dict: {"type":"LineString","coordinates":[[lng,lat],...]}
        if not isinstance(geometry, dict) or geometry.get("type") != "LineString":
            raise OsrmError(f"Unexpected geometry in OSRM response: {geometry}")

        return RouteSnapResponse(
            distance_km=float(distance_m) / 1000.0,
            geometry=geometry,
            start=waypoints[0],
            end=waypoints[-1],
        )