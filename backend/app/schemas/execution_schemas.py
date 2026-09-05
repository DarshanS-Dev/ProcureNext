"""
Pydantic schemas — Sandbox Trial (Layer 5, Stage A) — Nikhil's ownership.

Follows the conventions locked in core_schemas.py (Darshan's file):
- Enums imported directly from app.models — never redefined here.
- {Model}Read used for response shapes (not {Model}Response).
- {Model}Update written standalone (all fields Optional) — PATCH semantics.
- Flat/separate schemas only, no nesting — matches Doc D's 1:1 endpoint design.

Matches the real SandboxTrial model in models.py:
  functional_check, directional_kpi_check, operational_fit_check,
  no_red_flags_check, verdict, verified_by, verification_mode, notes,
  started_at, completed_at.  (No created_at on this table.)

ADD THIS TO app/schemas/execution_schemas.py
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models import (
    SandboxCheckEnum,
    SandboxVerdictEnum,
    VerificationModeEnum,
)


# ---- POST /applications/{id}/sandbox-trial ----
# Evaluator creates the trial and submits the four checks up front.
# verified_by is NOT in the request body — set server-side from auth context
# (the calling independent_evaluator), matching SelectionDecisionCreate's
# pattern of pulling actor identity from auth, not the client.
class SandboxTrialCreate(BaseModel):
    functional_check: SandboxCheckEnum
    directional_kpi_check: SandboxCheckEnum
    operational_fit_check: SandboxCheckEnum
    no_red_flags_check: SandboxCheckEnum
    verification_mode: VerificationModeEnum
    notes: Optional[str] = None


# ---- PATCH /applications/{id}/sandbox-trial/{trial_id} ----
# Evaluator finalizes — sets/overrides verdict and marks completed.
# verdict is optional here: if omitted, service computes it from the
# four checks already on the row (see sandbox_service.py).
class SandboxTrialUpdate(BaseModel):
    verdict: Optional[SandboxVerdictEnum] = None
    notes: Optional[str] = None


# ---- Response shape for GET / POST / PATCH ----
class SandboxTrialRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    functional_check: Optional[SandboxCheckEnum] = None
    directional_kpi_check: Optional[SandboxCheckEnum] = None
    operational_fit_check: Optional[SandboxCheckEnum] = None
    no_red_flags_check: Optional[SandboxCheckEnum] = None
    verdict: Optional[SandboxVerdictEnum] = None
    verified_by: Optional[int] = None
    verification_mode: Optional[VerificationModeEnum] = None
    notes: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None