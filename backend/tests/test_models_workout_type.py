import pytest
from pydantic import ValidationError

from app.models import WorkoutTypeHolder


@pytest.mark.parametrize(
    "workout_type",
    [
        "easy run",
        "long run",
        "tempo",
        "intervals",
        "recover",
        "rest day",
        "cross-training",
    ],
)
def test_workout_type_valid_strings_parse(workout_type: str):
    m = WorkoutTypeHolder.model_validate({"type": workout_type})
    assert m.type.value == workout_type


def test_workout_type_invalid_string_rejected():
    with pytest.raises(ValidationError):
        WorkoutTypeHolder.model_validate({"type": "junk"})