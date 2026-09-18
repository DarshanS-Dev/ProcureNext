"""
app/routers/uploads.py

File upload and evidence signed-URL endpoints.

Flow:

UPLOAD
-------
Frontend
    ↓
POST /uploads
    ↓
Supabase Storage
    ↓
storage_path returned
    ↓
Frontend passes storage_path to
POST /contracts/{contract_id}/milestones/{milestone_id}/evidence
    ↓
PostgreSQL Evidence.file_reference


VIEW / DOWNLOAD
---------------
Frontend
    ↓
GET /uploads/evidence/{evidence_id}/signed-url
    ↓
PostgreSQL
    ↓
Evidence.file_reference
    ↓
Supabase Storage
    ↓
Temporary signed URL
    ↓
Frontend opens/downloads file
"""

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models import Evidence, User
from app.services import supabase_storage_service


router = APIRouter(tags=["Uploads"])


# ---------------------------------------------------------------------------
# POST /uploads
# ---------------------------------------------------------------------------
# Upload file to Supabase Storage.
#
# This endpoint ONLY uploads the file.
# It does NOT create an Evidence row.
# ---------------------------------------------------------------------------

@router.post("/uploads")
def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    storage_path = supabase_storage_service.upload_file(
        file_obj=file.file,
        original_filename=file.filename,
        uploaded_by=current_user.id,
    )

    return {
        "storage_path": storage_path
    }


# ---------------------------------------------------------------------------
# GET /uploads/evidence/{evidence_id}/signed-url
# ---------------------------------------------------------------------------
# Get the file belonging to an Evidence row.
#
# 1. Find Evidence using evidence_id
# 2. Read Evidence.file_reference
# 3. Generate signed URL from Supabase Storage
# 4. Return signed URL to frontend
# ---------------------------------------------------------------------------

@router.get("/uploads/evidence/{evidence_id}/signed-url")
def get_evidence_signed_url(
    evidence_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 1. Find the Evidence row
    evidence = (
        db.query(Evidence)
        .filter(Evidence.id == evidence_id)
        .first()
    )

    if evidence is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found",
        )

    # 2. Get the storage path from PostgreSQL
    storage_path = evidence.file_reference

    if not storage_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No file attached to this evidence",
        )

    # 3. Generate temporary signed URL
    signed_url = supabase_storage_service.get_signed_url(
        storage_path
    )

    # 4. Return URL to frontend
    return {
        "evidence_id": evidence.id,
        "signed_url": signed_url,
    }