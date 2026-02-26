from __future__ import annotations

from app.models import LatLng, RouteSnapResponse


class OsrmClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")

    def route(self, waypoints: list[LatLng]) -> RouteSnapResponse:
        raise NotImplementedError("OSRM client not implemented yet.")