# Backend Performance — Handoff

**For:** backend owner · **From:** frontend · **Goal:** fastest possible API responses

The frontend already does everything it can on its side: it caches GET responses for 30s, merges duplicate in-flight requests, and clears the cache on every write. What is left is on the backend. Every item below is grounded in the current code, with file references.

Items are ordered by impact. **Do P0 first** — those are the ones users feel.

---

## Why pages feel slow today

Several screens have no bulk endpoint, so the frontend must fire **one request per row**:

| Screen | Requests per page load today |
|---|---|
| Officer dashboard / Applications queue | `GET /problem-statements` + **1× `GET /applications?problem_statement_id=` per PS** |
| Officer applications queue (eligibility dots) | + **1× `GET /applications/{id}/eligibility-check` per application** |
| Evaluator dashboard / Assigned work | `GET /problem-statements` + **1× `GET /problem-statements/{id}/evaluators` for EVERY PS** |
| Admin applications register | `GET /problem-statements` + **1× applications call per PS** |
| Officer contracts | applications per PS + **1× contract per application** |

With 20 problem statements that is 20–60 parallel requests per page. Each one also:

1. re-verifies the JWT **and loads the `User` row** (`app/auth/dependencies.py:get_current_user`), and
2. checks out a DB connection from a pool of **5 (+10 overflow)** — the SQLAlchemy default, since `app/database.py` sets no pool size.

So bursts queue behind the pool, and every foreign-key lookup is a sequential scan (see P0-2).

---

## P0 — biggest wins

### P0-1. Add bulk / "mine" endpoints (removes the fan-outs)

These replace dozens of calls with one each. Response shapes can reuse existing schemas.

| New endpoint | Replaces | Who uses it |
|---|---|---|
| `GET /applications?officer_id=me` (or `GET /officer/applications`) — all applications on the caller's PSs, with `problem_statement_id` | N× `GET /applications?problem_statement_id=` | Officer dashboard, queue, contracts |
| `GET /admin/applications` — every application | N× per-PS calls | Admin register |
| `GET /evaluator/problem-statements` — PSs the caller is assigned to | `GET /problem-statements` + N× `/evaluators` | Evaluator dashboard, assigned work |
| `GET /eligibility-checks?application_ids=1,2,3` (or embed a compact `eligibility` object in the list above) | N× `/applications/{id}/eligibility-check` | Officer queue |
| `GET /officer/contracts` — contracts for the caller's selected applications | N× `/applications/{id}/contract` | Officer contracts |

Implement each as **one query with a JOIN / `IN (...)`**, not a Python loop that queries per row.

```python
# e.g. applications for every PS the officer owns — one round trip
rows = (
    db.query(Application)
    .join(ProblemStatement, Application.problem_statement_id == ProblemStatement.id)
    .filter(ProblemStatement.officer_id == current_user.id)
    .all()
)
```

> Tell frontend when each lands — swapping the fan-out for the bulk call is a small change per page.

### P0-2. Index every foreign key (Postgres does NOT do this automatically)

`app/models.py` has **~40 `ForeignKey` columns and only one index** (`users.email`). Postgres indexes primary keys and `unique=True` columns, but **not plain foreign keys** — so every `WHERE application_id = ?` / `problem_statement_id = ?` / `evaluator_id = ?` is a full table scan.

Add `index=True` to the non-unique FKs that are filtered on, then generate an Alembic migration. At minimum:

| Table (model) | Columns |
|---|---|
| `ProblemStatement` | `officer_id` |
| `Application` | `problem_statement_id`, `startup_id` |
| `ChecklistItem` | `application_id` |
| `PSEvaluatorAssignment` | `problem_statement_id`, `evaluator_id` |
| `EvaluationScore` | `application_id`, `evaluator_id` — plus composite `(application_id, evaluator_id)` |
| `COIDeclaration` | `application_id`, `evaluator_id` — plus composite `(application_id, evaluator_id)` |
| `RiskProfile` | `application_id` |
| `SelectionDecision` | `problem_statement_id` |
| `PilotMilestone` | `contract_id` |
| `Evidence` | `milestone_id` |
| `KPI` | `problem_statement_id` |
| `KPIVerdict` | `contract_id`, `kpi_id` |
| `Invite` | `problem_statement_id`, `startup_id` |
| `ComplianceRecord` | `application_id`, `problem_statement_id` |
| `AuditLog` | `(entity_type, entity_id)` composite, `actor_id` |

```python
application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, index=True)

# composite, inside the model class
__table_args__ = (Index("ix_eval_scores_app_evaluator", "application_id", "evaluator_id"),)
```

```bash
alembic revision --autogenerate -m "index foreign keys"
alembic upgrade head
```

Skip columns already `unique=True` (they have an index). Low risk, no API change.

### P0-3. Stop running the embedding model on every request

`app/matching.py` loads `SentenceTransformerEmbeddingFunction` and queries Chroma with `query_texts=[...]`, which **encodes the text through the model on every call**. That runs on:

- `GET /startup/problem-statements` — loaded on the **startup dashboard**, every visit
- `GET /problem-statements/{id}/matches`

Fixes, cheapest first:

1. **Cache the result.** Recommendations only change when a profile or PS description changes. Cache `get_recommended_ps_ids_for_startup` / `get_top_matching_startup_ids_for_ps` keyed by id, and invalidate inside `store_startup_description` / `store_problem_statement_description`.
2. **Query by stored embedding, not by text.** The description is already embedded at write time — fetch the stored vector (`collection.get(ids=[...], include=["embeddings"])`) and call `collection.query(query_embeddings=[...])`. No model inference per request.
3. **Warm the model at startup** (FastAPI lifespan) so the first request after boot isn't the one that loads the model.

### P0-4. Run with multiple workers, not `--reload`

`--reload` is single-process and dev-only.

```bash
# production-style
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
# or
gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 4 -b 0.0.0.0:8000
```

Workers ≈ CPU cores. Note: each worker loads the embedding model into memory — cache/pre-compute (P0-3) keeps that cheap.

---

## P1 — solid gains

### P1-1. Size the DB connection pool for the burst

`app/database.py`:

```python
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=20,       # default 5
    max_overflow=20,    # default 10
    pool_recycle=1800,
)
```

Keep `workers × (pool_size + max_overflow)` below Postgres `max_connections` (default 100). With 4 workers, `pool_size=10, max_overflow=10` is safer.

### P1-2. Don't load the User row from the DB on every request

`get_current_user` decodes the JWT, then queries `users` by id — once per request, i.e. 20–60× per fanned-out page. The token already carries `role` and `sub`.

Option A (simplest): cache the lookup per user id for a short TTL.
Option B: for read-only routes, trust the signed token's `sub` + `role` and skip the query; keep the DB lookup for writes.

### P1-3. Fix N+1 inside services

Pattern to grep for: a `for` loop that calls `db.query(...)` per item. Known candidates:

- `decision_readiness_service` — six checks, each its own query(s), plus calls into `scoring_service` and `evaluator_service` that re-query assignments. Load assignments / COI / scores once and pass them in.
- `qcbs` ranking (`GET /problem-statements/{id}/qcbs-ranking`) — likely scores every application separately; compute in one grouped query.
- Any response built by touching relationships in a loop — use `selectinload()` / `joinedload()`.

Turn on query logging while clicking through a page to find them:

```python
engine = create_engine(settings.DATABASE_URL, echo=True)  # dev only
```

### P1-4. Paginate list endpoints

`problem_statement_service.list_problem_statements` returns `query.all()` with no limit, and `GET /problem-statements` is called from 13 frontend screens. Add `limit` / `offset` (default e.g. 100) to it and to `/applications`, `/admin/users`, `/admin/startups`. Keep the response shape — frontend will add the params.

---

## P2 — polish

- **GZip JSON responses** (lists and the clause/compliance snapshots are large):
  ```python
  from fastapi.middleware.gzip import GZipMiddleware
  app.add_middleware(GZipMiddleware, minimum_size=1000)
  ```
- **Faster JSON:** `pip install orjson`, then `FastAPI(default_response_class=ORJSONResponse)`.
- **`Cache-Control` on near-static data:** `GET /rubric-criteria` is fixed for the MVP — send `Cache-Control: max-age=3600`.
- **Async only where it pays:** routes are sync `def` + psycopg2, which FastAPI runs in a threadpool — fine. Don't mix `async def` with blocking DB calls (that blocks the event loop).
- **`DEBUG=True` / `ENVIRONMENT=development`** are the defaults in `app/config.py` — set production values when deploying.
- **Measure:** add a middleware that logs request duration, or run `py-spy top --pid <uvicorn pid>` under load, before and after each change.

---

## Suggested order

| Step | Change | Effort | Impact |
|---|---|---|---|
| 1 | P0-2 FK indexes + migration | 30 min | High, zero API change |
| 2 | P0-4 workers, no `--reload` | 5 min | High |
| 3 | P0-3 cache / stored-embedding matching | 1–2 h | High on startup screens |
| 4 | P1-1 pool size | 5 min | Medium |
| 5 | P0-1 bulk endpoints (one at a time) | 1–2 h each | Highest on officer / evaluator / admin screens |
| 6 | P1-2 skip per-request User query | 1 h | Medium |
| 7 | P1-3 N+1 audit, P1-4 pagination | half day | Medium |
| 8 | P2 gzip, orjson, cache headers | 30 min | Low–medium |

## Out of scope (frontend confirms)

- **No CORS change needed.** Frontend proxies `/api/*` through Next (`frontend/next.config.ts`).
- **API contracts:** P0-1 adds new endpoints; nothing existing changes shape. P1-4 adds optional query params only.
