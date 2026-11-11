
# ProcureNext (SIH26136)

**An outcome-based public procurement platform connecting Indian government departments with startups for pilot-stage innovation projects.**

Built for Smart India Hackathon 2025 by a 6-person team.

---

## 1. Problem & Solution

Traditional government procurement is built for buying known commodities from established vendors — it is not built for **piloting unproven solutions from early-stage startups**. Startups face heavy paperwork, rigid eligibility criteria, and procurement cycles that assume a finished product rather than an experiment. Departments, meanwhile, have no structured way to de-risk a startup engagement: there's no standard path from "here's our problem" to "here's a startup we trust enough to run a small, contained pilot with."

**ProcureNext (SIH26136)** re-frames government procurement around outcomes rather than specifications, and around *staged, de-risked pilots* rather than one-shot contracts. A government officer posts a problem statement framed around a measurable outcome (not a prescribed technology). Startups discover it — including via semantic matching against their own capability profile — and submit a two-envelope (technical + commercial) proposal. The platform then walks every application through a fixed evaluation pipeline: eligibility screening, a dynamic document checklist, independent technical scoring with conflict-of-interest controls, QCBS-style commercial ranking, automated risk profiling, and an explicit containment plan before a startup is ever handed real budget. Selected startups go through a bounded sandbox trial before a formal pilot contract is issued, and the pilot itself is tracked against fixed milestones and KPIs, ending in an explicit **scale / iterate / stop** decision — all backed by an immutable, on-demand compliance snapshot for audit.

## 2. Key Features

* **Outcome-first problem statements** — officers define a baseline, a target, a measurement method and a success condition; a Quality Gate blocks publishing until the two fields that actually make it measurable (`baseline`, `measurement_method`) are filled in.
* **AI-assisted drafting (advisory only)** — an LLM call (Groq-hosted `gpt-oss-120b`) suggests a baseline question, a measurement method, and flags problem statements that read as a technology spec rather than an outcome. It never writes to the record and never blocks publishing.
* **Semantic capability matching** — startup capability descriptions and problem statement descriptions are embedded (`sentence-transformers`, `BAAI/bge-small-en-v1.5`) into a Chroma vector store, powering two-way "recommended for you" discovery. *(Team-built — see [Ownership](#ownership--team-split).)*
* **Two-envelope (sealed bid) applications** — technical and commercial proposals are submitted together but the commercial envelope stays sealed from evaluators until technical scoring is complete platform-wide for that problem statement.
* **Dynamic, rule-driven document checklist** — required documents are resolved per application from a combination of category rules, sensitivity-tag rules, and problem-statement-specific additions, generated synchronously at application time.
* **Five-check eligibility screening** with DPIIT/entity/PAN-GST snapshots taken at application time and two officer-reviewed checks (sector eligibility, certification), rolling up to an overall pass/fail/needs-clarification result that automatically opens or closes the rest of the pipeline.
* **Conflict-of-interest gated evaluator scoring** — an evaluator cannot submit a rubric score until they have filed a (insert-only) COI declaration for that application; declaring a conflict auto-recuses them.
* **QCBS-style ranking**, computed entirely at query time (no stored table): a 70/30 weighted blend of a mean-of-evaluators technical score and a lowest-bid-normalized commercial score.
* **Six-axis automated risk profiling** (technical, financial, implementation, cybersecurity, data, scalability) computed from structured startup/problem-statement fields via fixed lookup grids and thresholds — run twice per application (preliminary, at eligibility; final, once commercial scoring is complete).
* **Containment plans** — AI-drafted (template-based, not an LLM call) starting point for scope limits, fallback process, data terms and exit conditions, which the officer edits and submits before a pilot can be authorized.
* **A hard Decision Readiness gate** — six independently-computed checks (eligibility, scoring completeness, COI resolution, commercial unlock, final risk profile, containment plan) must all pass before an application can be selected; there is no override path.
* **Bounded sandbox trial** before contracting — an independent evaluator runs four checks and records a promising / not-promising / inconclusive verdict.
* **Fixed five-stage pilot execution** (deployment → field testing → outcome measurement → independent verification → final decision) with milestone evidence submission, KPI verdicts (met/not-met, desk review or field visit), and an explicit officer-authored scale/iterate/stop decision.
* **Immutable, on-demand compliance snapshots** — an admin can compile a point-in-time, JSON snapshot spanning every layer of an application's record (eligibility, QCBS, COI, risk, containment, sandbox, contract, milestones, KPI verdicts, pilot outcome) for audit purposes; each compile creates a new row, nothing is ever overwritten.
* **Bulk "mine" read endpoints** — one-call queue views for officers, admins and evaluators (all applications across an officer's problem statements, all problem statements an evaluator sits on, bulk eligibility-check lookups) that replace the N-request client-side fan-outs the earlier build relied on.
* **Append-only audit logging** across every mutating action in the system.

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Backend framework | FastAPI (Python), Uvicorn |
| ORM / migrations | SQLAlchemy + Alembic |
| Database | PostgreSQL (via `psycopg2-binary`) |
| Auth | JWT (`pyjwt`), `bcrypt` (direct, not `passlib`) |
| Config | `pydantic-settings` + `.env` |
| Semantic matching | ChromaDB (persistent client) + `sentence-transformers` (`BAAI/bge-small-en-v1.5`) |
| AI-assist (problem statement drafting) | OpenAI-compatible client against Groq (`openai/gpt-oss-120b`) |
| Frontend framework | Next.js 16 (App Router), React 19, TypeScript |
| Frontend styling | Tailwind CSS v4 |
| Frontend animation/icons | Framer Motion, `lucide-react` |

**CORS:** the backend registers `CORSMiddleware` with `allow_origins=["*"]`. The frontend does **not** rely on this — it still proxies every `/api/*` call server-side through `next.config.ts` to the FastAPI origin, so no browser ever makes a cross-origin request in normal use. The wildcard CORS policy exists for direct API access (e.g. tooling, a future separately-hosted client) and is paired with bearer-token auth rather than cookies, which limits (but doesn't eliminate) the risk of `allow_origins="*"` — worth tightening before any production deployment.

## 4. Project Structure

```text
ProcureNext/
├── backend/
│   ├── alembic/                         # Database migrations (24-table schema, PRD v4 §16)
│   ├── app/
│   │   ├── auth/                        # JWT dependencies, role guards, short-TTL user cache
│   │   ├── routers/                     # HTTP endpoints; one router per resource
│   │   │   └── bulk.py                  # Bulk "mine" queue endpoints
│   │   ├── schemas/                     # Pydantic request/response models
│   │   │   ├── core_schemas.py          # Layers 1–4 and AuditLog
│   │   │   └── execution_schemas.py     # Layer 5, Invite, and ComplianceRecord
│   │   ├── services/                    # Business logic and database access
│   │   │   └── bulk_read_service.py     # Cross-table queries for bulk endpoints
│   │   ├── config.py                    # Environment-driven settings
│   │   ├── database.py                  # Engine, session, and declarative Base
│   │   ├── matching.py                  # Low-level ChromaDB client (team-built)
│   │   ├── models.py                    # Shared SQLAlchemy models (24 tables)
│   │   └── main.py                      # FastAPI app, CORS, and router registration
│   ├── scripts/
│   │   ├── seed_rubric_criteria.py      # Seeds the 7 platform-wide rubric criteria
│   │   └── reindex_matching.py          # Rebuilds the ChromaDB index after direct SQL seeding
│   ├── alembic.ini
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── app/                             # Next.js App Router
    │   ├── admin/
    │   ├── officer/
    │   ├── startup/
    │   ├── evaluator/
    │   ├── independent-evaluator/
    │   ├── login/
    │   └── register/
    ├── components/
    │   ├── shared/                      # Design system, layout shell, shared domain widgets
    │   ├── panels/                      # Reusable application panels (eligibility, scoring, etc.)
    │   ├── auth/
    │   ├── admin/
    │   └── startup/                     # Role-specific components
    ├── lib/
    │   ├── api/
    │   │   └── client.ts                # Typed API client with short-TTL GET cache
    │   ├── auth/
    │   │   └── session.ts               # JWT-derived session (no /auth/me route)
    │   ├── hooks/
    │   │   └── useApi.ts                # useQuery / useMutation primitives
    │   └── types/
    │       └── api.ts                   # TypeScript mirrors of Pydantic schemas
    └── next.config.ts                   # Proxies /api/* requests to FastAPI
```

## 5. Setup Instructions

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, GROQ_API_KEY
```

Run the initial migration:

```bash
alembic revision --autogenerate -m "initial schema - all 24 tables"
alembic upgrade head
```

Seed the platform-wide rubric criteria (required before any evaluator can score):

```bash
python -m scripts.seed_rubric_criteria
```

If you seed startups or problem statements directly via SQL (bypassing the app layer), backfill the semantic-matching index afterward:

```bash
python -m scripts.reindex_matching        # or --dry-run first
```

Run the API:

```bash
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # BACKEND_ORIGIN defaults to http://127.0.0.1:8000
npm run dev
```

The frontend proxies all `/api/*` calls server-side to the FastAPI backend (`next.config.ts` rewrite). This proxy is used regardless of the backend's own CORS configuration.

## 6. Database Schema

Schema is **locked at 24 tables per PRD v4 §16** — this is a deliberate, spec-driven design choice made early in the build to keep the five procurement layers plus cross-cutting concerns in a single, reviewable shape, not a limitation encountered later. All 24 tables live in one shared `app/models.py`, coordinated between the two backend owners rather than split across files. A later performance pass added indexes (single-column and a few composites) to the foreign-key columns that sit on hot-path queries — no table shapes, column types, or nullability changed as part of that.

| Layer | Tables |
|---|---|
| Layer 1 — Actors | `users`, `startup_profiles` |
| Layer 2 — Problem Statement | `problem_statements` |
| Layer 3 — Application | `applications` |
| Layer 4 — Evaluation Pipeline | `eligibility_checks`, `checklist_rules`, `checklist_items`, `ps_evaluator_assignments`, `rubric_criteria`, `evaluation_scores`, `coi_declarations`, `risk_profiles`, `containment_plans`, `selection_decisions` |
| Layer 5 — Post-Selection Pipeline | `sandbox_trials`, `contracts`, `pilot_milestones`, `evidence`, `kpis`, `kpi_verdicts`, `pilot_outcomes` |
| Cross-cutting | `audit_logs`, `invites`, `compliance_records` |

## 7. Ownership (Team Split)

* **Darshan** — Layers 1–4 + AuditLog: auth, problem statements, applications, eligibility, checklist, evaluators, scores, risk, containment, decision readiness, bulk reads. Routers/services: `auth`, `startup_profiles`, `problem_statements`, `applications`, `checklist`, `evaluators`, `scoring`, `qcbs`, `risk_containment`, `decision_readiness`, `bulk`, plus `app/schemas/core_schemas.py` and `audit_log_service.py`.
* **Nikhil (teammate)** — Layer 5 + Invite + ComplianceRecord: sandbox trial, contract, milestones, KPI verdicts, pilot outcome, invites, compliance record compilation. Routers/services: `sandbox_trial`, `contract`, `milestones`, `kpi_verdicts`, `pilot_outcome`, `invite`, `compliance_record`, plus `app/schemas/execution_schemas.py`.
* **Arjun (teammate)** — Frontend (Next.js app, design system, all role-specific UI).
* **Semantic matching (Chroma + sentence-transformers) and external API integration** — team-built; not attributed to any single member here. `app/matching.py` and `app/services/matching_service.py` are the relevant files.
* `app/models.py` is a single shared file across the whole backend team — schema is locked, so changes to it are limited to enum/relationship additions and indexes, not structural changes, and are coordinated before editing.

**Hard invariant:** Layer 5 (Nikhil's code) never writes `Application.status` directly — it only ever calls the three functions in `app/services/application_service.py` (`mark_application_contracted`, `mark_application_completed`, `mark_application_not_selected`), which are the sole legal writers of that field.

## 8. Future Enhancements

The following are known, explicitly acknowledged gaps and forward-looking items rather than committed roadmap — flagged in code comments and docstrings across the backend:

* **Audit log read endpoint** — `AuditLogRead` and the underlying `audit_logs` table are fully populated on every mutating action, but no HTTP route currently exposes a read/query endpoint over them (admin-only, filterable by entity and actor, is the natural shape). The frontend's `admin/audit-log` page says this plainly rather than faking a feed.
* **Background job for stalled commercial unlock** — a problem statement can stall indefinitely if one assigned evaluator never scores; there is no cron/background sweep, only a reactive check on each score submission.
* **Configurable QCBS weighting and risk thresholds** — the 70/30 technical/commercial split and the risk-band thresholds (`>=70` low / `40–69` medium / `<40` high) are fixed constants for the MVP, not admin-configurable.
* **Configurable clause templates** — contract clause snapshots are drawn from a fixed Python dictionary keyed by problem-statement category, with no write route to edit them.
* **Score/decision revision paths** — technical scores and COI declarations are insert-only by design (defensibility over the pipeline); no formal revision workflow exists beyond officer discretion + audit log.
* **Per-role field masking on the merged startup profile view** — `StartupProfileMergedRead` currently returns the same full shape to every permitted viewer role, with no per-field visibility rules (e.g. hiding `funding_band` from evaluators).
* **Frontend catch-up on `/independent-evaluators/me/applications`** — the backend now returns a real caseload for this role, but `independent-evaluator/applications/page.tsx` still asks the user to paste in an application id manually rather than listing `needing_sandbox` / `needing_milestones_or_kpis`. Wiring the page to the new endpoint removes that manual step.
