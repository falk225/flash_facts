from datetime import date
from flask import Blueprint, jsonify, request
from backend.services.data_store import load_users, save_users, find_account

sessions_bp = Blueprint('sessions', __name__)


@sessions_bp.route('/api/accounts/<account_id>/sessions', methods=['POST'])
def save_session(account_id):
    """
    Body: {
      "total_cards": int,
      "first_try_correct": int,
      "card_results": [
        { "label": "7 + 5", "operation": "addition", "first_try_correct": bool }
      ]
    }
    """
    body = request.get_json(silent=True) or {}
    total = body.get("total_cards", 0)
    first_try = body.get("first_try_correct", 0)
    card_results = body.get("card_results", [])

    score_pct = round(first_try / total * 100) if total > 0 else 0

    data = load_users()
    acc = find_account(data, account_id)
    if not acc:
        return jsonify({"error": "Account not found"}), 404

    stats = acc.setdefault("stats", {
        "sessions_completed": 0,
        "last_session": None,
        "history": [],
        "problem_areas": {"addition": {}, "subtraction": {}, "multiplication": {}, "division": {}}
    })

    # Append session history (keep last 50)
    stats["sessions_completed"] = stats.get("sessions_completed", 0) + 1
    stats["last_session"] = date.today().isoformat()
    history_entry = {
        "date": date.today().isoformat(),
        "total_cards": total,
        "first_try_correct": first_try,
        "score_pct": score_pct
    }
    stats.setdefault("history", []).append(history_entry)
    if len(stats["history"]) > 50:
        stats["history"] = stats["history"][-50:]

    # Update per-card problem areas
    problem_areas = stats.setdefault("problem_areas", {
        "addition": {}, "subtraction": {}, "multiplication": {}, "division": {}
    })
    for result in card_results:
        op = result.get("operation")
        label = result.get("label")
        correct = result.get("first_try_correct", False)
        if op and label:
            op_dict = problem_areas.setdefault(op, {})
            entry = op_dict.setdefault(label, {"attempts": 0, "first_try_correct": 0})
            entry["attempts"] += 1
            if correct:
                entry["first_try_correct"] += 1

    save_users(data)
    return jsonify({"ok": True, "score_pct": score_pct})


@sessions_bp.route('/api/accounts/<account_id>/stats', methods=['GET'])
def get_stats(account_id):
    data = load_users()
    acc = find_account(data, account_id)
    if not acc:
        return jsonify({"error": "Account not found"}), 404
    return jsonify(acc.get("stats", {}))
