# MindEase Docker deployment

## Files to transfer

Transfer the complete `mindease_final/` folder, except:

- `mobile/node_modules/`
- `mobile/.expo/`
- `backend/venv/`
- `backend/venv_broken_old/`
- `backend/__pycache__/`
- `backend/**/*.pyc`
- local ZIP/archive files

Keep these files and folders because they contain project state or required content:

- `backend/app/`, `backend/ai/`, `backend/emotion/`, `backend/memory/`, `backend/rag/`
- `backend/data/`
- `backend/requirements.txt`
- `backend/mindease.db`
- `backend/chroma_db/`
- `mobile/src/`, `mobile/package.json`, `mobile/package-lock.json`, `mobile/App.tsx`
- `docker-compose.yml`
- both Dockerfiles

Do not copy `.env` or secrets. The Compose file supplies container configuration.

## Run on the new PC

1. Install Docker Desktop and enable WSL 2.
2. Copy `mindease_final/`.
3. Open PowerShell in `mindease_final/`.
4. Run:

```powershell
docker compose up --build
```

The services are:

- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs
- Mobile web app: http://localhost:8081
- Ollama API: http://localhost:11434

The first build and model download take time. Demo login is `demo` / `demo123`.

Stop the containers:

```powershell
docker compose down
```

Keep data while rebuilding:

```powershell
docker compose down
docker compose up --build
```

Remove all project data volumes:

```powershell
docker compose down -v
```
