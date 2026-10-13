from datetime import date
from typing import Any

from flask.testing import FlaskClient


def result(label: str, op: str, correct: bool) -> dict[str, Any]:
    return {"label": label, "operation": op, "first_try_correct": correct}


def post_session(client: FlaskClient, account_id: str, results: list[dict[str, Any]]) -> Any:
    first_try = sum(r["first_try_correct"] for r in results)
    return client.post(
        f"/api/accounts/{account_id}/sessions",
        json={"total_cards": len(results), "first_try_correct": first_try, "card_results": results},
    )


def stats(client: FlaskClient, account_id: str) -> dict[str, Any]:
    return client.get(f"/api/accounts/{account_id}/stats").get_json()


def test_session_records_score_and_history(client: FlaskClient, account_id: str) -> None:
    resp = post_session(client, account_id, [
        result("7 × 8", "multiplication", False),
        result("2 + 2", "addition", True),
        result("3 + 3", "addition", True),
    ])

    assert resp.status_code == 200
    assert resp.get_json()["score_pct"] == 67
    s = stats(client, account_id)
    assert s["sessions_completed"] == 1
    assert s["last_session"] == date.today().isoformat()
    assert s["history"] == [{
        "date": date.today().isoformat(), "total_cards": 3, "first_try_correct": 2, "score_pct": 67,
    }]


def test_problem_areas_accumulate_per_fact(client: FlaskClient, account_id: str) -> None:
    post_session(client, account_id, [result("7 × 8", "multiplication", False)])
    post_session(client, account_id, [result("7 × 8", "multiplication", True)])
    post_session(client, account_id, [result("7 × 8", "multiplication", False)])

    areas = stats(client, account_id)["problem_areas"]

    assert areas["multiplication"]["7 × 8"] == {"attempts": 3, "first_try_correct": 1}
    assert areas["addition"] == {}


def test_results_missing_label_or_operation_are_ignored(client: FlaskClient, account_id: str) -> None:
    post_session(client, account_id, [
        {"operation": "addition", "first_try_correct": True},
        {"label": "1 + 1", "first_try_correct": True},
    ])

    assert all(v == {} for v in stats(client, account_id)["problem_areas"].values())


def test_history_keeps_last_50(client: FlaskClient, account_id: str) -> None:
    for i in range(55):
        client.post(
            f"/api/accounts/{account_id}/sessions",
            json={"total_cards": 100, "first_try_correct": i, "card_results": []},
        )

    s = stats(client, account_id)

    assert s["sessions_completed"] == 55
    assert len(s["history"]) == 50
    assert [h["first_try_correct"] for h in s["history"]] == list(range(5, 55))


def test_empty_session_scores_zero(client: FlaskClient, account_id: str) -> None:
    resp = client.post(f"/api/accounts/{account_id}/sessions", json={})

    assert resp.status_code == 200
    assert resp.get_json()["score_pct"] == 0


def test_draft_round_trip(client: FlaskClient, account_id: str) -> None:
    url = f"/api/accounts/{account_id}/session-draft"
    assert client.get(url).get_json() is None

    card = {"id": "addition_2_3", "label": "2 + 3", "operation": "addition", "answer": 5}
    draft = {
        "total_cards": 10,
        "remaining_deck": [card],
        "seen_once": ["addition_1_1"],
        "first_try_correct": ["addition_1_1"],
        "card_results": {"addition_1_1": result("1 + 1", "addition", True)},
    }
    assert client.put(url, json=draft).status_code == 200

    saved = client.get(url).get_json()
    assert {k: saved[k] for k in draft} == draft
    assert date.fromisoformat(saved["saved_at"][:10]) == date.today()

    assert client.delete(url).status_code == 200
    assert client.get(url).get_json() is None


def test_draft_does_not_touch_stats(client: FlaskClient, account_id: str) -> None:
    client.put(f"/api/accounts/{account_id}/session-draft", json={"total_cards": 5})

    assert stats(client, account_id)["sessions_completed"] == 0


def test_unknown_account_returns_404(client: FlaskClient) -> None:
    base = "/api/accounts/acc_missing"
    assert post_session(client, "acc_missing", []).status_code == 404
    assert client.get(f"{base}/stats").status_code == 404
    assert client.get(f"{base}/session-draft").status_code == 404
    assert client.put(f"{base}/session-draft", json={}).status_code == 404
    assert client.delete(f"{base}/session-draft").status_code == 404
