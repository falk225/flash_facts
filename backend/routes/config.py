from flask import Blueprint, jsonify, request
from backend.services.data_store import load_users, save_users, find_account

config_bp = Blueprint('config', __name__)

VALID_OPS = {"addition", "subtraction", "multiplication", "division"}


@config_bp.route('/api/accounts/<account_id>/config', methods=['GET'])
def get_config(account_id):
    data = load_users()
    acc = find_account(data, account_id)
    if not acc:
        return jsonify({"error": "Account not found"}), 404
    return jsonify(acc.get("config", {}))


@config_bp.route('/api/accounts/<account_id>/config', methods=['PUT'])
def save_config(account_id):
    body = request.get_json(silent=True) or {}
    ops = body.get("operations", {})

    # Validate
    for op_name, op_val in ops.items():
        if op_name not in VALID_OPS:
            return jsonify({"error": f"Unknown operation: {op_name}"}), 400
        mn = op_val.get("min", 0)
        mx = op_val.get("max", 15)
        if not (0 <= mn <= 15 and 0 <= mx <= 15 and mn <= mx):
            return jsonify({"error": f"Invalid range for {op_name}"}), 400

    data = load_users()
    acc = find_account(data, account_id)
    if not acc:
        return jsonify({"error": "Account not found"}), 404

    acc["config"] = {"operations": ops}
    save_users(data)
    return jsonify({"ok": True})
