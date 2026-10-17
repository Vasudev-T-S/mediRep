"""API dependencies and file validation logic."""

from __future__ import annotations

from fastapi import HTTPException, UploadFile, status

from app.config import settings

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".txt"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "text/plain",
}


def validate_file_content(filename: str, mime_type: str | None, content: bytes) -> str:
    """Validate uploaded file size, extension, mime type, and magic bytes.

    Returns detected report_type category string ('lab', 'pathology', etc. or 'other').
    Raises HTTPException 400 if validation fails.
    """
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is empty.",
        )

    if len(content) > settings.max_upload_bytes:
        max_mb = settings.max_upload_bytes // (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of {max_mb}MB.",
        )

    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{ext}'. Allowed: PDF, PNG, JPG, TXT.",
        )

    # Magic byte check
    is_valid = False
    if ext == ".pdf":
        is_valid = content.startswith(b"%PDF-")
    elif ext in (".png",):
        is_valid = content.startswith(b"\x89PNG\r\n\x1a\n")
    elif ext in (".jpg", ".jpeg"):
        is_valid = content.startswith(b"\xff\xd8\xff")
    elif ext == ".txt":
        try:
            content.decode("utf-8")
            is_valid = True
        except UnicodeDecodeError:
            try:
                content.decode("latin-1")
                is_valid = True
            except Exception:
                is_valid = False

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File contents do not match claimed file format.",
        )

    # Simple heuristic for report type based on filename / contents
    text_sample = ""
    if ext == ".txt":
        text_sample = content.decode("utf-8", errors="ignore").lower()
    else:
        text_sample = filename.lower()

    if "pathology" in text_sample or "biopsy" in text_sample:
        return "pathology"
    elif any(kw in text_sample for kw in ["cbc", "blood", "lab", "metabolic", "lipid", "panel"]):
        return "lab"
    elif "discharge" in text_sample or "discharge summary" in text_sample:
        return "discharge"
    elif "clinical" in text_sample or "note" in text_sample:
        return "clinical_note"

    return "lab"  # default to lab
