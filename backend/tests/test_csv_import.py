from app.csv_io import import_planned_workouts_csv, import_workout_logs_csv


def test_import_planned_workouts_csv_one_valid_row():
    csv_text = """id,date,type,target_distance_km,target_duration_min,target_pace_min_per_km_low,target_pace_min_per_km_high,structure_text,locked,race_id,route_id
11111111-1111-1111-1111-111111111111,2026-02-28,easy run,5.0,30,,,,Warmup,False,22222222-2222-2222-2222-222222222222,
"""
    result = import_planned_workouts_csv(csv_text)
    assert len(result.items) == 1
    assert len(result.errors) == 0
    assert result.items[0].type.value == "easy run"


def test_import_planned_workouts_csv_one_invalid_row_bad_type_has_row_number_2():
    csv_text = """id,date,type,target_distance_km,target_duration_min,target_pace_min_per_km_low,target_pace_min_per_km_high,structure_text,locked,race_id,route_id
11111111-1111-1111-1111-111111111111,2026-02-28,junk,5.0,30,,,,Warmup,False,22222222-2222-2222-2222-222222222222,
"""
    result = import_planned_workouts_csv(csv_text)
    assert len(result.items) == 0
    assert len(result.errors) == 1
    assert result.errors[0].row_number == 2


def test_import_workout_logs_csv_mixed_valid_and_invalid():
    csv_text = """id,date,type,actual_distance_km,actual_duration_min,notes,linked_planned_workout_id
33333333-3333-3333-3333-333333333333,2026-02-28,easy run,5.0,30,ok,
44444444-4444-4444-4444-444444444444,2026-02-28,junk,5.0,30,bad,
"""
    result = import_workout_logs_csv(csv_text)
    assert len(result.items) == 1
    assert len(result.errors) == 1
    assert result.errors[0].row_number == 3