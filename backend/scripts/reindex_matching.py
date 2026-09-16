"""
scripts/reindex_matching.py

One-off reindex script — run this after seeding the DB via raw SQL
(seed.sql / TRUNCATE+INSERT), since that bypasses the app-layer code paths
that normally trigger Chroma indexing:

    startup_profile_service.update_level2()
        -> matching_service.store_startup_description()
    problem_statement_service.publish_problem_statement() / update_problem_statement()
        -> matching_service.store_problem_statement_description()

A raw INSERT into startup_profiles / problem_statements never calls either
of those, so Chroma's two collections ("startups", "problem_statements")
stay empty even though Postgres now has `description` values. Without this,
GET /startup/problem-statements and GET /problem-statements/{id}/matches
will silently return recommended=False / empty matches for all seeded rows
(both endpoints fail-open / return-empty on no-index rather than erroring —
see matching.py / routers/matching.py).

This script re-derives exactly what the app would have indexed:
  - StartupProfile: every row with a non-blank `description` (Layer 1 has
    no "published"-style gate — startups are indexed as soon as they have
    a description, per startup_profile_service.update_level2).
  - ProblemStatement: only rows with status == published AND a non-blank
    `description` (draft PSs are never indexed — see
    problem_statement_service.publish_problem_statement's judgment call:
    an unpublished PS shouldn't be discoverable/matchable yet).

Calls the low-level app.matching.store_startup / store_problem_statement
functions directly (not matching_service's wrappers) so failures raise
loudly here instead of being caught-and-logged — for a one-off backfill
you want to know immediately if Chroma is unreachable, not have it silently
no-op the way the app's own best-effort indexing does in normal request flow.

Usage:
    python -m scripts.reindex_matching
    python -m scripts.reindex_matching --dry-run
    python -m scripts.reindex_matching --startups-only
    python -m scripts.reindex_matching --ps-only
"""

import argparse
import sys

from app.database import SessionLocal
from app.matching import store_problem_statement, store_startup
from app.models import ProblemStatement, PSStatusEnum, StartupProfile


def reindex_startups(db, dry_run: bool) -> tuple[int, int]:
    profiles = (
        db.query(StartupProfile)
        .filter(StartupProfile.description.isnot(None))
        .all()
    )
    indexed, skipped = 0, 0
    for profile in profiles:
        if not profile.description or not profile.description.strip():
            skipped += 1
            continue
        print(f"  startup_id={profile.user_id}: {profile.description[:70]!r}...")
        if not dry_run:
            store_startup(startup_id=profile.user_id, description=profile.description)
        indexed += 1
    return indexed, skipped


def reindex_problem_statements(db, dry_run: bool) -> tuple[int, int]:
    problem_statements = (
        db.query(ProblemStatement)
        .filter(
            ProblemStatement.status == PSStatusEnum.published,
            ProblemStatement.description.isnot(None),
        )
        .all()
    )
    indexed, skipped = 0, 0
    for ps in problem_statements:
        if not ps.description or not ps.description.strip():
            skipped += 1
            continue
        print(f"  ps_id={ps.id}: {ps.description[:70]!r}...")
        if not dry_run:
            store_problem_statement(ps_id=ps.id, description=ps.description)
        indexed += 1
    return indexed, skipped


def main():
    parser = argparse.ArgumentParser(description="Backfill Chroma indexes from Postgres after a raw-SQL seed.")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be indexed without writing to Chroma.")
    parser.add_argument("--startups-only", action="store_true")
    parser.add_argument("--ps-only", action="store_true")
    args = parser.parse_args()

    if args.startups_only and args.ps_only:
        print("--startups-only and --ps-only are mutually exclusive", file=sys.stderr)
        sys.exit(1)

    db = SessionLocal()
    try:
        total_indexed = 0

        if not args.ps_only:
            print("Indexing StartupProfile descriptions -> Chroma 'startups' collection...")
            indexed, skipped = reindex_startups(db, args.dry_run)
            print(f"  -> {indexed} indexed, {skipped} skipped (blank description)\n")
            total_indexed += indexed

        if not args.startups_only:
            print("Indexing published ProblemStatement descriptions -> Chroma 'problem_statements' collection...")
            indexed, skipped = reindex_problem_statements(db, args.dry_run)
            print(f"  -> {indexed} indexed, {skipped} skipped (blank description)\n")
            total_indexed += indexed

        if args.dry_run:
            print(f"Dry run complete — {total_indexed} rows would be indexed. Re-run without --dry-run to write.")
        else:
            print(f"Done — {total_indexed} rows indexed into Chroma.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
