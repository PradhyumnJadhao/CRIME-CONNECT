import logging
from pathlib import Path
from typing import Tuple
from app.services.ocr_service import extract_text
from app.agents.extraction_agent import run_extraction_agent
from app.agents.graph_agent import insert_to_graph
from app.services.chroma_service import add_to_vector_store

logger = logging.getLogger(__name__)

class IngestionService:
    """Service for ingesting FIR documents using OCR.Space and PDF text extraction."""

    ALLOWED_EXTENSIONS = {".pdf", ".txt"}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

    @staticmethod
    def validate_file(file_path: str) -> Tuple[bool, str]:
        """Validate file format and size."""
        path = Path(file_path)
        if path.suffix.lower() not in IngestionService.ALLOWED_EXTENSIONS:
            return False, f"Invalid file type: {path.suffix}. Allowed: {IngestionService.ALLOWED_EXTENSIONS}"
        if not path.exists():
            return False, f"File not found: {file_path}"
        file_size = path.stat().st_size
        if file_size > IngestionService.MAX_FILE_SIZE:
            return False, f"File too large: {file_size} bytes. Max: {IngestionService.MAX_FILE_SIZE}"
        return True, "OK"

async def process_fir(file_path: str, case_id: str) -> dict:
    """
    Full FIR ingestion pipeline:
    File → Gemini OCR → Entity Extraction → Neo4j → ChromaDB
    """
    logger.info(f"[{case_id}] Pipeline started for: {file_path}")

    # ── Step 1: OCR Text Extraction ──────────────────────────────
    logger.info(f"[{case_id}] Step 1/4: Running Gemini 2.5 Flash OCR")
    raw_text = extract_text(file_path)

    if not raw_text or len(raw_text.strip()) < 20:
        raise ValueError(
            f"[{case_id}] OCR returned insufficient text "
            f"({len(raw_text)} chars). File may be blank or corrupted."
        )

    logger.info(f"[{case_id}] OCR success: {len(raw_text)} characters extracted")

    # ── Step 2: LLM Entity Extraction ───────────────────────────
    logger.info(f"[{case_id}] Step 2/4: Extracting entities via Groq Llama3")
    entities = await run_extraction_agent(raw_text)
    entity_count = sum(len(v) for v in entities.values() if isinstance(v, list))
    logger.info(f"[{case_id}] Entities found: {entity_count}")

    # ── Step 3: Neo4j Graph Storage ──────────────────────────────
    logger.info(f"[{case_id}] Step 3/4: Inserting into Neo4j graph")
    graph_success = await insert_to_graph(entities, case_id)
    
    if not graph_success:
        logger.error(f"[{case_id}] Neo4j insertion failed for all entities. Pipeline aborted.")
        raise RuntimeError("Failed to store extracted intelligence in graph database. Check Neo4j connectivity.")
        
    logger.info(f"[{case_id}] Graph insertion complete")

    # ── Step 4: ChromaDB Vector Storage ─────────────────────────
    logger.info(f"[{case_id}] Step 4/4: Storing in ChromaDB")
    chroma_success = await add_to_vector_store(raw_text, metadata={
        "case_id": case_id,
        "file_path": file_path,
        "entity_count": entity_count
    })
    
    if not chroma_success:
        logger.warning(f"[{case_id}] ChromaDB storage failed, but continuing as graph succeeded.")

    logger.info(f"[{case_id}] Pipeline complete")

    return {
        "case_id": case_id,
        "status": "completed",
        "characters_extracted": len(raw_text),
        "entity_count": entity_count,
        "message": "FIR processed successfully via Gemini 2.5 Flash OCR"
    }
