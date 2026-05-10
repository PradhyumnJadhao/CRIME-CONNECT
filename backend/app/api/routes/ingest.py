import uuid
import shutil
import logging
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.pg_database import get_pg_db
from app.tasks.worker import process_fir_async

router = APIRouter(prefix="/api", tags=["ingest"])
logger = logging.getLogger(__name__)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE_MB = 20


@router.post("/ingest")
async def ingest_fir(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_pg_db)
):
    # ── Validate file extension ──────────────────────────────────
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{suffix}' not allowed. "
                   f"Supported: {sorted(ALLOWED_EXTENSIONS)}"
        )

    # ── Get DB user ──────────────────────────────────────────────
    from app.models.user import User
    from app.models.case import Case, CaseMember, Document
    
    db_user = db.query(User).filter(User.email == current_user["email"]).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # ── Generate a friendly Case ID ──────────────────────────────
    raw_id = str(uuid.uuid4())[:8]
    case_id = f"FIR-{raw_id}"
    safe_filename = f"{raw_id}_{file.filename}"
    save_path = UPLOAD_DIR / safe_filename

    # ── Save file ────────────────────────────────────────────────
    try:
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save uploaded file: {str(e)}"
        )

    # ── Validate file size ───────────────────────────────────────
    file_size_mb = save_path.stat().st_size / (1024 * 1024)
    if file_size_mb > MAX_FILE_SIZE_MB:
        save_path.unlink()
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({file_size_mb:.1f}MB). Max: {MAX_FILE_SIZE_MB}MB"
        )

    logger.info(f"File saved: {save_path} ({file_size_mb:.2f}MB)")

    # ── Create Case + CaseMember record in PostgreSQL ────────────
    try:
        new_case = Case(
            id=case_id,
            case_name=file.filename,
            created_by=db_user.id
        )
        db.add(new_case)
        db.flush()

        member = CaseMember(user_id=db_user.id, case_id=case_id, role="investigator")
        db.add(member)

        doc = Document(case_id=case_id, file_path=str(save_path))
        db.add(doc)

        db.commit()
        logger.info(f"Case {case_id} created in database for user {db_user.id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create case record: {str(e)}")
        # Don't abort – still try to process; case may partially exist

    # ── Dispatch background Celery task ──────────────────────────
    process_fir_async.delay(str(save_path), case_id, str(db_user.id))

    return {
        "case_id": case_id,
        "filename": file.filename,
        "file_size_mb": round(file_size_mb, 2),
        "status": "processing",
        "ocr_engine": "Google Gemini 2.5 Flash",
        "message": "File received. OCR and extraction running in background."
    }
