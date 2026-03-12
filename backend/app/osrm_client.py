from __future__ import annotations

from dataclasses import dataclass

import httpx

from app.models import LatLng, RouteSnapResponse


class OsrmError(RuntimeError):
    """Raised when OSRM returns a non-200 response or an unexpected payload."""


@dataclass
class OsrmClient:
    base_url: str

    def __post_init__(self) -> None:
        self.base_url = self.base_url.rstrip("/")

    def route(self, waypoints: list[LatLng]) -> RouteSnapResponse:
        if len(waypoints) < 2:
            raise ValueError("At least 2 waypoints are required")

        coords = ";".join([f"{p.lng},{p.lat}" for p in waypoints])
        # Use 'foot' profile — sidewalks, footpaths, trails only
        url    = f"{self.base_url}/route/v1/foot/{coords}"
        params = {"geometries": "geojson", "overview": "full"}

        with httpx.Client(timeout=15.0) as client:
            resp = client.get(url, params=params)

        if resp.status_code != 200:
            raise OsrmError(f"OSRM returned {resp.status_code}: {resp.text}")

        data = resp.json()
        try:
            route0     = data["routes"][0]
            distance_m = route0["distance"]
            geometry   = route0["geometry"]
        except Exception as e:
            raise OsrmError(f"Invalid OSRM response shape: {data}") from e

        if not isinstance(geometry, dict) or geometry.get("type") != "LineString":
            raise OsrmError(f"Unexpected geometry in OSRM response: {geometry}")

        return RouteSnapResponse(
            distance_km=float(distance_m) / 1000.0,
            geometry=geometry,
            start=waypoints[0],
            end=waypoints[-1],
        )