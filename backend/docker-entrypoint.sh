#!/bin/sh
set -e

python setup_db.py

if [ ! -d "chroma_db" ] || [ -z "$(ls -A chroma_db 2>/dev/null)" ]; then
    cd rag
    python ingest_all.py
    cd ..
fi

exec "$@"
