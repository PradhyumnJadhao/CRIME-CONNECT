"""
Celery Worker for Crime-Connect backend.
Handles async tasks like FIR processing and entity extraction.
"""

import logging
import asyncio
from celery import Celery
from celery.signals import worker_process_init
from app.core.config import settings
from app.services.ingestion_service import process_fir
from app.core.database import init_driver

logger = logging.getLogger(__name__)

# Initialize Celery app
redis_url = settings.redis_url
if redis_url.startswith("rediss://") and "ssl_cert_reqs" not in redis_url:
    if "?" in redis_url:
        redis_url += "&ssl_cert_reqs=none"
    else:
        redis_url += "?ssl_cert_reqs=none"

celery_app = Celery(
    app=settings.app_name,
    broker=redis_url,
    backend=redis_url,
)

@worker_process_init.connect
def init_worker(**kwargs):
    """
    Initialize connections and preload models for the worker process.
    """
    # 1. Initialize Neo4j Driver
    try:
        init_driver()
        logger.info("Neo4j driver initialized in worker process")
    except Exception as e:
        logger.error(f"CRITICAL: Failed to initialize Neo4j driver in worker: {e}")

    # 2. Preload Embedding Model to avoid re-downloading/slow first start
    try:
        logger.info("Preloading embedding model (all-MiniLM-L6-v2)...")
        # pyrefly: ignore [missing-import]
        from sentence_transformers import SentenceTransformer
        # This will download/load the model into memory
        SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("Embedding model preloaded successfully")
    except Exception as e:
        logger.warning(f"Failed to preload embedding model: {e}")


# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minute hard limit
    task_soft_time_limit=25 * 60,  # 25 minute soft limit
    broker_connection_retry_on_startup=True,
)


import requests

def notify_ws(user_id: str, message: str):
    try:
        requests.post(
            "http://localhost:8000/api/internal/ws_notify",
            json={"user_id": user_id, "text": message},
            timeout=2
        )
    except Exception as e:
        logger.error(f"WebSocket notification failed: {e}")

@celery_app.task(bind=True, name="process_fir_async")
def process_fir_async(self, file_path: str, case_id: str, user_id: str = None) -> dict:
    """
    Background task to process FIR file end-to-end using Gemini OCR.
    """
    try:
        logger.info(f"Starting FIR processing for case {case_id}: {file_path}")
        self.update_state(state="PROGRESS", meta={"stage": "processing", "progress": 20})
        if user_id:
            notify_ws(user_id, "Processing started. OCR and Intelligence extraction running...")

        # Run the async ingestion process
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(process_fir(file_path, case_id))
            loop.close()
        except Exception as e:
            if loop.is_running():
                loop.close()
            logger.error(f"Ingestion process failed: {str(e)}")
            if user_id:
                notify_ws(user_id, f"Error: {str(e)}")
            return {
                "status": "FAILED",
                "case_id": case_id,
                "error": str(e),
            }

        self.update_state(state="PROGRESS", meta={"stage": "completed", "progress": 100})
        if user_id:
            notify_ws(user_id, f"Investigation ready for Case {case_id}. {result.get('entity_count', 0)} entities extracted.")

        return {
            "status": "SUCCESS",
            "case_id": case_id,
            "entity_count": result.get("entity_count", 0),
            "ocr_engine": "Gemini 2.5 Flash"
        }

    except Exception as e:
        logger.error(f"Unexpected error in FIR processing: {str(e)}")
        self.update_state(state="FAILURE", meta={"error": str(e)})
        if user_id:
            notify_ws(user_id, f"Unexpected error: {str(e)}")
        return {
            "status": "FAILED",
            "case_id": case_id,
            "error": str(e),
        }


@celery_app.task(name="test_task")
def test_task() -> dict:
    """Test task to verify Celery worker is running."""
    logger.info("Test task executed")
    return {"status": "OK", "message": "Celery worker is running"}
