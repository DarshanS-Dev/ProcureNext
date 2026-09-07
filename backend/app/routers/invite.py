"""
app/routers/invite.py
Invite endpoints.

Role access per Doc D:
  POST invite:     officer-owner of the PS
  GET PS invites:  officer-owner / admin
  GET my invites:  startup only
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user, require_role
from app.models import RoleEnum, ProblemStatement
from app.schemas.execution_schemas import (
    InviteCreate,
    InviteRead,
    InviteWithConversionRead,
)
from app.services import invite_service

router = APIRouter(tags=["invite"])


def require_ps_owner(
    problem_statement_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role(RoleEnum.officer)),
):
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
    user=Depends(require_role(RoleEnum.officer, RoleEnum.admin)),
):
    if user.role == RoleEnum.officer:
        ps = db.query(ProblemStatement).filter(ProblemStatement.id == problem_statement_id).first()
        if ps is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem statement not found")
        if ps.officer_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this problem statement")

    return invite_service.list_invites_for_ps(db=db, problem_statement_id=problem_statement_id)


@router.get("/startup/invites", response_model=List[InviteRead])
def list_my_invites(
    db: Session = Depends(get_db),
    user=Depends(require_role(RoleEnum.startup)),
):
    return invite_service.list_invites_for_startup(db=db, startup_id=user.id)