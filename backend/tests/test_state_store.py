from pathlib import Path

from app.state_store import load_snapshot, save_snapshot


def test_save_then_load_returns_same_json_string(tmp_path: Path):
    db_path = tmp_path / "state.db"
    payload = '{"hello": "world", "n": 1, "arr": [1, 2, 3]}'

    save_snapshot(payload, db_path=db_path)
    loaded = load_snapshot(db_path=db_path)

    assert loaded == payload