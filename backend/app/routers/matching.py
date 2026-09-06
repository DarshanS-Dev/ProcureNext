"""
app/routers/matching.py

Semantic Matching HTTP routes (Teammate B handoff, this session's brainstorm).

Endpoints:
    GET    /startup/problem-statements               (startup, self)
    GET    /problem-statements/{id}/matches            (officer-owner/admin)

Locked this session:

1. GET /startup/problem-statements returns ALL published PSs (not just
   matches) — "recommended" is a flag layered on top, not a filter. Matched
   PSs are flagged `recommended=True` and sorted first (by match rank);
   the rest follow in normal order (published_at desc). If the startup has
   no `description` yet (Level 2 incomplete) or the matching subsystem is
   down, this endpoint still returns the full published list with every
   entry `recommended=False` rather than failing the whole request — a
   startup should always be able to see what's published even if
   recommendations aren't available. This is a deliberate asymmetry vs.
   the officer-side endpoint below (see #2): discovery must never break
   because matching broke.

2. GET /problem-statements/{id}/matches returns the top 10 (matching_service
   default) startup matches, ranked, with rank 1 flagged `recommended=True`.
   Unlike the startup dashboard, if the matching subsystem fails here, this
   DOES 503 — there's no meaningful fallback for "show me my top matching
   startups" the way there is for "show me all published PSs" (that data
   just doesn't exist without matching). This is purely an officer/admin
   tool for faster discovery once a PS is published; no ownership question
   for the startup side since /startup/problem-statements is always "self".

3. This router does NOT do the actual Chroma indexing — that happens inside
   problem_statement_service.publish_problem_statement()/
   update_problem_statement() and startup_profile_service.update_level2(),
   at write time. This file only reads.

4. Startup names for StartupMatchEntry are pulled via a plain User query
   (User.name) — matching_service only returns ids, it knows nothing about
   our User table.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_role
from app.database import get_db
from app.models import ProblemStatement, PSStatusEnum, RoleEnum, User
from app.schemas.core_schemas import (
    PSMatchRankingRead,
    ProblemStatementMatchRead,
    StartupMatchEntry,
)
from app.services import matching_service, startup_profile_service

router = APIRouter(tags=["Semantic Matching"])


def _is_officer_of_ps(db: Session, officer_id: int, problem_statement_id: int) -> bool:
    ps = db.query(ProblemStatement).filter(ProblemStatement.id == problem_statement_id).first()
    return ps is not None and ps.officer_id == officer_id


# ============================================================
# Startup dashboard — all published PSs, matches flagged recommended
# ============================================================

@router.get("/startup/problem-statements", response_model=list[ProblemStatementMatchRead])
def get_startup_dashboard(
    current_user: User = Depends(require_role(RoleEnum.startup)),
    db: Session = Depends(get_db),
):
    """
    GET /startup/problem-statements — startup, self.

    Returns every published ProblemStatement. Ones the startup semantically
    matches (via their StartupProfile.description) are flagged
    recommended=True and sorted first by match rank; the rest follow in
    published_at-desc order. See module docstring #1 for the fail-open
    behavior when description is missing or matching fails.
    """
    published = (
        db.query(ProblemStatement)
        .filter(ProblemStatement.status == PSStatusEnum.published)
        .order_by(ProblemStatement.published_at.desc())
        .all()
    )

    recommended_ids: set[int] = set()
    rank_by_id: dict[int, int] = {}

    try:
        profile = startup_profile_service.get_own_profile(db, current_user.id)
        if profile.description and profile.description.strip():
            matched_ids = matching_service.get_recommended_ps_ids_for_startup(
                profile.description
            )
            recommended_ids = set(matched_ids)
            rank_by_id = {ps_id: rank for rank, ps_id in enumerate(matched_ids)}
    except (
        startup_profile_service.ProfileNotFoundError,
        matching_service.MatchingServiceError,
    ):
        # Fail-open (docstring #1): recommendations unavailable, but the
        # startup should still see the full published list.
        pass

    def _sort_key(ps: ProblemStatement):
        # Recommended first (by ascending match rank = best match first),
        # then everything else, already in published_at-desc order from
        # the query above (stable sort preserves that relative order).
        if ps.id in rank_by_id:
            return (0, rank_by_id[ps.id])
        return (1, 0)

    ordered = sorted(published, key=_sort_key)

    return [
        ProblemStatementMatchRead(
            **{
                field: getattr(ps, field)
                for field in ProblemStatementMatchRead.model_fields
                if field != "recommended"
            },
            recommended=(ps.id in recommended_ids),
        )
        for ps in ordered
    ]


# ============================================================
# Officer/admin — top matching startups for a PS
# ============================================================

@router.get("/problem-statements/{ps_id}/matches", response_model=PSMatchRankingRead)
def get_ps_matches(
    ps_id: int,
    current_user: User = Depends(require_role(RoleEnum.officer, RoleEnum.admin)),
    db: Session = Depends(get_db),
):
    """
    GET /problem-statements/{id}/matches — officer-owner/admin.

    Returns the top matching startups (matching_service default top_k=10)
    for this PS's description, ranked, with rank 1 flagged recommended=True.
    Computed live on every call — no caching table (same pattern as QCBS
    ranking / Decision Readiness). Requires the PS to have been published
    at least once (that's when indexing happens — see
    problem_statement_service.publish_problem_statement()); an unpublished
    or never-indexed PS simply returns an empty match list, not an error.
    """
    ps = db.query(ProblemStatement).filter(ProblemStatement.id == ps_id).first()
    if ps is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem statement not found")

    if current_user.role == RoleEnum.officer and not _is_officer_of_ps(db, current_user.id, ps_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the owning officer")

    if not ps.description or not ps.description.strip():
        return PSMatchRankingRead(problem_statement_id=ps_id, matches=[])

    try:
        matched_startup_ids = matching_service.get_top_matching_startup_ids_for_ps(
            ps.description
        )
    except matching_service.MatchingServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        )

    if not matched_startup_ids:
        return PSMatchRankingRead(problem_statement_id=ps_id, matches=[])

    users_by_id = {
        u.id: u
        for u in db.query(User).filter(User.id.in_(matched_startup_ids)).all()
    }

    entries = []
    for rank, startup_id in enumerate(matched_startup_ids, start=1):
        user = users_by_id.get(startup_id)
        if user is None:
            # Startup was indexed at some point but no longer exists / id
            # drifted — skip rather than error out the whole ranking.
            continue
        entries.append(
            StartupMatchEntry(
                startup_id=startup_id,
                name=user.name,
                rank=rank,
                recommended=(rank == 1),
            )
        )

    return PSMatchRankingRead(problem_statement_id=ps_id, matches=entries)