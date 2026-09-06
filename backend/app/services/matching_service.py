"""
app/services/matching_service.py

Semantic Matching — Teammate B handoff (AI/ML owner, per project split).

Owns:
- Indexing: store_startup_description / store_problem_statement_description —
  thin wrappers around the teammate's store_startup()/store_problem_statement(),
  called from startup_profile_service.py and problem_statement_service.py
  respectively, whenever the relevant `description` field is written.
- Matching: get_recommended_ps_ids_for_startup / get_top_matching_startup_ids_for_ps
  — thin wrappers around the teammate's match_startup_to_problems()/
  match_problem_to_startups(), converting the returned string ids back to ints
  (Chroma ids are strings; our PKs are ints) and handling the empty-index case.

This file is intentionally a thin adapter layer over the handed-off ML internals
(chromadb + sentence-transformers) — Darshan integrates, does not touch the
embedding/matching internals themselves (see project instructions: "Teammate B
hands off master functions, does not touch the shared backend split").

Judgment calls flagged inline (no schema/PRD line to point to):

1. Indexing is skipped entirely (not called, not a no-op call) when the
   description is None or empty/whitespace-only. The teammate's store_*
   functions don't guard against this themselves — embedding an empty string
   would pollute the index with a meaningless vector that could spuriously
   "match" everything. Callers (startup_profile_service, problem_statement_service)
   check this before calling in, but the guard is duplicated here defensively
   since this is the one shared entry point both services go through.

2. Indexing failures are caught and logged, NOT raised — confirmed this
   session: embedding calls are slower and less reliable than a DB write, and
   a Chroma outage should never block a PATCH /startup/profile/level2 or a
   POST /problem-statements/{id}/publish from succeeding. The description is
   still saved to Postgres regardless; it just won't be matchable until the
   next successful index call (e.g. the next profile edit, or a manual
   re-index if one is ever added). This is a deliberate best-effort/fire-
   and-forget choice, not an oversight — flagging in case a stricter
   "indexing must succeed" contract is wanted later.

3. Match failures (Chroma down, embedding model unavailable, etc.) DO raise
   — unlike indexing, a match read endpoint has nothing useful to fall back
   to (there's no "compute it later" for a GET request), so
   MatchingServiceError propagates to the router as a 503-equivalent rather
   than silently returning an empty/wrong list that could look like "no
   matches exist" when actually the matching service just failed.

4. `top_k` defaults: 10 for PS->startup matches (officer side, "3-5 or even
   more" per this session's direction — 10 comfortably covers that without
   overwhelming the officer), and a large-ish 50 for startup->PS matches
   (startup dashboard shows ALL published PSs with recommended ones flagged,
   not just the top few — so this cap only matters once more than 50 PSs are
   published; effectively "recommend everything that's a decent semantic
   match", not a strict top-N).

5. No result filtering by entity status (published/compliance-verified/etc.)
   happens inside this file — that's each caller's job (see
   problem_statement_service/startup_profile_service call sites), since this
   file only knows about Chroma's index, not about Postgres row state.
   Matches this session's "no filtering for MVP" decision: raw ranked ids,
   caller decides what to do with stale/deleted entities.
"""

import logging
from typing import Optional

from app.matching import (
    match_problem_to_startups,
    match_startup_to_problems,
    store_problem_statement,
    store_startup,
)

logger = logging.getLogger(__name__)


# ============================================================
# Errors
# ============================================================

class MatchingServiceError(Exception):
    """Base error for matching_service — routers translate to HTTP (503-style,
    since this wraps an external/optional subsystem, not a business-rule failure)."""


# ============================================================
# Indexing (write side — best-effort, never raises, see judgment call #2)
# ============================================================

def store_startup_description(startup_id: int, description: Optional[str]) -> None:
    """
    Index/update a startup's description for semantic matching. Called from
    startup_profile_service.update_level2() whenever `description` is present
    in the update payload.

    No-op (not even a call into Chroma) if description is None/blank
    (judgment call #1). Failures are logged, not raised (judgment call #2) —
    the profile save itself must never fail because of an indexing problem.
    """
    if not description or not description.strip():
        return
    try:
        store_startup(startup_id=startup_id, description=description)
    except Exception:
        logger.exception(
            "matching_service: failed to index startup_id=%s — description "
            "saved to DB but not searchable until next successful index",
            startup_id,
        )


def store_problem_statement_description(ps_id: int, description: Optional[str]) -> None:
    """
    Index/update a Problem Statement's description for semantic matching.
    Called from problem_statement_service.publish_problem_statement() (first
    index, at publish time — see judgment call #5 in problem_statement_service
    on why indexing is deferred to publish rather than draft-time creation)
    and from update_problem_statement() when a published PS's description is
    edited (re-index to keep the vector current).

    No-op if description is None/blank. Failures logged, not raised.
    """
    if not description or not description.strip():
        return
    try:
        store_problem_statement(ps_id=ps_id, description=description)
    except Exception:
        logger.exception(
            "matching_service: failed to index problem_statement_id=%s — "
            "description saved to DB but not searchable until next successful index",
            ps_id,
        )


# ============================================================
# Matching (read side — raises MatchingServiceError on failure, see #3)
# ============================================================

def get_top_matching_startup_ids_for_ps(
    ps_description: str, top_k: int = 10
) -> list[int]:
    """
    GET /problem-statements/{id}/matches — officer/admin side.

    Returns up to top_k startup ids, ranked best-match-first, for a
    published PS's description. Empty list if nothing is indexed yet
    (teammate's function already handles the zero-startups-indexed case
    by returning []). Raises MatchingServiceError on any underlying failure.
    """
    try:
        raw_ids = match_problem_to_startups(ps_description, top_k=top_k)
    except Exception as exc:
        raise MatchingServiceError(f"Failed to compute startup matches: {exc}") from exc

    return _to_int_ids(raw_ids)


def get_recommended_ps_ids_for_startup(
    startup_description: str, top_k: int = 50
) -> list[int]:
    """
    GET /startup/problem-statements — startup dashboard side.

    Returns up to top_k Problem Statement ids the startup semantically
    matches, ranked best-first (judgment call #4: high top_k since this
    feeds a "flag as recommended within the full list" view, not a
    standalone top-N list). Empty list if the startup has no description
    yet, or nothing is indexed. Raises MatchingServiceError on failure.
    """
    try:
        raw_ids = match_startup_to_problems(startup_description, top_k=top_k)
    except Exception as exc:
        raise MatchingServiceError(f"Failed to compute problem statement matches: {exc}") from exc

    return _to_int_ids(raw_ids)


def _to_int_ids(raw_ids: list[str]) -> list[int]:
    """Chroma ids are strings (we store them as str(pk) on upsert) — convert
    back to int PKs for callers to use in SQLAlchemy filters. Skips any id
    that fails to parse rather than raising, defensively (should never
    happen given we always upsert with str(int_id), but a malformed/legacy
    id shouldn't take down the whole match response)."""
    result = []
    for raw_id in raw_ids:
        try:
            result.append(int(raw_id))
        except (TypeError, ValueError):
            logger.warning("matching_service: skipping non-integer id from Chroma: %r", raw_id)
    return result