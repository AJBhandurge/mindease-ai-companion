"""
MINDEASE FASTAPI APPLICATION — Main Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import logging
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import create_tables
from app.api import auth, chat, analytics, wellness, privacy

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("mindease")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"MindEase v{settings.APP_VERSION} starting up...")
    create_tables()
    logger.info("Database tables ready")

    try:
        from emotion.detector import get_detector
        get_detector()
        logger.info("Emotion model loaded")
    except Exception as e:
        logger.warning(f"Emotion model failed to load: {e}")

    try:
        from memory.engine import get_memory_engine
        get_memory_engine()
        logger.info("Memory engine ready")
    except Exception as e:
        logger.warning(f"Memory engine failed: {e}")

    try:
        from rag.engine import get_rag_engine
        get_rag_engine()
        logger.info("RAG engine ready")
    except Exception as e:
        logger.warning(f"RAG engine failed: {e}")

    logger.info("MindEase is ready!")
    yield
    logger.info("MindEase shutting down...")


app = FastAPI(
    title="MindEase API",
    description="AI-Powered Mental Health Companion",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(analytics.router)
app.include_router(wellness.router)
app.include_router(privacy.router)


@app.get("/api/health")
def health():
    return {"status": "operational", "version": settings.APP_VERSION, "app": settings.APP_NAME}


@app.get("/")
def root():
    return {"message": "MindEase API is running. Visit /docs for API reference."}
