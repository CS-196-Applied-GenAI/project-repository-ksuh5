from fastapi.testclient import TestClient

import app.main as main
import app.state_store as state_store


def test_state_save_then_load_round_trip(monkeypatch, tmp_path):
    db_path = tmp_path / "state.db"

    def save_snapshot_tmp(snapshot_json: str) -> None:
        state_store.save_snapshot(snapshot_json, db_path=db_path)

    def load_snapshot_tmp() -> str | None:
        return state_store.load_snapshot(db_path=db_path)

    # Patch the functions that main.py calls
    monkeypatch.setattr(main, "save_snapshot", save_snapshot_tmp)
    monkeypatch.setattr(main, "load_snapshot", load_snapshot_tmp)

    client = TestClient(main.app)

    payload = {"hello": "world", "n": 1, "arr": [1, 2, 3]}

    save_resp = client.post("/state/save", json={"snapshot": {"data": payload}})
    assert save_resp.status_code == 200, save_resp.text
    assert save_resp.json()["status"] == "ok"

    load_resp = client.get("/state/load")
    assert load_resp.status_code == 200, load_resp.text
    body = load_resp.json()

    assert body["snapshot"] is not None
    assert body["snapshot"]["data"] == payload


def test_state_load_when_empty_returns_null_snapshot(monkeypatch, tmp_path):
    db_path = tmp_path / "state.db"

    def save_snapshot_tmp(snapshot_json: str) -> None:
        state_store.save_snapshot(snapshot_json, db_path=db_path)

    def load_snapshot_tmp() -> str | None:
        return state_store.load_snapshot(db_path=db_path)

    monkeypatch.setattr(main, "save_snapshot", save_snapshot_tmp)
    monkeypatch.setattr(main, "load_snapshot", load_snapshot_tmp)

    client = TestClient(main.app)

    load_resp = client.get("/state/load")
    assert load_resp.status_code == 200, load_resp.text
    assert load_resp.json()["snapshot"] is None