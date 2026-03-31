import json
import fcntl
import os

DATA_FILE = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'users.json')

DEFAULT_DATA = {"accounts": []}


def _ensure_file():
    os.makedirs(os.path.dirname(os.path.abspath(DATA_FILE)), exist_ok=True)
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'w') as f:
            json.dump(DEFAULT_DATA, f, indent=2)


def load_users():
    _ensure_file()
    with open(DATA_FILE, 'r') as f:
        fcntl.flock(f, fcntl.LOCK_SH)
        try:
            return json.load(f)
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


def save_users(data):
    _ensure_file()
    with open(DATA_FILE, 'r+') as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            f.seek(0)
            json.dump(data, f, indent=2)
            f.truncate()
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


def find_account(data, account_id):
    for acc in data['accounts']:
        if acc['id'] == account_id:
            return acc
    return None
