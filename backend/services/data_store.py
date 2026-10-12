import json
import fcntl
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
DATA_FILE = os.path.join(DATA_DIR, 'users.json')
# Demo accounts copied in on first run; the real users.json is gitignored.
SEED_FILE = os.path.join(DATA_DIR, 'users.example.json')

DEFAULT_DATA = {"accounts": []}


def _ensure_file():
    os.makedirs(os.path.dirname(os.path.abspath(DATA_FILE)), exist_ok=True)
    if not os.path.exists(DATA_FILE):
        if os.path.exists(SEED_FILE):
            with open(SEED_FILE, 'r') as f:
                seed = json.load(f)
        else:
            seed = DEFAULT_DATA
        with open(DATA_FILE, 'w') as f:
            json.dump(seed, f, indent=2)


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
