from __future__ import annotations

import json
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.csv_io import (
    export_planned_workouts_csv,
    export_workout_logs_csv,
    import_planned_workouts_csv,
    import_workout_logs_csv,
)
from app.models import (
    CsvExportRequest,
    CsvExportResponse,
    CsvImportRequest,
    CsvImportResponse,
    PlanRecalculateRequest,
    PlanRecalculateResponse,
    RouteSnapRequest,
    RouteSnapResponse,
    StateLoadResponse,
    StateSaveRequest,
    StateSnapshot,
)
from app.osrm_client import OsrmClient, OsrmError
from app.planning import recalculate_plan
from app.state_store import load_snapshot, save_snapshot

app = FastAPI()

# ── CORS ──────────────────────────────────────────────────────────────────────
# Allows the Vite dev server (localhost:5173) to call the backend (localhost:8000).
# In production, replace "*" with your actual frontend origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # allow all origins in dev
    allow_credentials=True,
    allow_methods=["*"],          # allow GET, POST, OPTIONS, etc.
    allow_headers=["*"],          # allow Content-Type, Authorization, etc.
)

# ── OSRM client ───────────────────────────────────────────────────────────────
OSRM_BASE_URL = os.environ.get(
    "OSRM_BASE_URL",
    "https://routing.openstreetmap.de/routed-foot",
)
_osrm = OsrmClient(base_url=OSRM_BASE_URL)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}


# ── Plan recalculate ──────────────────────────────────────────────────────────

@app.post("/plan/recalculate", response_model=PlanRecalculateResponse)
def plan_recalculate(req: PlanRecalculateRequest) -> PlanRecalculateResponse:
    updated = recalculate_plan(
        today=req.today,
        planned_workouts=req.current_planned_workouts,
        race_status=req.race_status,
    )
    return PlanRecalculateResponse(updated_planned_workouts=updated)


# ── CSV export / import ───────────────────────────────────────────────────────

@app.post("/csv/export", response_model=CsvExportResponse)
def csv_export(req: CsvExportRequest) -> CsvExportResponse:
    planned_csv = export_planned_workouts_csv(req.planned_workouts)
    logs_csv    = export_workout_logs_csv(req.workout_logs)
    return CsvExportResponse(planned_workouts_csv=planned_csv, workout_logs_csv=logs_csv)


@app.post("/csv/import", response_model=CsvImportResponse)
def csv_import(req: CsvImportRequest) -> CsvImportResponse:
    planned = import_planned_workouts_csv(req.planned_workouts_csv)
    logs    = import_workout_logs_csv(req.workout_logs_csv)
    return CsvImportResponse(planned_workouts=planned, workout_logs=logs)


# ── Route snap ────────────────────────────────────────────────────────────────

@app.post("/routes/snap", response_model=RouteSnapResponse)
def routes_snap(req: RouteSnapRequest) -> RouteSnapResponse:
    try:
        return _osrm.route(req.waypoints)
    except OsrmError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ── State save / load ─────────────────────────────────────────────────────────

@app.post("/state/save")
def state_save(req: StateSaveRequest) -> dict:
    save_snapshot(json.dumps(req.snapshot.model_dump()))
    return {"status": "ok"}


@app.get("/state/load", response_model=StateLoadResponse)
def state_load() -> StateLoadResponse:
    raw = load_snapshot()
    if raw is None:
        return StateLoadResponse(snapshot=None)
    data = json.loads(raw)
    return StateLoadResponse(snapshot=StateSnapshot(data=data.get("data", data)))