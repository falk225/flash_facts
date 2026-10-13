import json
import fcntl
import os
from collections.abc import Generator
from contextlib import contextmanager
from typing import IO, Any, NotRequired, TypedDict, cast

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
DATA_FILE = os.path.join(DATA_DIR, 'users.json')
# Demo accounts copied in on first run; the real users.json is gitignored.
SEED_FILE = os.path.join(DATA_DIR, 'users.example.json')



# Shape of users.json. Static types only: nothing validates the file at runtime,
# and keys marked NotRequired may be missing from data written by older versions.

class OperationConfig(TypedDict):
    enabled: bool
    min: int
    max: int


class Config(TypedDict):
    operations: dict[str, OperationConfig]


class HistoryEntry(TypedDict):
    date: str
    total_cards: int
    first_try_correct: int
    score_pct: int


class FactStats(TypedDict):
    attempts: int
    first_try_correct: int


class Stats(TypedDict):
    sessions_completed: int
    last_session: str | None
    history: list[HistoryEntry]
    problem_areas: dict[str, dict[str, FactStats]]


class Account(TypedDict):
    id: str
    name: str
    avatar: NotRequired[str]
    color: NotRequired[str]
    avatar_filter: NotRequired[str]
    config: NotRequired[Config]
    stats: NotRequired[Stats]
    # Opaque frontend deck state (see session.js); stored and returned as-is.
    draft_session: NotRequired[dict[str, Any]]


class UsersData(TypedDict):
    accounts: list[Account]


DEFAULT_DATA: UsersData = {"accounts": []}


def _ensure_file() -> None:
    os.makedirs(os.path.dirname(os.path.abspath(DATA_FILE)), exist_ok=True)
    if not os.path.exists(DATA_FILE):
        if os.path.exists(SEED_FILE):
            with open(SEED_FILE, 'r') as f:
                seed: UsersData = json.load(f)
        else:
            seed = DEFAULT_DATA
        with open(DATA_FILE, 'w') as f:
            json.dump(seed, f, indent=2)


def load_users() -> UsersData:
    _ensure_file()
    with open(DATA_FILE, 'r') as f:
        fcntl.flock(f, fcntl.LOCK_SH)
        try:
            return cast(UsersData, json.load(f))
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


def _write(f: IO[str], data: UsersData) -> None:
    f.seek(0)
    json.dump(data, f, indent=2)
    f.truncate()


def save_users(data: UsersData) -> None:
    _ensure_file()
    with open(DATA_FILE, 'r+') as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            _write(f, data)
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


@contextmanager
def update_users() -> Generator[UsersData]:
    """Read-modify-write under one exclusive lock.

    Separate load_users() + save_users() calls release the lock in between, so
    two gunicorn workers writing at once lose one of the updates. Changes made
    to the yielded data are saved on normal exit; an exception skips the write.
    """
    _ensure_file()
    with open(DATA_FILE, 'r+') as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            data = cast(UsersData, json.load(f))
            yield data
            _write(f, data)
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


def find_account(data: UsersData, account_id: str) -> Account | None:
    for acc in data['accounts']:
        if acc['id'] == account_id:
            return acc
    return None
