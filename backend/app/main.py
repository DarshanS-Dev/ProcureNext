from fastapi import FastAPI

from app.routers import (
    applications,
    auth,
    checklist,
    decision_readiness,
    evaluators,
    problem_statements,
    qcbs,
    risk_containment,
    scoring,
    startup_profiles,
)

app = FastAPI(title="SIH26136 — Startup Procurement Platform")


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(startup_profiles.router)
app.include_router(problem_statements.router)
app.include_router(applications.router)
app.include_router(checklist.router)
app.include_router(evaluators.router)
app.include_router(scoring.router)
app.include_router(qcbs.router)
app.include_router(risk_containment.router)
app.include_router(decision_readiness.router)

# Not yet wired — Layer 5 (SandboxTrial, Contract, PilotMilestone, Evidence,
# KPI verdicts, PilotOutcome) + Invite + ComplianceRecord are Teammate A's
# routers, not built in this codebase pass.