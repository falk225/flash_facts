from typing import Any

import pytest
from flask.testing import FlaskClient


def ops(**overrides: dict[str, Any]) -> dict[str, Any]:
    base: dict[str, dict[str, Any]] = {
        "addition": {"enabled": True, "min": 0, "max": 10},
        "subtraction": {"enabled": False, "min": 0, "max": 10},
        "multiplication": {"enabled": True, "min": 2, "max": 12},
        "division": {"enabled": False, "min": 1, "max": 10},
    }
    base.update(overrides)
    return {"operations": base}


def test_new_account_has_default_config(client: FlaskClient, account_id: str) -> None:
    resp = client.get(f"/api/accounts/{account_id}/config")

    assert resp.status_code == 200
    assert set(resp.get_json()["operations"]) == {"addition", "subtraction", "multiplication", "division"}


def test_save_config_round_trips(client: FlaskClient, account_id: str) -> None:
    resp = client.put(f"/api/accounts/{account_id}/config", json=ops())

    assert resp.status_code == 200
    assert client.get(f"/api/accounts/{account_id}/config").get_json() == ops()


def test_full_range_is_accepted(client: FlaskClient, account_id: str) -> None:
    body = ops(division={"enabled": True, "min": 0, "max": 15})

    assert client.put(f"/api/accounts/{account_id}/config", json=body).status_code == 200


def test_unknown_operation_rejected(client: FlaskClient, account_id: str) -> None:
    resp = client.put(f"/api/accounts/{account_id}/config", json=ops(exponent={"enabled": True}))

    assert resp.status_code == 400
    assert "exponent" in resp.get_json()["error"]


@pytest.mark.parametrize(
    "rng",
    [{"min": 5, "max": 4}, {"min": -1, "max": 4}, {"min": 0, "max": 16}, {"min": 16, "max": 16}],
    ids=["min>max", "negative", "max>15", "both>15"],
)
def test_invalid_range_rejected(client: FlaskClient, account_id: str, rng: dict[str, int]) -> None:
    before = client.get(f"/api/accounts/{account_id}/config").get_json()

    resp = client.put(f"/api/accounts/{account_id}/config", json=ops(addition={"enabled": True, **rng}))

    assert resp.status_code == 400
    assert client.get(f"/api/accounts/{account_id}/config").get_json() == before


def test_config_unknown_account(client: FlaskClient) -> None:
    assert client.get("/api/accounts/acc_missing/config").status_code == 404
    assert client.put("/api/accounts/acc_missing/config", json=ops()).status_code == 404
