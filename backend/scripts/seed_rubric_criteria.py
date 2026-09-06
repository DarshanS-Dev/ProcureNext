"""
scripts/seed_rubric_criteria.py

One-time seed script for the 7 platform-wide RubricCriterion rows
(PRD §7.2, Doc B Stage 3 #1 — "seeded once as 7 platform-wide rows,
category=null"). Not an Alembic migration (this is data, not schema) and
not called from any service — scoring_service.py's own docstring flags
this as a one-time DB seed/migration concern, not a runtime function.

Idempotent: safe to re-run — skips any criterion name that already exists
rather than inserting duplicates (there's no unique constraint on
RubricCriterion.name at the DB level, so re-running this blindly without
the check would silently double up rows and break qcbs_service's technical
score aggregation, which sums weight/100 across all rows returned for a
criterion_id — duplicate names wouldn't double-count directly since scoring
is keyed by criterion_id, not name, but would pollute get_rubric_criteria()
reads and confuse evaluators with duplicate options).

Usage:
    python -m scripts.seed_rubric_criteria
"""

from app.database import SessionLocal
from app.models import RubricCriterion

# PRD §7.2 — locked, platform-wide (category=None), weights sum to 100.
# "Security & compliance" name matches risk_containment_service.py's
# _SECURITY_CRITERION_NAME exactly — do not rename without updating that too.
RUBRIC_CRITERIA = [
    ("Problem fit", 20),
    ("Technical feasibility", 20),
    ("Innovation", 15),
    ("Security & compliance", 10),
    ("Scalability", 10),
    ("Implementation capability", 10),
    ("Team capability", 15),
]


def seed_rubric_criteria() -> None:
    assert sum(weight for _, weight in RUBRIC_CRITERIA) == 100, (
        "RUBRIC_CRITERIA weights must sum to 100 (PRD §7.2, QCBS technical "
        "score formula assumes this)"
    )

    db = SessionLocal()
    try:
        existing_names = {
            row[0] for row in db.query(RubricCriterion.name).all()
        }

        created = []
        for name, weight in RUBRIC_CRITERIA:
            if name in existing_names:
                print(f"skip (already exists): {name}")
                continue
            criterion = RubricCriterion(category=None, name=name, weight=weight)
            db.add(criterion)
            created.append(name)

        if created:
            db.commit()
            print(f"created {len(created)} RubricCriterion row(s): {created}")
        else:
            print("nothing to seed — all 7 criteria already exist")
    finally:
        db.close()


if __name__ == "__main__":
    seed_rubric_criteria()