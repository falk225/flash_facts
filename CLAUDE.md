# flash_facts

Math flashcard web app for kids. Python/Flask backend, vanilla JS frontend, Docker on Synology NAS.

## Live deployment
- URL: http://nas.local:8090
- NAS path: /srv/docker/flash_facts
- SSH alias: `ssh nas` (key at ~/.ssh/deploy_key, port 22)

## Deploy
```
tar czf - --exclude='__pycache__' --exclude='.git' -C ~/projects flash_facts | ssh -i ~/.ssh/deploy_key -p 22 user@nas.local "tar xzf - -C /srv/docker"
ssh nas "cd /srv/docker/flash_facts && sudo /usr/local/bin/docker compose up -d --build"
```

## Accounts
Player1 🦝 · Player2 🐒 · Player3 🐢 · Player4 🐕 · Player5 🐆
Configured in data/users.json (volume-mounted on NAS, persists across rebuilds).

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
- rsync doesn't work to NAS (permission issue); use tar-over-SSH instead
- Docker rebuild always needed (`--build`) — frontend is baked into image, not volume-mounted
