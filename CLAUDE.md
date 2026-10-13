# flash_facts

Math flashcard web app for kids. Python/Flask backend, vanilla JS frontend, Docker.

This repo is public. Deployment details for a specific install (hosts, SSH,
real account names) belong in the gitignored `CLAUDE.local.md`, never in
tracked files. Read it if present.

## Run
```
docker compose up -d --build   # http://localhost:8090
```
Docker rebuild always needed (`--build`) — frontend is baked into the image,
not volume-mounted.

## Test
```
.venv/bin/pytest                 # Python: API + data store
node --test tests/js/*.test.js   # JS: deck.js (loaded into a vm context, unmodified)
.venv/bin/pyright                # strict; must stay at 0 errors
```
Dev deps: `backend/requirements-dev.txt` (runtime deps stay in `requirements.txt` for Docker).
Writes to users.json go through `data_store.update_users()` (one lock across
read-modify-write); never pair `load_users()` with `save_users()` in a route.

## Accounts
Stored in `data/users.json` (gitignored, volume-mounted, persists across
rebuilds). On first run it is seeded from `data/users.example.json` (demo
players).

## Architecture
- `backend/app.py` — Flask app, serves frontend as static files
- `backend/routes/` — accounts, config, sessions (stats + draft)
- `backend/services/data_store.py` — JSON file storage with fcntl locking
- `frontend/` — 4 screens: index, config, session, stats
- `frontend/js/deck.js` — card generation + Fisher-Yates shuffle
- `frontend/js/session.js` — game loop, auto-saves draft every 10 correct answers
- `frontend/js/avatar.js` — shared avatar rendering used by index + session

## Key behaviors
- Wrong answers re-queue to end of deck; session ends when all answered correctly
- Auto-saves draft every 10 correct answers (protects against deploys mid-session)
- Save & Quit button saves full deck state; resume dialog appears on next Play
- Stats page tracks session history and per-fact problem areas
