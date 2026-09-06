# ============================================================
# app/services/sandbox_service.py
#
# ASSUMPTIONS (adjust to match your real codebase):
# - app.database has get_db() yielding a SQLAlchemy Session
# - app.models has Application, SandboxTrial, SandboxCheckEnum, SandboxVerdictEnum,
#   VerificationModeEnum
# - app.services.application_transitions has mark_application_not_selected
#   (per Doc A §3 — this is the shared Layer 1-4 function, owned by your
#   captain's side; you only ever CALL it, never write Application.status
#   directly)
# ============================================================

from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status as http_status

from app.models import (
    Application,
    SandboxTrial,
    SandboxCheckEnum,
    SandboxVerdictEnum,
    VerificationModeEnum,
    SelectionDecision,
)
from app.services.application_transitions import mark_application_not_selected
# NOTE: Doc A §3 defines this function's signature as
#   mark_application_not_selected(application_id: int, reason: str) -> None
# i.e. it takes NO db/session argument — it's described as an internal
# same-codebase call, so it must manage its own session/transaction.
# Confirm the real implementation with your captain before relying on this.


def _compute_verdict(trial: SandboxTrial) -> SandboxVerdictEnum:
    """
    Verdict rule (agreed with Nikhil):
    - Any of the four checks missing  -> inconclusive
    - Any of the four checks = fail   -> not_promising
    - All four checks = pass          -> promising
    """
    checks = [
        trial.functional_check,
        trial.directional_kpi_check,
        trial.operational_fit_check,
        trial.no_red_flags_check,
    ]

    if any(c is None for c in checks):
        return SandboxVerdictEnum.inconclusive

    if any(c == SandboxCheckEnum.fail for c in checks):
        return SandboxVerdictEnum.not_promising

    return SandboxVerdictEnum.promising


def create_sandbox_trial(
    db: Session,
    application_id: int,
    functional_check: SandboxCheckEnum,
    directional_kpi_check: SandboxCheckEnum,
    operational_fit_check: SandboxCheckEnum,
    no_red_flags_check: SandboxCheckEnum,
    verification_mode: VerificationModeEnum,
    verified_by: int,
    notes: str | None,
) -> SandboxTrial:
    application = db.query(Application).filter(
        Application.id == application_id
    ).first()

    if application is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    # Guard per Doc A / schema: sandbox trial only valid once selected,
    # and only one trial per application (unique application_id).
    if application.status != "selected":
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Application must be in 'selected' status, got '{application.status}'",
        )

    # Doc A §2, SelectionDecision table: "Sandbox trial start should not
    # precede this timestamp." status == "selected" implies a
    # SelectionDecision row exists (Layer 3 sets it on SelectionDecision,
    # post Decision-Readiness gate), but we check the row itself directly
    # rather than trusting status alone.
    selection_decision = db.query(SelectionDecision).filter(
        SelectionDecision.application_id == application_id
    ).first()

    if selection_decision is None or selection_decision.decided_at is None:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="No SelectionDecision found for this application — cannot start sandbox trial",
        )

    now = datetime.now(timezone.utc)
    if selection_decision.decided_at > now:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Sandbox trial cannot start before the SelectionDecision timestamp",
        )

    existing = db.query(SandboxTrial).filter(
        SandboxTrial.application_id == application_id
    ).first()
    if existing is not None:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Sandbox trial already exists for this application",
        )

    trial = SandboxTrial(
        application_id=application_id,
        functional_check=functional_check,
        directional_kpi_check=directional_kpi_check,
        operational_fit_check=operational_fit_check,
        no_red_flags_check=no_red_flags_check,
        verification_mode=verification_mode,
        verified_by=verified_by,
        notes=notes,
        # models.py: started_at has no server_default, so we must set it
        # explicitly here rather than relying on the DB.
        started_at=datetime.now(timezone.utc),
    )
    trial.verdict = _compute_verdict(trial)

    db.add(trial)
    db.commit()
    db.refresh(trial)

    _handle_verdict_side_effects(db, application, trial)

    return trial


def update_sandbox_trial(
    db: Session,
    application_id: int,
    trial_id: int,
    verdict_override: SandboxVerdictEnum | None,
    notes: str | None,
) -> SandboxTrial:
    trial = db.query(SandboxTrial).filter(
        SandboxTrial.id == trial_id,
        SandboxTrial.application_id == application_id,
    ).first()

    if trial is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Sandbox trial not found",
        )

    if notes is not None:
        trial.notes = notes

    # If evaluator explicitly overrides verdict, respect it (e.g. resolving
    # an inconclusive after a retry window). Otherwise recompute from checks.
    trial.verdict = verdict_override if verdict_override else _compute_verdict(trial)
    trial.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(trial)

    application = db.query(Application).filter(
        Application.id == application_id
    ).first()
    _handle_verdict_side_effects(db, application, trial)

    return trial


def _handle_verdict_side_effects(db: Session, application: Application, trial: SandboxTrial) -> None:
    """
    Not-promising is terminal: reject via the shared Layer 1-4 function.
    Promising / inconclusive: no Application.status change here — promising
    moves forward at contract-creation time (Stage B), inconclusive waits
    on the bounded retry window (still TBD — see Doc A §6 open items).
    """
    if trial.verdict == SandboxVerdictEnum.not_promising:
        # Doc A §3 exact signature — no db argument.
        mark_application_not_selected(
            application_id=application.id,
            reason="sandbox_not_promising",
        )


def get_sandbox_trial(db: Session, application_id: int) -> SandboxTrial:
    trial = db.query(SandboxTrial).filter(
        SandboxTrial.application_id == application_id
    ).first()

    if trial is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Sandbox trial not found for this application",
        )

    return trial