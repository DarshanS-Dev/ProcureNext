"""
app/services/bulk_read_service.py

Bulk / "mine" read endpoints — BACKEND_PERFORMANCE.md P0-1.

Owns nothing table-wise. Every function here is a pure read that joins
across tables already owned by other services (Application, ProblemStatement,
Contract, EligibilityCheck, PSEvaluatorAssignment) to replace an N-per-row
frontend fan-out with a single indexed query.

Why this exists as its own file rather than folded into each domain's
service file (see this session's discussion): these functions don't own
state, don't mutate anything, and don't map cleanly to one table — each
one joins 2-3 tables owned by different services. Grouping them here keeps
the P0-1 performance work reviewable as one unit; nothing stops a function
being moved into its domain-owner file later if that turns out to read
better — these are plain functions with no cross-dependencies on each
other.

Judgment calls flagged inline (no schema/PRD line to point to):

1. No new schemas were added — every function returns ORM rows (or a
   flat dict/list of dicts for the compact eligibility shape) using the
   existing response_models already defined in core_schemas.py /
   execution_schemas.py. No new Read schema needed.

2. All five functions are read-only — no AuditLog writes (matches the
   project convention: only *mutating* service functions log to AuditLog).

3. Ownership scoping happens INSIDE the query (filtered by the caller's
   own id), not as a post-filter in Python — this is the whole point of
   collapsing N requests into one: the DB does the join+filter in a
   single round trip instead of the app looping.

4. `get_bulk_eligibility_checks` takes an explicit list of application_ids
   from the caller (query param `application_ids=1,2,3`) rather than
   inferring "all applications for this officer's PSs" implicitly — the
   frontend already has the application id list from the applications
   response it just fetched, so passing it explicitly avoids a second
   ownership-resolution join and lets the same endpoint serve any caller
   who already has a legitimate application id list (officer or admin).
   Ownership/visibility is still enforced per-row (see judgment call #5).

5. `get_bulk_eligibility_checks` filters the returned checks down to only
   applications the caller is actually permitted to view (officer-of-PS or
   admin) — silently dropping ids the caller doesn't own, rather than 403ing
   the whole batch for one bad id. A bulk endpoint failing entirely because
   of one stray/foreign id in a large batch would be a worse experience
   than just not returning that one row.
"""

from typing import Optional

from sqlalchemy.orm import Session

from app.models import (
    Application,
    Contract,
    EligibilityCheck,
    ProblemStatement,
    PSEvaluatorAssignment,
    RoleEnum,
)


# ============================================================
# Officer — all applications across every PS they own
# (replaces N× GET /applications?problem_statement_id= per PS)
# ============================================================

def get_officer_applications(db: Session, officer_id: int) -> list[Application]:
    """
    GET /officer/applications — officer, self.

    One JOIN across every ProblemStatement this officer owns, instead of
    the frontend calling GET /applications?problem_statement_id= once per
    PS. Relies on ProblemStatement.officer_id and Application.problem_statement_id
    both being indexed (BACKEND_PERFORMANCE.md P0-2).
    """
    return (
        db.query(Application)
        .join(ProblemStatement, Application.problem_statement_id == ProblemStatement.id)
        .filter(ProblemStatement.officer_id == officer_id)
        .all()
    )


# ============================================================
# Admin — every application, platform-wide
# (replaces N× per-PS calls on the admin register)
# ============================================================

def get_all_applications(db: Session) -> list[Application]:
    """
    GET /admin/applications — admin only.

    No ownership filter (admin sees everything) — this is the simplest of
    the five, a straight unfiltered read replacing the admin register's
    per-PS fan-out. No pagination yet (see BACKEND_PERFORMANCE.md P1-4,
    not part of this pass — flagging so it isn't forgotten once the
    Application table grows past a few hundred rows).
    """
    return db.query(Application).all()


# ============================================================
# Evaluator — every PS they're assigned to
# (replaces GET /problem-statements + N× GET /problem-statements/{id}/evaluators)
# ============================================================

def get_evaluator_problem_statements(db: Session, evaluator_id: int) -> list[ProblemStatement]:
    """
    GET /evaluator/problem-statements — evaluator, self.

    Previously the frontend had to fetch every ProblemStatement, then call
    GET /problem-statements/{id}/evaluators for EACH ONE just to figure out
    which ones this evaluator is actually assigned to. This does the same
    filter as a single JOIN.

    Distinct() guards against a theoretical duplicate row — shouldn't happen
    given PSEvaluatorAssignment's unique constraint on
    (problem_statement_id, evaluator_id), but cheap insurance on a JOIN.
    """
    return (
        db.query(ProblemStatement)
        .join(
            PSEvaluatorAssignment,
            PSEvaluatorAssignment.problem_statement_id == ProblemStatement.id,
        )
        .filter(PSEvaluatorAssignment.evaluator_id == evaluator_id)
        .distinct()
        .all()
    )


# ============================================================
# Bulk EligibilityCheck read (officer queue eligibility dots)
# (replaces N× GET /applications/{id}/eligibility-check)
# ============================================================

def get_bulk_eligibility_checks(
    db: Session,
    application_ids: list[int],
    requesting_user_id: int,
    requesting_user_role: RoleEnum,
) -> list[EligibilityCheck]:
    """
    GET /eligibility-checks?application_ids=1,2,3 — officer/admin.

    Returns EligibilityCheck rows for the given application ids, scoped to
    what the caller is actually permitted to see (judgment call #5): admin
    gets every row that exists among the requested ids; officer only gets
    rows for applications under a PS they own. Ids the caller isn't
    permitted to view, or that don't exist, are silently omitted rather
    than raising — the frontend already knows which application ids it
    asked for, so a shorter result list is enough signal.
    """
    if not application_ids:
        return []

    query = (
        db.query(EligibilityCheck)
        .join(Application, EligibilityCheck.application_id == Application.id)
        .filter(EligibilityCheck.application_id.in_(application_ids))
    )

    if requesting_user_role == RoleEnum.officer:
        query = query.join(
            ProblemStatement, Application.problem_statement_id == ProblemStatement.id
        ).filter(ProblemStatement.officer_id == requesting_user_id)
    # admin: no additional filter — sees any requested id that exists.

    return query.all()


# ============================================================
# Officer — contracts across every application they own
# (replaces N× GET /applications/{id}/contract)
# ============================================================

def get_officer_contracts(db: Session, officer_id: int) -> list[Contract]:
    """
    GET /officer/contracts — officer, self.

    Joins Contract -> Application -> ProblemStatement, filtered to PSs this
    officer owns. Same shape as get_officer_applications, one join deeper.
    """
    return (
        db.query(Contract)
        .join(Application, Contract.application_id == Application.id)
        .join(ProblemStatement, Application.problem_statement_id == ProblemStatement.id)
        .filter(ProblemStatement.officer_id == officer_id)
        .all()
    )