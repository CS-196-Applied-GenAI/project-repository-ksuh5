from __future__ import annotations

import csv
from io import StringIO

from pydantic import ValidationError

from app.models import (
    CsvImportResultPlannedWorkouts,
    CsvImportResultWorkoutLogs,
    CsvRowError,
    PlannedWorkout,
    WorkoutLog,
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


# def import_planned_workouts_csv(csv_text: str) -> CsvImportResultPlannedWorkouts:
#     buf = StringIO(csv_text)
#     reader = csv.DictReader(buf)

#     items: list[PlannedWorkout] = []
#     errors: list[CsvRowError] = []

#     # DictReader line_num is the current line in the CSV (1-based, header is 1).
#     for row in reader:
#         row_number = reader.line_num
#         try:
#             items.append(PlannedWorkout.model_validate(row))
#         except ValidationError as e:
#             errors.append(CsvRowError(row_number=row_number, message=str(e)))

#     return CsvImportResultPlannedWorkouts(items=items, errors=errors)


# def import_workout_logs_csv(csv_text: str) -> CsvImportResultWorkoutLogs:
    # buf = StringIO(csv_text)
    # reader = csv.DictReader(buf)

    # items: list[WorkoutLog] = []
    # errors: list[CsvRowError] = []

    # for row in reader:
    #     row_number = reader.line_num
    #     try:
    #         items.append(WorkoutLog.model_validate(row))
    #     except ValidationError as e:
    #         errors.append(CsvRowError(row_number=row_number, message=str(e)))

    # return CsvImportResultWorkoutLogs(items=items, errors=errors)


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


def import_planned_workouts_csv(csv_text: str) -> CsvImportResultPlannedWorkouts:
    buf = StringIO(csv_text)
    reader = csv.DictReader(buf)

    items: list[PlannedWorkout] = []
    errors: list[CsvRowError] = []

    for row in reader:
        row_number = reader.line_num
        try:
            row = {k: (v.strip() if isinstance(v, str) else v) for k, v in row.items()}

            # Normalize empty strings to None for optional fields
            row["route_id"] = _clean_cell(row.get("route_id"))
            row["structure_text"] = _clean_cell(row.get("structure_text"))

            for k in [
                "target_distance_km",
                "target_duration_min",
                "target_pace_min_per_km_low",
                "target_pace_min_per_km_high",
            ]:
                row[k] = _clean_cell(row.get(k))

            # Parse bool
            row["locked"] = _parse_bool_cell(row.get("locked"))

            items.append(PlannedWorkout.model_validate(row))
        except ValidationError as e:
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

            row["linked_planned_workout_id"] = _clean_cell(row.get("linked_planned_workout_id"))
            row["notes"] = _clean_cell(row.get("notes"))
            row["actual_distance_km"] = _clean_cell(row.get("actual_distance_km"))
            row["actual_duration_min"] = _clean_cell(row.get("actual_duration_min"))

            items.append(WorkoutLog.model_validate(row))
        except ValidationError as e:
            errors.append(CsvRowError(row_number=row_number, message=str(e)))

    return CsvImportResultWorkoutLogs(items=items, errors=errors)