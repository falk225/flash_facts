import json
import multiprocessing
from pathlib import Path

from backend.services import data_store


def test_first_load_seeds_from_example(data_file: Path, seed_file: Path) -> None:
    data = data_store.load_users()

    assert [a["name"] for a in data["accounts"]] == ["Player 1", "Player 2", "Player 3"]
    assert data_file.exists()


def test_first_load_without_seed_starts_empty(data_file: Path) -> None:
    assert data_store.load_users() == {"accounts": []}
    assert json.loads(data_file.read_text()) == {"accounts": []}


def test_existing_file_is_never_reseeded(data_file: Path, seed_file: Path) -> None:
    data_file.write_text(json.dumps({"accounts": [{"id": "acc_x", "name": "Real"}]}))

    assert [a["name"] for a in data_store.load_users()["accounts"]] == ["Real"]


def test_save_then_load_round_trips(data_file: Path) -> None:
    data = {"accounts": [{"id": "acc_1", "name": "A", "avatar": "🦊"}]}
    data_store.save_users(data)

    assert data_store.load_users() == data


def test_shorter_save_truncates_old_content(data_file: Path) -> None:
    data_store.save_users({"accounts": [{"id": f"acc_{i}", "name": "x" * 200} for i in range(20)]})
    data_store.save_users({"accounts": []})

    # A missing truncate would leave trailing bytes and make the file invalid JSON.
    assert json.loads(data_file.read_text()) == {"accounts": []}


def test_find_account() -> None:
    data = {"accounts": [{"id": "acc_1", "name": "A"}, {"id": "acc_2", "name": "B"}]}

    assert data_store.find_account(data, "acc_2") == {"id": "acc_2", "name": "B"}
    assert data_store.find_account(data, "missing") is None


def _increment_many(path: str, times: int) -> None:
    data_store.DATA_FILE = path
    for _ in range(times):
        with data_store.update_users() as data:
            data["accounts"][0]["count"] += 1


def test_concurrent_updates_are_not_lost(data_file: Path) -> None:
    # Two gunicorn workers write the same file. Each request is load -> modify -> save;
    # if the lock is not held across all three, one worker's save overwrites the other's.
    data_store.save_users({"accounts": [{"id": "acc_1", "name": "A", "count": 0}]})
    workers, times = 4, 50
    ctx = multiprocessing.get_context("fork")
    procs = [ctx.Process(target=_increment_many, args=(str(data_file), times)) for _ in range(workers)]
    for p in procs:
        p.start()
    for p in procs:
        p.join()
        assert p.exitcode == 0

    assert data_store.load_users()["accounts"][0]["count"] == workers * times
