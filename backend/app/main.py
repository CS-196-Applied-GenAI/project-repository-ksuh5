from fastapi import FastAPI, HTTPException

from app.csv_io import export_planned_workouts_csv, export_workout_logs_csv
from app.models import (
    CsvExportRequest,
    CsvExportResponse,
    PlanRecalculateRequest,
    PlanRecalculateResponse,
    RouteSnapRequest,
    RouteSnapResponse,
)
from app.planning import recalculate_plan

app = FastAPI()


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}


@app.post("/plan/recalculate", response_model=PlanRecalculateResponse)
def plan_recalculate(req: PlanRecalculateRequest) -> PlanRecalculateResponse:
    updated = recalculate_plan(
        today=req.today,
        planned_workouts=req.current_planned_workouts,
        race_status=req.race_status,
    )
    return PlanRecalculateResponse(updated_planned_workouts=updated)


@app.post("/csv/export", response_model=CsvExportResponse)
def csv_export(req: CsvExportRequest) -> CsvExportResponse:
    planned_csv = export_planned_workouts_csv(req.planned_workouts)
    logs_csv = export_workout_logs_csv(req.workout_logs)
    return CsvExportResponse(planned_workouts_csv=planned_csv, workout_logs_csv=logs_csv)


@app.post("/routes/snap", response_model=RouteSnapResponse)
def routes_snap(req: RouteSnapRequest) -> RouteSnapResponse:
    # Endpoint exists and validates input, but OSRM integration comes next.
    raise HTTPException(status_code=503, detail="OSRM not configured")