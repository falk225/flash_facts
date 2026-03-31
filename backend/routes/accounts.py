import uuid
from flask import Blueprint, jsonify, request
from backend.services.data_store import load_users, save_users

accounts_bp = Blueprint('accounts', __name__)

DEFAULT_CONFIG = {
    "operations": {
        "addition":       {"enabled": True,  "min": 0, "max": 10},
        "subtraction":    {"enabled": True,  "min": 0, "max": 10},
        "multiplication": {"enabled": False, "min": 2, "max": 10},
        "division":       {"enabled": False, "min": 1, "max": 10}
    }
}

DEFAULT_STATS = {
    "sessions_completed": 0,
    "last_session": None,
    "history": [],
    "problem_areas": {
        "addition": {},
        "subtraction": {},
        "multiplication": {},
        "division": {}
    }
}


@accounts_bp.route('/api/accounts', methods=['GET'])
def list_accounts():
    data = load_users()
    accounts = [{"id": a["id"], "name": a["name"], "avatar": a.get("avatar", "")} for a in data["accounts"]]
    return jsonify(accounts)


@accounts_bp.route('/api/accounts', methods=['POST'])
def create_account():
    body = request.get_json(silent=True) or {}
    name = (body.get('name') or '').strip()
    if not name:
        return jsonify({"error": "name is required"}), 400

    data = load_users()
    if len(data['accounts']) >= 5:
        return jsonify({"error": "Maximum of 5 accounts allowed"}), 400

    new_account = {
        "id": "acc_" + uuid.uuid4().hex[:8],
        "name": name,
        "config": DEFAULT_CONFIG.copy(),
        "stats": {
            "sessions_completed": 0,
            "last_session": None,
            "history": [],
            "problem_areas": {
                "addition": {},
                "subtraction": {},
                "multiplication": {},
                "division": {}
            }
        }
    }
    data['accounts'].append(new_account)
    save_users(data)
    return jsonify({"id": new_account["id"], "name": new_account["name"], "avatar": new_account.get("avatar", "")}), 201


@accounts_bp.route('/api/accounts/<account_id>', methods=['DELETE'])
def delete_account(account_id):
    data = load_users()
    original_len = len(data['accounts'])
    data['accounts'] = [a for a in data['accounts'] if a['id'] != account_id]
    if len(data['accounts']) == original_len:
        return jsonify({"error": "Account not found"}), 404
    save_users(data)
    return jsonify({"ok": True})
