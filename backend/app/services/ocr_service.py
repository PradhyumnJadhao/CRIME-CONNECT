import io
import time
import logging
from pathlib import Path

import fitz  # PyMuPDF
import google.generativeai as genai
import google.api_core.exceptions as gexc
from PIL import Image

from app.core.config import settings

logger = logging.getLogger(__name__)

# ─── Gemini Client Setup ───────────────────────────────────────
genai.configure(api_key=settings.gemini_api_key)
model = genai.GenerativeModel(settings.gemini_model)

# ─── OCR Prompt ────────────────────────────────────────────────
OCR_PROMPT = """
You are a forensic document OCR engine for Indian police FIR documents.

Your only job is to extract ALL text from this document image exactly
as it appears. Follow these rules strictly:

1. Preserve all paragraph breaks and line structure
2. Extract text in any language present (English, Hindi, Marathi, etc.)
3. Include all numbers, dates, names, addresses exactly as written
4. Do NOT summarize, translate, interpret, or add commentary
5. Do NOT add headers or labels like "Extracted text:"
6. Return ONLY the raw extracted text — nothing else

If the image is blank or unreadable, return exactly: [UNREADABLE PAGE]
"""

# ─── Core OCR Functions ────────────────────────────────────────

def _image_to_bytes(image: Image.Image) -> bytes:
    """Convert PIL Image to PNG bytes for Gemini."""
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _call_gemini_with_retry(image: Image.Image, page_num: int = 1) -> str:
    """
    Send image to Gemini 2.5 Flash for OCR.
    Retries once on rate limit with 60 second wait.
    """
    img_bytes = _image_to_bytes(image)
    image_part = {
        "mime_type": "image/png",
        "data": img_bytes
    }

    try:
        response = model.generate_content([OCR_PROMPT, image_part])
        text = response.text.strip()
        logger.info(f"Page {page_num}: extracted {len(text)} characters")
        return text

    except gexc.ResourceExhausted:
        logger.warning("Gemini rate limit hit. Waiting 60 seconds then retrying...")
        time.sleep(60)
        response = model.generate_content([OCR_PROMPT, image_part])
        return response.text.strip()

    except gexc.InvalidArgument as e:
        logger.error(f"Invalid image format on page {page_num}: {e}")
        raise ValueError(f"Invalid image sent to Gemini on page {page_num}: {e}")

    except gexc.PermissionDenied:
        raise RuntimeError(
            "Gemini API key is invalid or has no permission. "
            "Check GEMINI_API_KEY in your .env file."
        )

    except Exception as e:
        logger.error(f"Gemini OCR failed on page {page_num}: {e}")
        raise RuntimeError(f"Gemini OCR error on page {page_num}: {e}")


def _pdf_to_images(pdf_path: str) -> list[Image.Image]:
    """
    Convert each PDF page to a PIL Image using PyMuPDF.
    Uses 2x zoom for 144 DPI — good balance of quality vs speed.
    """
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        raise ValueError(f"Cannot open PDF file: {e}")

    images = []
    zoom_matrix = fitz.Matrix(2.0, 2.0)

    for page_index in range(len(doc)):
        page = doc[page_index]
        pixmap = page.get_pixmap(matrix=zoom_matrix)
        image = Image.frombytes(
            "RGB",
            [pixmap.width, pixmap.height],
            pixmap.samples
        )
        images.append(image)

    doc.close()
    logger.info(f"PDF converted: {len(images)} pages from {pdf_path}")
    return images


from concurrent.futures import ThreadPoolExecutor

# ─── Public Interface ──────────────────────────────────────────

def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Fast PDF extraction pipeline:
    1. Try direct text extraction (PyMuPDF)
    2. If text is too sparse, run Gemini OCR on all pages in parallel using 15 RPM limit safety.
    """
    logger.info(f"Starting extraction for PDF: {pdf_path}")

    # ── Step A: Try direct text extraction ──
    try:
        doc = fitz.open(pdf_path)
        direct_text = []
        for page_num, page in enumerate(doc):
            text = page.get_text().strip()
            if text:
                direct_text.append(f"[PAGE {page_num+1}]\n{text}")
        
        full_direct_text = "\n\n".join(direct_text)
        
        # If we got substantial text (>200 chars), assume it's a digital PDF & skip OCR
        if len(full_direct_text.strip()) > 200:
            logger.info(f"Extracted {len(full_direct_text)} characters via PyMuPDF. Skipping Gemini OCR.")
            doc.close()
            return full_direct_text
        doc.close()
    except Exception as e:
        logger.warning(f"PyMuPDF direct extraction failed: {e}. Falling back to OCR.")

    # ── Step B: Fallback to Gemini OCR in parallel ──
    logger.info("Digital text extraction insufficient. Initializing Gemini OCR...")
    images = _pdf_to_images(pdf_path)

    if not images:
        raise ValueError("PDF has no readable pages")

    def ocr_page_task(args):
        idx, img = args
        page_num = idx + 1
        
        # Rate limit safety for Gemini (Free Tier: 15 Requests Per Minute)
        # We introduce a staggered start to avoid hitting the API too fast
        # Max workers 3 + 2s stagger = ~12 RPM max
        if idx > 0:
            time.sleep(idx * 2) 
            
        logger.info(f"OCR thread starting for Page {page_num}")
        page_text = _call_gemini_with_retry(img, page_num=page_num)
        return f"[PAGE {page_num}]\n{page_text}"

    # Use ThreadPoolExecutor for parallel processing
    # limit workers to prevent overwhelming the local machine/API
    with ThreadPoolExecutor(max_workers=3) as executor:
        results = list(executor.map(ocr_page_task, enumerate(images)))

    full_text = "\n\n".join(results)
    logger.info(f"Parallel OCR complete. Total characters: {len(full_text)}")
    return full_text


def extract_text_from_image_file(image_path: str) -> str:
    """OCR a single image file (PNG, JPG, JPEG, TIFF, WEBP, BMP)."""
    logger.info(f"Starting image OCR: {image_path}")

    try:
        image = Image.open(image_path).convert("RGB")
    except Exception as e:
        raise ValueError(f"Cannot open image file: {e}")

    text = _call_gemini_with_retry(image, page_num=1)
    logger.info(f"Image OCR complete. Characters: {len(text)}")
    return text


def extract_text_from_txt(txt_path: str) -> str:
    """Read plain text files directly — no OCR needed."""
    try:
        with open(txt_path, "r", encoding="utf-8") as f:
            return f.read()
    except UnicodeDecodeError:
        with open(txt_path, "r", encoding="latin-1") as f:
            return f.read()


def extract_text(file_path: str) -> str:
    """
    MAIN ENTRY POINT for all OCR operations.

    Automatically detects file type and routes to correct handler.
    Supported: .pdf, .txt, .png, .jpg, .jpeg, .tiff, .bmp, .webp

    Args:
        file_path: absolute or relative path to the uploaded file

    Returns:
        Extracted text as a single string

    Raises:
        FileNotFoundError: if file does not exist
        ValueError: if file type is unsupported or file is unreadable
        RuntimeError: if Gemini API call fails
    """
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    if path.stat().st_size == 0:
        raise ValueError(f"File is empty: {file_path}")

    suffix = path.suffix.lower()

    if suffix == ".pdf":
        return extract_text_from_pdf(file_path)

    elif suffix == ".txt":
        return extract_text_from_txt(file_path)

    elif suffix in {".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"}:
        return extract_text_from_image_file(file_path)

    else:
        raise ValueError(
            f"Unsupported file type '{suffix}'. "
            f"Supported: .pdf, .txt, .png, .jpg, .jpeg, .tiff, .bmp, .webp"
        )
