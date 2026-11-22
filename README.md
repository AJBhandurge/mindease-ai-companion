# MindEase

MindEase is an AI-powered mental wellness companion with a FastAPI backend and a
React Native app built with Expo. It offers text and voice conversations,
personalized companion characters, mood insights, journaling, habits, and goals.

> **Important:** MindEase is a learning and demonstration project, not a medical
> device or a substitute for professional mental health care. AI-generated
> responses can be inaccurate. If you are in immediate danger or experiencing a
> crisis, contact local emergency services or a qualified professional.

## Features

- Four selectable companions: Maya, Arjun, Zara, and Leo.
- AI chat powered by a local Ollama model.
- Emotion detection, conversation memory, and a mental-health information
  knowledge base.
- Optional speech-to-text and text-to-speech support.
- Wellness dashboard with mood history, journaling, habits, and goals.
- FastAPI endpoints for authentication, chat, analytics, wellness, and privacy.

## Technology

- **Backend:** Python 3.11, FastAPI, SQLAlchemy, SQLite, ChromaDB, Ollama
- **Mobile:** React Native, Expo, TypeScript
- **Speech and language:** Faster-Whisper, Transformers, optional Coqui XTTS

## Run locally

### Prerequisites

- Python 3.11
- Node.js 20 and npm
- [Ollama](https://ollama.com/download)
- Git

The backend downloads machine-learning models on first use, so initial startup
may take a while and require a network connection.

### 1. Start Ollama

Install Ollama, then download the default model:

```bash
ollama pull phi3
```

Leave Ollama running while you use MindEase.

### 2. Install and start the backend

From the project root:

```bash
cd backend
python -m venv .venv
```

Activate the environment:

```bash
# macOS/Linux
source .venv/bin/activate

# Windows PowerShell
.venv\Scripts\Activate.ps1
```

Install dependencies and configure the backend:

```bash
pip install -r requirements.txt
cp .env.example .env
```

On Windows Command Prompt, use `copy .env.example .env` instead of `cp`.
Before deploying anywhere beyond a local demo, replace the example `SECRET_KEY`
in `.env` with a strong, private value. Never commit `.env`.

Initialize the database and knowledge base, then start the API:

```bash
python setup_db.py
cd rag
python ingest_all.py
cd ..
python -m uvicorn app.main:app --reload --port 8000
```

The API is at <http://localhost:8000>; interactive API documentation is at
<http://localhost:8000/docs>. The health endpoint is
<http://localhost:8000/api/health>.

The database setup script creates a local demo account:

- Username: `demo`
- Password: `demo123`

Use that account only for local testing.

### 3. Install and start the mobile app

In another terminal, from the project root:

```bash
cd mobile
npm install
```

Set the backend URL before starting Expo. Replace the host with the computer's
LAN IP address when testing on a physical phone:

```bash
# macOS/Linux
EXPO_PUBLIC_API_URL=http://localhost:8000/api npx expo start

# Windows PowerShell
$env:EXPO_PUBLIC_API_URL="http://localhost:8000/api"; npx expo start
```

For an Android emulator, use `http://10.0.2.2:8000/api` instead of
`http://localhost:8000/api`. For a physical phone, use your computer's LAN IP,
for example `http://192.168.1.20:8000/api`, and ensure both devices are on the
same network. Open the project with Expo Go or an emulator.

## Run with Docker Compose

If Docker Compose is installed, run the services from the project root:

```bash
docker compose up --build
```

The first run builds the images and downloads the Ollama model. Once ready:

- Mobile web app: <http://localhost:8081>
- Backend API: <http://localhost:8000>
- API documentation: <http://localhost:8000/docs>

Stop the services with `docker compose down`. Docker Compose uses a
development-only secret and configuration; do not expose this setup publicly or
use it as-is in production.

## Project layout

```text
backend/
  ai/              Companion personalities, mood, expressions, and LLM service
  app/             FastAPI application, API routes, and core configuration
  emotion/         Emotion detection
  memory/          Conversation memory
  rag/             Knowledge-base retrieval and ingestion
  voice/           Speech-to-text and text-to-speech
  data/            Knowledge-base source content
mobile/
  src/screens/     Login, companion selection, chat, and dashboard
  src/services/    Backend API client
  src/store/       App state
docs/              Project documentation
docker-compose.yml Local multi-service setup
```

## Voice support

Speech-to-text uses Faster-Whisper. Spoken replies may use the configured
text-to-speech provider; Coqui XTTS is optional and has additional Python
version and setup requirements. Voice recordings and reference clips are local
assets and are excluded from Git. If you configure a companion voice, place
your own reference clip under `backend/voice/` as required by the voice service.

## Privacy and security

This project is intended for local development and demonstration. It stores
application data in a local SQLite database and may use local model indexes.
Review the configuration and API security before exposing it to a network, and
do not use real or sensitive personal information in a demo. Keep secrets in
your local `.env` file and out of source control.
