from fastapi import FastAPI

from app.routers import (
    applications,
    auth,
    checklist,
    compliance_record,
    contract,
    decision_readiness,
    evaluators,
    invite,
    kpi_verdicts,
    matching,
    milestones,
    pilot_outcome,
    problem_statements,
    qcbs,
    risk_containment,
    sandbox_trial,
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
app.include_router(matching.router)

# Layer 5
app.include_router(sandbox_trial.router)
app.include_router(contract.router)
app.include_router(milestones.router)
app.include_router(kpi_verdicts.router)
app.include_router(pilot_outcome.router)
app.include_router(compliance_record.router)
app.include_router(invite.router)