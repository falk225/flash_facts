from flask.testing import FlaskClient

from backend.services import data_store

PUBLIC_FIELDS = {"id", "name", "avatar", "color", "avatar_filter"}


def test_list_seeded_accounts(client: FlaskClient, seed_file: object) -> None:
    resp = client.get("/api/accounts")

    assert resp.status_code == 200
    accounts = resp.get_json()
    assert [a["name"] for a in accounts] == ["Player 1", "Player 2", "Player 3"]
    assert accounts[0]["avatar"] == "🦊"


def test_list_exposes_only_public_fields(client: FlaskClient, account_id: str) -> None:
    # The selector screen must not receive every player's stats and history.
    (account,) = client.get("/api/accounts").get_json()

    assert set(account) == PUBLIC_FIELDS


def test_create_account(client: FlaskClient) -> None:
    resp = client.post("/api/accounts", json={"name": "  Sam  "})

    assert resp.status_code == 201
    body = resp.get_json()
    assert body["name"] == "Sam"
    assert body["id"].startswith("acc_")
    stored = data_store.find_account(data_store.load_users(), body["id"])
    assert stored is not None and "stats" in stored and "config" in stored
    assert stored["stats"]["sessions_completed"] == 0
    assert stored["config"]["operations"]["addition"]["enabled"] is True


def test_create_account_ids_are_unique(client: FlaskClient) -> None:
    ids = {client.post("/api/accounts", json={"name": f"P{i}"}).get_json()["id"] for i in range(5)}

    assert len(ids) == 5


def test_create_account_requires_name(client: FlaskClient) -> None:
    for body in ({}, {"name": ""}, {"name": "   "}, {"name": None}):
        assert client.post("/api/accounts", json=body).status_code == 400
    assert client.post("/api/accounts", data="not json").status_code == 400
    assert data_store.load_users()["accounts"] == []


def test_create_account_limit_is_five(client: FlaskClient) -> None:
    for i in range(5):
        assert client.post("/api/accounts", json={"name": f"P{i}"}).status_code == 201

    resp = client.post("/api/accounts", json={"name": "Sixth"})

    assert resp.status_code == 400
    assert len(data_store.load_users()["accounts"]) == 5


def test_delete_account(client: FlaskClient, account_id: str) -> None:
    assert client.delete(f"/api/accounts/{account_id}").status_code == 200
    assert client.get("/api/accounts").get_json() == []


def test_delete_unknown_account(client: FlaskClient, account_id: str) -> None:
    assert client.delete("/api/accounts/acc_missing").status_code == 404
    assert len(client.get("/api/accounts").get_json()) == 1
