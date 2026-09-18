"""
app/services/supabase_storage_service.py

Thin adapter over Supabase Storage — mirrors matching_service.py's role as
an isolated wrapper around an external dependency. Routers/other services
never call the Supabase SDK directly; everything goes through here.
"""

import uuid
from typing import BinaryIO

from supabase import create_client, Client

from app.config import settings

_BUCKET = "evidence-uploads"  # private bucket

_client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


class StorageServiceError(Exception):
    """Base error — routers translate to HTTP."""


class UploadFailedError(StorageServiceError):
    pass


class SignedUrlFailedError(StorageServiceError):
    pass


def upload_file(file_obj: BinaryIO, original_filename: str, uploaded_by: int) -> str:
    """
    Uploads to the private bucket under a namespaced, non-guessable key —
    NEVER the original filename alone (avoids collisions + path-based
    guessing since the bucket is private but paths could otherwise be
    predictable per-user). Returns the storage path to persist in
    ChecklistItem.file_reference / Evidence.file_reference.
    """
    ext = original_filename.rsplit(".", 1)[-1] if "." in original_filename else "bin"
    storage_path = f"{uploaded_by}/{uuid.uuid4().hex}.{ext}"

    try:
        _client.storage.from_(_BUCKET).upload(
            storage_path,
            file_obj.read(),
            file_options={"content-type": "application/octet-stream"},
        )
    except Exception as exc:
        raise UploadFailedError(f"Failed to upload file: {exc}") from exc

    return storage_path


def get_signed_url(storage_path: str, expires_in: int = 300) -> str:
    """Short-lived signed URL (default 5 min) — never a permanent public link,
    matches the bucket being private."""
    try:
        result = _client.storage.from_(_BUCKET).create_signed_url(storage_path, expires_in)
        return result["signedURL"]
    except Exception as exc:
        raise SignedUrlFailedError(f"Failed to generate signed URL for {storage_path!r}: {exc}") from exc