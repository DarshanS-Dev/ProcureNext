"""
app/services/pilot_outcome_service.py
Layer 5, Stage E — PilotOutcome.

Doc C Stage E decisions followed:
- #1: Created once all KPIVerdict rows exist for the Contract's PS-defined KPIs.
- #2: Officer decides overall_result (scale/iterate/stop) + rationale —
      human decision per §13/§14; system only surfaces verified KPI results.
- #3: Creating this row calls mark_application_completed(application_id)
      REGARDLESS of verdict — "completed" means the pipeline concluded,
      not that it succeeded.
"""

from fastapi import HTTPException, status as http_status
from sqlalchemy.orm import Session

from app.models import (
    Application,
    ApplicationStatusEnum,
    Contract,
    PilotOutcome,
    PilotOutcomeResultEnum,
)
from app.services.kpi_service import all_kpi_verdicts_present
from app.services.application_service import mark_application_completed
# NOTE: same shape as mark_application_not_selected (Doc A §3) — no db/session
# argument, described as an internal same-codebase call that manages its own
# transaction. Confirmed against sandbox_service.py's existing usage.


def _get_contract_or_404(db: Session, contract_id: int) -> Contract:
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if contract is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Contract not found",
        )
    return contract


def _get_application_for_contract(db: Session, contract: Contract) -> Application:
    application = db.query(Application).filter(
        Application.id == contract.application_id
    ).first()
    if application is None:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Contract references a missing application",
        )
    return application


def create_pilot_outcome(
    db: Session,
    contract_id: int,
    overall_result: PilotOutcomeResultEnum,
    rationale: str | None,
    decided_by: int,
) -> PilotOutcome:
    contract = _get_contract_or_404(db, contract_id)
    application = _get_application_for_contract(db, contract)

    # Guard: only one PilotOutcome per contract. The model already enforces
    # this with unique=True on contract_id, but checking first gives a clean
    # 400 instead of surfacing a raw IntegrityError to the caller.
    existing = db.query(PilotOutcome).filter(
        PilotOutcome.contract_id == contract_id
    ).first()
    if existing is not None:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="A pilot outcome already exists for this contract",
        )

    # Guard: the only legal predecessor state for completed is contracted
    # (Doc A §4 transition table — completed is Layer-5-only, reached from
    # contracted via mark_application_completed). Blocks decisions being
    # recorded twice or before a contract's pipeline has actually started.
    if application.status != ApplicationStatusEnum.contracted:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=(
                "Application must be in 'contracted' status to record a "
                f"pilot outcome, got '{application.status}'"
            ),
        )

    # Guard: Doc C Stage E #1 — all declared KPIs must have a verdict first.
    if not all_kpi_verdicts_present(db, contract_id):
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="All KPI verdicts must be recorded before a pilot outcome can be decided",
        )

    outcome = PilotOutcome(
        contract_id=contract_id,
        overall_result=overall_result,
        rationale=rationale,
        decided_by=decided_by,
    )
    db.add(outcome)
    db.commit()
    db.refresh(outcome)

    # Doc C Stage E #3 — fires regardless of scale/iterate/stop.
    mark_application_completed(application_id=application.id)

    # TODO(AuditLog): Doc A §5 lists `pilot_outcome_decided` as a Layer 5
    # domain event. Not written here yet — logging pattern is still open
    # in Doc B ("AuditLog — Cross-Cutting, NOT STARTED"). ComplianceRecord
    # snapshot compilation will want this once it's decided.

    return outcome


def get_pilot_outcome(
    db: Session,
    contract_id: int,
    requesting_user=None,
) -> PilotOutcome:
    """
    `requesting_user` optional for backward compatibility, but the router
    should always pass it — Doc D scopes this to
    officer/independent_evaluator/admin/startup-OWN.
    """
    contract = _get_contract_or_404(db, contract_id)

    outcome = db.query(PilotOutcome).filter(
        PilotOutcome.contract_id == contract_id
    ).first()
    if outcome is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Pilot outcome not found for this contract",
        )

    if requesting_user is not None and requesting_user.role == "startup":
        application = _get_application_for_contract(db, contract)
        if application.startup_id != requesting_user.id:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="You may only view the pilot outcome for your own contracts",
            )

    return outcome