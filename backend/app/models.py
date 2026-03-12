from __future__ import annotations

from datetime import date
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field
from pydantic.types import conlist


class WorkoutType(str, Enum):
    EASY_RUN       = "easy run"
    LONG_RUN       = "long run"
    TEMPO          = "tempo"
    INTERVALS      = "intervals"
    RECOVER        = "recover"
    REST_DAY       = "rest day"
    CROSS_TRAINING = "cross-training"


class WorkoutTypeHolder(BaseModel):
    type: WorkoutType


class RaceStatus(str, Enum):
    ACTIVE    = "Active"
    COMPLETED = "Completed"
    ARCHIVED  = "Archived"


class Race(BaseModel):
    id:     UUID
    name:   str
    date:   date
    status: RaceStatus


class PlannedWorkout(BaseModel):
    id:     UUID
    date:   date
    type:   WorkoutType
    locked: bool

    target_distance_km:          float | None = None
    target_duration_min:         int   | None = None
    target_pace_min_per_km_low:  float | None = None
    target_pace_min_per_km_high: float | None = None
    structure_text:              str   | None = None

    race_id:  UUID
    route_id: UUID | None = None


class PlanRecalculateRequest(BaseModel):
    today:                    date
    race_status:              RaceStatus
    current_planned_workouts: list[PlannedWorkout]


class PlanRecalculateResponse(BaseModel):
    updated_planned_workouts: list[PlannedWorkout]


class WorkoutLog(BaseModel):
    id:                        UUID
    date:                      date
    type:                      WorkoutType
    actual_distance_km:        float | None = None
    actual_duration_min:       int   | None = None
    notes:                     str   | None = None
    linked_planned_workout_id: UUID  | None = None


class CsvExportRequest(BaseModel):
    planned_workouts: list[PlannedWorkout]
    workout_logs:     list[WorkoutLog]


class CsvExportResponse(BaseModel):
    planned_workouts_csv: str
    workout_logs_csv:     str


class CsvRowError(BaseModel):
    row_number: int
    message:    str


class CsvImportResultPlannedWorkouts(BaseModel):
    items:  list[PlannedWorkout]
    errors: list[CsvRowError]


class CsvImportResultWorkoutLogs(BaseModel):
    items:  list[WorkoutLog]
    errors: list[CsvRowError]


class CsvImportRequest(BaseModel):
    planned_workouts_csv: str
    workout_logs_csv:     str


class CsvImportResponse(BaseModel):
    planned_workouts: CsvImportResultPlannedWorkouts
    workout_logs:     CsvImportResultWorkoutLogs


# ── Route snap ────────────────────────────────────────────────────────────────

class LatLng(BaseModel):
    lat: float
    lng: float


class RouteSnapRequest(BaseModel):
    waypoints: conlist(LatLng, min_length=2) = Field(
        ..., description="At least 2 waypoints required."
    )


class RouteSnapResponse(BaseModel):
    distance_km: float
    geometry:    dict
    start:       LatLng
    end:         LatLng


# ── State persistence ─────────────────────────────────────────────────────────

class StateSnapshot(BaseModel):
    data: Any


class StateSaveRequest(BaseModel):
    snapshot: StateSnapshot


class StateLoadResponse(BaseModel):
    snapshot: StateSnapshot | None