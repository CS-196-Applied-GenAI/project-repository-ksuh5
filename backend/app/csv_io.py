from __future__ import annotations

import csv
from datetime import date
from io import StringIO
from uuid import UUID

from pydantic import ValidationError

from app.models import (
    CsvImportResultPlannedWorkouts,
    CsvImportResultWorkoutLogs,
    CsvRowError,
    PlannedWorkout,
    WorkoutLog,
    WorkoutType,
)

PLANNED_WORKOUT_COLUMNS = [
    "id",
    "date",
    "type",
    "target_distance_km",
    "target_duration_min",
    "target_pace_min_per_km_low",
    "target_pace_min_per_km_high",
    "structure_text",
    "locked",
    "race_id",
    "route_id",
]

WORKOUT_LOG_COLUMNS = [
    "id",
    "date",
    "type",
    "actual_distance_km",
    "actual_duration_min",
    "notes",
    "linked_planned_workout_id",
]


def _none_to_empty(value):
    return "" if value is None else value


def export_planned_workouts_csv(planned_workouts: list[PlannedWorkout]) -> str:
    buf = StringIO()
    writer = csv.writer(buf)

    writer.writerow(PLANNED_WORKOUT_COLUMNS)
    for w in planned_workouts:
        writer.writerow(
            [
                str(w.id),
                w.date.isoformat(),
                w.type.value,
                _none_to_empty(w.target_distance_km),
                _none_to_empty(w.target_duration_min),
                _none_to_empty(w.target_pace_min_per_km_low),
                _none_to_empty(w.target_pace_min_per_km_high),
                _none_to_empty(w.structure_text),
                w.locked,
                str(w.race_id),
                _none_to_empty(str(w.route_id) if w.route_id is not None else None),
            ]
        )

    return buf.getvalue()


def export_workout_logs_csv(logs: list[WorkoutLog]) -> str:
    buf = StringIO()
    writer = csv.writer(buf)

    writer.writerow(WORKOUT_LOG_COLUMNS)
    for log in logs:
        writer.writerow(
            [
                str(log.id),
                log.date.isoformat(),
                log.type.value,
                _none_to_empty(log.actual_distance_km),
                _none_to_empty(log.actual_duration_min),
                _none_to_empty(log.notes),
                _none_to_empty(
                    str(log.linked_planned_workout_id)
                    if log.linked_planned_workout_id is not None
                    else None
                ),
            ]
        )

    return buf.getvalue()


def _clean_cell(v: str | None) -> str | None:
    if v is None:
        return None
    v = v.strip()
    return None if v == "" else v


def _parse_bool_cell(v: str | None) -> bool | str | None:
    v2 = _clean_cell(v)
    if v2 is None:
        return None
    if v2.lower() in {"true", "t", "1", "yes", "y"}:
        return True
    if v2.lower() in {"false", "f", "0", "no", "n"}:
        return False
    return v  # let Pydantic raise a ValidationError


def _parse_required_uuid(v: str | None, *, field: str) -> UUID:
    v2 = _clean_cell(v)
    if v2 is None:
        raise ValueError(f"Missing required field '{field}'")
    try:
        return UUID(v2)
    except Exception as e:
        raise ValueError(f"Invalid UUID for '{field}': {v2}") from e


def _parse_optional_uuid(v: str | None, *, field: str) -> UUID | None:
    v2 = _clean_cell(v)
    if v2 is None:
        return None
    try:
        return UUID(v2)
    except Exception as e:
        raise ValueError(f"Invalid UUID for '{field}': {v2}") from e


def _parse_required_date(v: str | None, *, field: str) -> date:
    v2 = _clean_cell(v)
    if v2 is None:
        raise ValueError(f"Missing required field '{field}'")
    try:
        return date.fromisoformat(v2)
    except Exception as e:
        raise ValueError(f"Invalid date for '{field}': {v2} (expected YYYY-MM-DD)") from e


def _parse_required_workout_type(v: str | None, *, field: str = "type") -> WorkoutType:
    v2 = _clean_cell(v)
    if v2 is None:
        raise ValueError(f"Missing required field '{field}'")
    try:
        return WorkoutType(v2)
    except Exception as e:
        allowed = ", ".join([wt.value for wt in WorkoutType])
        raise ValueError(f"Invalid workout type '{v2}'. Allowed: {allowed}") from e


def _parse_optional_float(v: str | None, *, field: str) -> float | None:
    v2 = _clean_cell(v)
    if v2 is None:
        return None
    try:
        return float(v2)
    except Exception as e:
        raise ValueError(f"Invalid float for '{field}': {v2}") from e


def _parse_optional_int(v: str | None, *, field: str) -> int | None:
    v2 = _clean_cell(v)
    if v2 is None:
        return None
    try:
        return int(v2)
    except Exception as e:
        raise ValueError(f"Invalid int for '{field}': {v2}") from e


def _parse_required_bool(v: str | None, *, field: str) -> bool:
    parsed = _parse_bool_cell(v)
    if isinstance(parsed, bool):
        return parsed
    if parsed is None:
        raise ValueError(f"Missing required field '{field}'")
    raise ValueError(f"Invalid boolean for '{field}': {parsed} (expected true/false)")


def import_planned_workouts_csv(csv_text: str) -> CsvImportResultPlannedWorkouts:
    buf = StringIO(csv_text)
    reader = csv.DictReader(buf)

    items: list[PlannedWorkout] = []
    errors: list[CsvRowError] = []

    for row in reader:
        row_number = reader.line_num
        try:
            row = {k: (v.strip() if isinstance(v, str) else v) for k, v in row.items()}

            normalized = {
                "id": _parse_required_uuid(row.get("id"), field="id"),
                "date": _parse_required_date(row.get("date"), field="date"),
                "type": _parse_required_workout_type(row.get("type"), field="type"),
                "locked": _parse_required_bool(row.get("locked"), field="locked"),
                "target_distance_km": _parse_optional_float(
                    row.get("target_distance_km"), field="target_distance_km"
                ),
                "target_duration_min": _parse_optional_int(
                    row.get("target_duration_min"), field="target_duration_min"
                ),
                "target_pace_min_per_km_low": _parse_optional_float(
                    row.get("target_pace_min_per_km_low"), field="target_pace_min_per_km_low"
                ),
                "target_pace_min_per_km_high": _parse_optional_float(
                    row.get("target_pace_min_per_km_high"), field="target_pace_min_per_km_high"
                ),
                "structure_text": _clean_cell(row.get("structure_text")),
                "race_id": _parse_required_uuid(row.get("race_id"), field="race_id"),
                "route_id": _parse_optional_uuid(row.get("route_id"), field="route_id"),
            }

            items.append(PlannedWorkout.model_validate(normalized))
        except (ValidationError, ValueError) as e:
            errors.append(CsvRowError(row_number=row_number, message=str(e)))

    return CsvImportResultPlannedWorkouts(items=items, errors=errors)


def import_workout_logs_csv(csv_text: str) -> CsvImportResultWorkoutLogs:
    buf = StringIO(csv_text)
    reader = csv.DictReader(buf)

    items: list[WorkoutLog] = []
    errors: list[CsvRowError] = []

    for row in reader:
        row_number = reader.line_num
        try:
            row = {k: (v.strip() if isinstance(v, str) else v) for k, v in row.items()}

            normalized = {
                "id": _parse_required_uuid(row.get("id"), field="id"),
                "date": _parse_required_date(row.get("date"), field="date"),
                "type": _parse_required_workout_type(row.get("type"), field="type"),
                "actual_distance_km": _parse_optional_float(
                    row.get("actual_distance_km"), field="actual_distance_km"
                ),
                "actual_duration_min": _parse_optional_int(
                    row.get("actual_duration_min"), field="actual_duration_min"
                ),
                "notes": _clean_cell(row.get("notes")),
                "linked_planned_workout_id": _parse_optional_uuid(
                    row.get("linked_planned_workout_id"),
                    field="linked_planned_workout_id",
                ),
            }

            items.append(WorkoutLog.model_validate(normalized))
        except (ValidationError, ValueError) as e:
            errors.append(CsvRowError(row_number=row_number, message=str(e)))

    return CsvImportResultWorkoutLogs(items=items, errors=errors)