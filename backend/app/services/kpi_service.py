"""
app/services/kpi_service.py
Layer 5, Stage D — KPIVerdict submission and retrieval.

SCOPE NOTE:
KPI *creation* is Layer 2 (Darshan). Doc C Stage D #1 labels it a Layer 2
gap-fix; Doc D lists POST/GET /problem-statements/{id}/kpis under the
Problem Statements section. Layer 5 only ever READS the KPI table.

Doc C Stage D decisions followed:
- #2: Independent evaluator submits one KPIVerdict per KPI per Contract.
- #3: Pilot success = ALL verdicts = met — computed at query time, never stored.
- KPIVerdict has NO foreign key to PilotMilestone — completely independent.
"""

from typing import List

from fastapi import HTTPException, status as http_status
from sqlalchemy.orm import Session

from app.models import (
    KPI,
    KPIVerdict,
    KPIVerdictResultEnum,
    VerificationModeEnum,
    Application,
    Contract,
)


# ============================================================
# INTERNAL HELPERS
# ============================================================

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
        # Shouldn't happen — Contract.application_id is a non-null FK.
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Contract references a missing application",
        )
    return application


# ============================================================
# KPI VERDICT — WRITE
# ============================================================

def create_kpi_verdict(
    db: Session,
    contract_id: int,
    kpi_id: int,
    verdict: KPIVerdictResultEnum,
    verification_mode: VerificationModeEnum,
    verified_by: int,
    justification: str | None,
) -> KPIVerdict:
    contract = _get_contract_or_404(db, contract_id)

    kpi = db.query(KPI).filter(KPI.id == kpi_id).first()
    if kpi is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="KPI not found",
        )

    # KPI must belong to the same PS as the contract's application.
    # Guards against submitting a verdict for a KPI from a different PS.
    application = _get_application_for_contract(db, contract)
    if kpi.problem_statement_id != application.problem_statement_id:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="KPI does not belong to the problem statement of this contract",
        )

    # One verdict per KPI per contract (Doc C Stage D #2).
    # Service-layer only — there is no DB unique constraint on
    # (kpi_id, contract_id) in models.py.
    existing = db.query(KPIVerdict).filter(
        KPIVerdict.kpi_id == kpi_id,
        KPIVerdict.contract_id == contract_id,
    ).first()
    if existing is not None:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="A verdict for this KPI already exists for this contract",
        )

    kpi_verdict = KPIVerdict(
        kpi_id=kpi_id,
        contract_id=contract_id,
        verdict=verdict,
        verification_mode=verification_mode,
        verified_by=verified_by,
        justification=justification,
    )
    db.add(kpi_verdict)
    db.commit()
    db.refresh(kpi_verdict)

    # TODO(AuditLog): Doc A §5 lists `kpi_verified` as a Layer 5 domain event.
    # Not written here yet — the logging pattern (decorator vs explicit call)
    # is still open in Doc B ("AuditLog — Cross-Cutting, NOT STARTED").
    # Slot the call in once that's decided; the ComplianceRecord snapshot
    # depends on it.

    return kpi_verdict


# ============================================================
# KPI VERDICT — READ
# ============================================================

def get_kpi_verdicts(
    db: Session,
    contract_id: int,
    requesting_user=None,
) -> List[KPIVerdict]:
    """
    `requesting_user` is optional so existing callers don't break, but the
    router should always pass it — Doc D scopes this endpoint to
    officer/independent_evaluator/admin/startup-OWN, and without the user
    object there is no way to enforce the "own" half.
    """
    contract = _get_contract_or_404(db, contract_id)

    if requesting_user is not None and requesting_user.role == "startup":
        application = _get_application_for_contract(db, contract)
        if application.startup_id != requesting_user.id:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="You may only view KPI verdicts for your own contracts",
            )

    return (
        db.query(KPIVerdict)
        .filter(KPIVerdict.contract_id == contract_id)
        .all()
    )


def all_kpi_verdicts_present(db: Session, contract_id: int) -> bool:
    """
    True when every KPI declared on the contract's Problem Statement has a
    verdict for this contract. Used by Stage E (PilotOutcome) as a gate.

    Compares KPI id SETS rather than row counts — the one-verdict-per-KPI
    rule is enforced in the service layer only, so a count comparison would
    silently pass if two verdicts ever landed on the same KPI.

    Returns False when the PS declares zero KPIs: a pilot outcome should not
    be decidable with nothing to verify against.
    """
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if contract is None:
        return False

    application = db.query(Application).filter(
        Application.id == contract.application_id
    ).first()
    if application is None:
        return False

    declared_kpi_ids = {
        row.id for row in
        db.query(KPI.id).filter(
            KPI.problem_statement_id == application.problem_statement_id
        ).all()
    }
    if not declared_kpi_ids:
        return False

    verdict_kpi_ids = {
        row.kpi_id for row in
        db.query(KPIVerdict.kpi_id).filter(
            KPIVerdict.contract_id == contract_id
        ).all()
    }

    return declared_kpi_ids.issubset(verdict_kpi_ids)


def pilot_success(db: Session, contract_id: int) -> bool | None:
    """
    Doc C Stage D #3 / PRD §11: Pilot Success = ALL declared KPIs verified met.
    Mixed results = Partial (routes toward Iterate, subject to Officer
    confirmation). Computed at query time, never stored.

    Returns True (all met), False (Partial — at least one not_met), or None
    when verdicts are still incomplete.
    """
    if not all_kpi_verdicts_present(db, contract_id):
        return None

    verdicts = db.query(KPIVerdict).filter(
        KPIVerdict.contract_id == contract_id
    ).all()

    return all(v.verdict == KPIVerdictResultEnum.met for v in verdicts)