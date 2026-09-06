# ============================================================
# app/routers/invite.py
#
# ASSUMPTIONS (adjust to match your real codebase):
# - app.database.get_db is your DB session dependency
# - app.auth.get_current_user returns an object with .id and .role
# - Router is mounted in main.py, e.g.:
#     app.include_router(invite.router)
# ============================================================

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user
from app.models import ProblemStatement
from app.schemas.execution_schemas import (
    InviteCreate,
    InviteRead,
    InviteWithConversionRead,
)
from app.services import invite_service

router = APIRouter(tags=["invite"])


def require_ps_owner(problem_statement_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if user.role != "officer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an officer can invite startups",
        )
    ps = db.query(ProblemStatement).filter(ProblemStatement.id == problem_statement_id).first()
    if ps is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem statement not found")
    if ps.officer_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this problem statement",
        )
    return user


@router.post(
    "/problem-statements/{problem_statement_id}/invite",
    response_model=InviteRead,
    status_code=201,
)
def invite_startup(
    problem_statement_id: int,
    payload: InviteCreate,
    db: Session = Depends(get_db),
    user=Depends(require_ps_owner),
):
    return invite_service.create_invite(
        db=db,
        problem_statement_id=problem_statement_id,
        startup_id=payload.startup_id,
        actor_id=user.id,
    )


@router.get(
    "/problem-statements/{problem_statement_id}/invites",
    response_model=List[InviteWithConversionRead],
)
def list_ps_invites(
    problem_statement_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # Doc D: officer-owner / admin.
    if user.role == "officer":
        ps = db.query(ProblemStatement).filter(ProblemStatement.id == problem_statement_id).first()
        if ps is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem statement not found")
        if ps.officer_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this problem statement")
    elif user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return invite_service.list_invites_for_ps(db=db, problem_statement_id=problem_statement_id)


@router.get("/startup/invites", response_model=List[InviteRead])
def list_my_invites(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if user.role != "startup":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Startup access only")
    return invite_service.list_invites_for_startup(db=db, startup_id=user.id)