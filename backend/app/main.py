from fastapi import FastAPI

app = FastAPI(title="SIH26136 — Startup Procurement Platform")


@app.get("/health")
def health():
    return {"status": "ok"}


# Routers get included here layer by layer as they're built, e.g.:
# from app.routers import auth, problem_statements, applications
# app.include_router(auth.router)
# app.include_router(problem_statements.router)
# app.include_router(applications.router)
