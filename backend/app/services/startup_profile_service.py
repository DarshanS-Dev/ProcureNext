"""
app/services/startup_profile_service.py

Layer 1 — StartupProfile (Doc B Layer 1, PRD §5.1/§5.2/§16).

Owns everything StartupProfile-related that auth_service.py doesn't:
auth_service only creates the empty row at registration. This file owns
reading/updating it (Level 1 + Level 2), the merged User+Profile view for
non-owner viewers, the one-time Admin compliance-verification pass, and
the admin unverified-startups filter.

Judgment calls flagged inline (no schema/PRD line to point to):

1. Level 1 / Level 2 PATCH semantics: partial-overwrite, field-by-field —
   only fields present (non-None) in the update payload are written;
   omitted fields are left untouched. Mirrors
   problem_statement_service.update_problem_statement's pattern. Doc B
   doesn't say whether these PATCHes are partial or full-replace, but
   every field on `StartupProfileLevel1Update`/`Level2Update` is Optional
   in core_schemas.py, which only makes sense under partial-overwrite
   semantics (a full-replace PATCH wouldn't need Optional fields — it'd
   just be a plain schema with required fields for that level's set).

2. `get_profile_merged` (backing both `GET /startup/profile` self-view and
   `GET /startup/profile/{user_id}` other-role view) returns the FULL
   merged shape to every permitted caller — no per-role field filtering
   (e.g. evaluators seeing funding_band before QCBS/risk stage should
   ideally be masked, per core_schemas.py's own flagged judgment call on
   StartupProfileMergedRead). Not solved here; carrying the same flag
   forward since nothing since core_schemas.py was written has resolved
   it. If per-role field masking is wanted, this is the function to add
   it to.

3. `verify_compliance` sets `dpiit_status`/`entity_verified`/
   `pan_verified`/`gst_verified` from the admin's submitted
   ComplianceVerificationRequest values directly — no independent
   verification logic exists (§5.1: no public DPIIT/NSWS API, this is a
   manual attestation by the Admin after their own out-of-band lookup).
   Re-running verification on an already-verified startup is ALLOWED
   (overwrites the prior snapshot + timestamp) rather than blocked —
   Doc B doesn't model verification as strictly one-shot-forever, and an
   Admin correcting a mistaken earlier pass seems more useful than a hard
   lock. If startups are meant to be locked after first verification,
   flag it and this is the one guard to add.

4. `list_unverified_startups` filters on `dpiit_status == unverified`
   specifically (matching the querystring literal in Doc D:
   `GET /admin/startups?compliance_status=unverified`), NOT on
   `compliance_verified_at IS NULL`. These two are expected to move
   together in practice (verify_compliance sets both at once), but
   dpiit_status is the field the endpoint's own querystring name refers
   to, so it's the one being matched against literally.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models import DpiitStatusEnum, StartupProfile, User
from app.services.audit_log_service import write_audit_log


# ============================================================
# Errors
# ============================================================

class StartupProfileServiceError(Exception):
    """Base error for startup_profile_service — routers translate to HTTP."""


class ProfileNotFoundError(StartupProfileServiceError):
    pass


# ============================================================
# Reads
# ============================================================

def get_own_profile(db: Session, user_id: int) -> StartupProfile:
    """GET /startup/profile — startup, self. Returns the raw StartupProfile row."""
    profile = db.query(StartupProfile).filter(StartupProfile.user_id == user_id).first()
    if profile is None:
        raise ProfileNotFoundError(f"No StartupProfile found for user_id={user_id}")
    return profile


def get_profile_merged(db: Session, user_id: int) -> dict:
    """
    GET /startup/profile/{user_id} — officer/evaluator/independent_evaluator/
    admin view, AND backs the self-view shape too (StartupProfileMergedRead
    merges User + StartupProfile fields — see judgment call #2 re: no
    per-role field masking applied here).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise ProfileNotFoundError(f"No User found for user_id={user_id}")

    profile = db.query(StartupProfile).filter(StartupProfile.user_id == user_id).first()
    if profile is None:
        raise ProfileNotFoundError(f"No StartupProfile found for user_id={user_id}")

    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "created_at": user.created_at,
        "entity_type": profile.entity_type,
        "dpiit_number": profile.dpiit_number,
        "pan": profile.pan,
        "gst": profile.gst,
        "address": profile.address,
        "website": profile.website,
        "stage": profile.stage,
        "sector_tags": profile.sector_tags,
        "team_headcount": profile.team_headcount,
        "tech_stack": profile.tech_stack,
        "trl_stage": profile.trl_stage,
        "architecture": profile.architecture,
        "api_available": profile.api_available,
        "past_deployments": profile.past_deployments,
        "funding_band": profile.funding_band,
        "description": profile.description,
        "dpiit_status": profile.dpiit_status,
        "entity_verified": profile.entity_verified,
        "pan_verified": profile.pan_verified,
        "gst_verified": profile.gst_verified,
        "compliance_verified_at": profile.compliance_verified_at,
        "compliance_verified_by": profile.compliance_verified_by,
    }


def list_unverified_startups(db: Session) -> list[StartupProfile]:
    """GET /admin/startups?compliance_status=unverified — admin only.
    Filters on dpiit_status == unverified (judgment call #4)."""
    return (
        db.query(StartupProfile)
        .filter(StartupProfile.dpiit_status == DpiitStatusEnum.unverified)
        .all()
    )


# ============================================================
# Level 1 / Level 2 updates (startup, self)
# ============================================================

def update_level1(db: Session, user_id: int, updates: dict) -> StartupProfile:
    """PATCH /startup/profile/level1 — startup, self. Partial-overwrite
    (judgment call #1) — only non-None fields in `updates` are written."""
    profile = get_own_profile(db, user_id)

    applied = {}
    for field, value in updates.items():
        if value is not None:
            setattr(profile, field, value)
            applied[field] = value

    write_audit_log(
        db,
        actor_id=user_id,
        action="startup_profile_level1_updated",
        entity_type="StartupProfile",
        entity_id=profile.user_id,
        metadata={"updated_fields": list(applied.keys())},
    )

    db.commit()
    db.refresh(profile)
    return profile


def update_level2(db: Session, user_id: int, updates: dict) -> StartupProfile:
    """PATCH /startup/profile/level2 — startup, self. Partial-overwrite
    (judgment call #1) — only non-None fields in `updates` are written."""
    profile = get_own_profile(db, user_id)

    applied = {}
    for field, value in updates.items():
        if value is not None:
            setattr(profile, field, value)
            applied[field] = value

    write_audit_log(
        db,
        actor_id=user_id,
        action="startup_profile_level2_updated",
        entity_type="StartupProfile",
        entity_id=profile.user_id,
        metadata={"updated_fields": list(applied.keys())},
    )

    db.commit()
    db.refresh(profile)
    return profile


# ============================================================
# Compliance verification (Admin, single pass — PRD §5.1)
# ============================================================

def verify_compliance(
    db: Session,
    user_id: int,
    admin_id: int,
    dpiit_status: DpiitStatusEnum,
    entity_verified: bool,
    pan_verified: bool,
    gst_verified: bool,
) -> StartupProfile:
    """
    POST /admin/startups/{user_id}/verify-compliance — admin only.

    Single pass, all four fields submitted together (§5.1). Sets
    compliance_verified_at/compliance_verified_by. Re-verification of an
    already-verified startup is allowed, overwriting the prior snapshot
    (judgment call #3) — not a hard one-shot lock.
    """
    profile = get_own_profile(db, user_id)

    profile.dpiit_status = dpiit_status
    profile.entity_verified = entity_verified
    profile.pan_verified = pan_verified
    profile.gst_verified = gst_verified
    profile.compliance_verified_at = datetime.now(timezone.utc)
    profile.compliance_verified_by = admin_id

    write_audit_log(
        db,
        actor_id=admin_id,
        action="startup_compliance_verified",
        entity_type="StartupProfile",
        entity_id=profile.user_id,
        metadata={
            "dpiit_status": dpiit_status.value,
            "entity_verified": entity_verified,
            "pan_verified": pan_verified,
            "gst_verified": gst_verified,
        },
    )

    db.commit()
    db.refresh(profile)
    return profile