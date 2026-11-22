#!/bin/bash
# ========================================
# MINDEASE STARTUP SCRIPT
# Run this once to set up everything.
# ========================================
set -e

echo "========================================"
echo " MindEase Setup"
echo "========================================"

echo "-> Checking Ollama..."
if ! command -v ollama &> /dev/null; then
    echo "Ollama not found. Install from: https://ollama.ai/download"
    exit 1
fi
echo "Ollama found"

echo "-> Pulling AI models (first time only)..."
ollama pull phi3 || true
echo "LLM model ready"

echo "-> Setting up Python environment..."
if [ ! -d "venv" ]; then
    python -m venv venv
fi
source venv/bin/activate

echo "-> Installing Python packages..."
pip install -q -r requirements.txt
echo "Packages installed"

echo "-> Creating database..."
python setup_db.py
echo "Database ready"

echo "-> Ingesting RAG knowledge base..."
cd rag && python ingest_all.py && cd ..
echo "RAG ready"

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo ".env created"
fi

echo ""
echo "========================================"
echo " Setup complete!"
echo "========================================"
echo ""
echo " Starting MindEase API server..."
echo " Docs: http://localhost:8000/docs"
echo ""

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
