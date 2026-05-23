import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User, Role
from app.models.access_request import AccessRequest, AccessRequestStatus
from app.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    display_name: str
    role: str
    is_active: bool
    created_at: datetime


class RoleUpdate(BaseModel):
    role: Role


class AccessRequestOut(BaseModel):
    id: str
    user_id: str
    user_email: str
    user_display_name: str
    requested_role: str
    reason: str | None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewDecision(BaseModel):
    approved: bool


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.patch("/users/{user_id}/role", response_model=UserOut)
async def set_user_role(
    user_id: uuid.UUID,
    body: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    user.role = body.role
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/users/{user_id}/deactivate", response_model=UserOut)
async def deactivate_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    user.is_active = False
    await db.commit()
    await db.refresh(user)
    return user


# ── Access requests ───────────────────────────────────────────────────────────

@router.get("/access-requests", response_model=list[AccessRequestOut])
async def list_access_requests(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(AccessRequest).order_by(AccessRequest.created_at.desc())
    )
    requests = result.scalars().all()
    out = []
    for req in requests:
        user_res = await db.execute(select(User).where(User.id == req.user_id))
        user = user_res.scalar_one_or_none()
        out.append(AccessRequestOut(
            id=str(req.id),
            user_id=str(req.user_id),
            user_email=user.email if user else "",
            user_display_name=user.display_name if user else "",
            requested_role=req.requested_role,
            reason=req.reason,
            status=req.status.value,
            created_at=req.created_at,
        ))
    return out


@router.post("/access-requests/{request_id}/review", response_model=AccessRequestOut)
async def review_access_request(
    request_id: uuid.UUID,
    body: ReviewDecision,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    result = await db.execute(select(AccessRequest).where(AccessRequest.id == request_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Access request not found")
    if req.status != AccessRequestStatus.pending:
        raise HTTPException(status_code=400, detail="Request already reviewed")

    req.status = AccessRequestStatus.approved if body.approved else AccessRequestStatus.rejected
    req.reviewed_by = current_admin.id
    req.reviewed_at = datetime.now(timezone.utc)

    # If approved, upgrade the user's role
    if body.approved:
        user_res = await db.execute(select(User).where(User.id == req.user_id))
        user = user_res.scalar_one_or_none()
        if user:
            user.role = Role(req.requested_role)

    await db.commit()
    await db.refresh(req)

    user_res = await db.execute(select(User).where(User.id == req.user_id))
    user = user_res.scalar_one_or_none()
    return AccessRequestOut(
        id=str(req.id),
        user_id=str(req.user_id),
        user_email=user.email if user else "",
        user_display_name=user.display_name if user else "",
        requested_role=req.requested_role,
        reason=req.reason,
        status=req.status.value,
        created_at=req.created_at,
    )
