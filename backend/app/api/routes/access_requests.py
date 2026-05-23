from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.database import get_db
from app.models.access_request import AccessRequest, AccessRequestStatus
from app.models.user import User
from app.dependencies import get_current_user

router = APIRouter(prefix="/access-requests", tags=["access-requests"])


class AccessRequestCreate(BaseModel):
    requested_role: str   # "contributor" | "editor"
    reason: str | None = None


class AccessRequestOut(BaseModel):
    id: str
    requested_role: str
    reason: str | None
    status: str
    created_at: datetime


@router.post("/", response_model=AccessRequestOut, status_code=status.HTTP_201_CREATED)
async def submit_access_request(
    body: AccessRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.requested_role not in ("contributor", "editor"):
        raise HTTPException(status_code=400, detail="requested_role must be 'contributor' or 'editor'")

    # Don't allow duplicate pending request
    existing = await db.execute(
        select(AccessRequest).where(
            AccessRequest.user_id == current_user.id,
            AccessRequest.status == AccessRequestStatus.pending,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You already have a pending access request")

    req = AccessRequest(
        user_id=current_user.id,
        requested_role=body.requested_role,
        reason=body.reason,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return AccessRequestOut(
        id=str(req.id),
        requested_role=req.requested_role,
        reason=req.reason,
        status=req.status.value,
        created_at=req.created_at,
    )


@router.get("/mine", response_model=list[AccessRequestOut])
async def my_access_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(AccessRequest)
        .where(AccessRequest.user_id == current_user.id)
        .order_by(AccessRequest.created_at.desc())
    )
    return [
        AccessRequestOut(
            id=str(r.id),
            requested_role=r.requested_role,
            reason=r.reason,
            status=r.status.value,
            created_at=r.created_at,
        )
        for r in result.scalars().all()
    ]
