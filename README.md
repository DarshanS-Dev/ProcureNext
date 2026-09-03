# SIH26136 — Startup-Friendly Public Procurement Platform

FastAPI + SQLAlchemy + Alembic + PostgreSQL. Schema locked at 24 tables
(PRD v4 §16). See `app/models.py` for the single shared model file.

## Setup

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET
```

## First migration

```bash
alembic revision --autogenerate -m "initial schema - all 24 tables"
alembic upgrade head
```

## Run

```bash
uvicorn app.main:app --reload
```

## Ownership (per team split)

- Layers 1-4 + AuditLog: Darshan — `app/routers/{auth,problem_statements,applications,
  eligibility,checklist,evaluators,scores,risk,containment,decision}.py` (to be added)
- Layer 5 + Invite + ComplianceRecord: teammate — `app/routers/{sandbox,contract,
  milestones,kpi,pilot_outcome,invite,compliance_record}.py` (to be added)
- `app/models.py` is shared — coordinate before editing table shapes; schema is locked,
  so this file should only need enum/relationship additions, not structural changes.
- Layer 5 must only mutate `Application.status` via the three functions in
  `app/services/application_transitions.py` (`mark_application_contracted`,
  `mark_application_completed`, `mark_application_not_selected`) — see Doc A §3.
