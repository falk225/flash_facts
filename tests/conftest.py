from pathlib import Path

import pytest
from flask.testing import FlaskClient

from backend.app import app as flask_app
from backend.services import data_store

REPO_ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture(autouse=True)
def data_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Point the data store at a temp dir so no test can touch a real users.json."""
    path = tmp_path / "users.json"
    monkeypatch.setattr(data_store, "DATA_FILE", str(path))
    monkeypatch.setattr(data_store, "SEED_FILE", str(tmp_path / "users.example.json"))
    return path


@pytest.fixture
def seed_file(data_file: Path) -> Path:
    """Install the repo's real demo seed next to the temp data file."""
    seed = data_file.parent / "users.example.json"
    seed.write_text((REPO_ROOT / "data" / "users.example.json").read_text())
    return seed


@pytest.fixture
def client() -> FlaskClient:
    flask_app.config["TESTING"] = True
    return flask_app.test_client()


@pytest.fixture
def account_id(client: FlaskClient) -> str:
    resp = client.post("/api/accounts", json={"name": "Tester"})
    assert resp.status_code == 201
    return resp.get_json()["id"]
