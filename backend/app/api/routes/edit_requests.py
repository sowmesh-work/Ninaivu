import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.database import get_db
from app.models.page import Page
from app.models.block import Block
from app.models.edit_request import EditRequest, EditRequestStatus
from app.models.user import User, Role
from app.dependencies import get_current_user, require_contributor, require_editor

router = APIRouter(prefix="/edit-requests", tags=["edit-requests"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class BlockIn(BaseModel):
    type: str = "paragraph"
    content: dict = {}
    block_index: int = 0


class EditRequestCreate(BaseModel):
    page_id: uuid.UUID
    proposed_title: str | None = None
    proposed_blocks: list[BlockIn]
    note: str | None = None


class EditRequestOut(BaseModel):
    id: str
    page_id: str
    page_title: str
    author_id: str
    author_name: str
    proposed_title: str | None
    proposed_blocks: list
    note: str | None
    status: str
    review_comment: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewDecision(BaseModel):
    approved: bool
    comment: str | None = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/", response_model=EditRequestOut, status_code=status.HTTP_201_CREATED)
async def submit_edit_request(
    body: EditRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_contributor),
):
    """Any contributor/editor/admin can submit a proposed edit."""
    page_res = await db.execute(select(Page).where(Page.id == body.page_id))
    page = page_res.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    req = EditRequest(
        page_id=body.page_id,
        author_id=current_user.id,
        proposed_title=body.proposed_title,
        proposed_blocks=[b.dict() for b in body.proposed_blocks],
        note=body.note,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    return EditRequestOut(
        id=str(req.id),
        page_id=str(req.page_id),
        page_title=page.title,
        author_id=str(req.author_id),
        author_name=current_user.display_name,
        proposed_title=req.proposed_title,
        proposed_blocks=req.proposed_blocks,
        note=req.note,
        status=req.status.value,
        review_comment=req.review_comment,
        created_at=req.created_at,
    )


@router.get("/", response_model=list[EditRequestOut])
async def list_edit_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Editors/admins see all requests. Contributors see only their own."""
    if current_user.role in (Role.editor, Role.admin):
        result = await db.execute(select(EditRequest).order_by(EditRequest.created_at.desc()))
    else:
        result = await db.execute(
            select(EditRequest)
            .where(EditRequest.author_id == current_user.id)
            .order_by(EditRequest.created_at.desc())
        )
    requests = result.scalars().all()
    out = []
    for req in requests:
        page_res = await db.execute(select(Page).where(Page.id == req.page_id))
        page = page_res.scalar_one_or_none()
        author_res = await db.execute(select(User).where(User.id == req.author_id))
        author = author_res.scalar_one_or_none()
        out.append(EditRequestOut(
            id=str(req.id),
            page_id=str(req.page_id),
            page_title=page.title if page else "Deleted page",
            author_id=str(req.author_id),
            author_name=author.display_name if author else "Unknown",
            proposed_title=req.proposed_title,
            proposed_blocks=req.proposed_blocks,
            note=req.note,
            status=req.status.value,
            review_comment=req.review_comment,
            created_at=req.created_at,
        ))
    return out


@router.get("/{request_id}", response_model=EditRequestOut)
async def get_edit_request(
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(EditRequest).where(EditRequest.id == request_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Edit request not found")
    # Contributors can only see their own
    if current_user.role == Role.contributor and req.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    page_res = await db.execute(select(Page).where(Page.id == req.page_id))
    page = page_res.scalar_one_or_none()
    author_res = await db.execute(select(User).where(User.id == req.author_id))
    author = author_res.scalar_one_or_none()

    return EditRequestOut(
        id=str(req.id),
        page_id=str(req.page_id),
        page_title=page.title if page else "Deleted page",
        author_id=str(req.author_id),
        author_name=author.display_name if author else "Unknown",
        proposed_title=req.proposed_title,
        proposed_blocks=req.proposed_blocks,
        note=req.note,
        status=req.status.value,
        review_comment=req.review_comment,
        created_at=req.created_at,
    )


@router.post("/{request_id}/review", response_model=EditRequestOut)
async def review_edit_request(
    request_id: uuid.UUID,
    body: ReviewDecision,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_editor),
):
    """Editor or admin accepts/rejects the proposed edit."""
    result = await db.execute(select(EditRequest).where(EditRequest.id == request_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Edit request not found")
    if req.status != EditRequestStatus.pending:
        raise HTTPException(status_code=400, detail="Already reviewed")

    req.status = EditRequestStatus.accepted if body.approved else EditRequestStatus.rejected
    req.reviewed_by = current_user.id
    req.reviewed_at = datetime.now(timezone.utc)
    req.review_comment = body.comment

    if body.approved:
        # Apply proposed blocks to the live page
        page_res = await db.execute(select(Page).where(Page.id == req.page_id))
        page = page_res.scalar_one_or_none()
        if page:
            if req.proposed_title:
                page.title = req.proposed_title
            await db.execute(delete(Block).where(Block.page_id == page.id))
            for i, b in enumerate(req.proposed_blocks):
                db.add(Block(
                    page_id=page.id,
                    type=b.get("type", "paragraph"),
                    content=b.get("content", {}),
                    block_index=i,
                ))

    await db.commit()
    await db.refresh(req)

    page_res = await db.execute(select(Page).where(Page.id == req.page_id))
    page = page_res.scalar_one_or_none()
    author_res = await db.execute(select(User).where(User.id == req.author_id))
    author = author_res.scalar_one_or_none()

    return EditRequestOut(
        id=str(req.id),
        page_id=str(req.page_id),
        page_title=page.title if page else "Deleted page",
        author_id=str(req.author_id),
        author_name=author.display_name if author else "Unknown",
        proposed_title=req.proposed_title,
        proposed_blocks=req.proposed_blocks,
        note=req.note,
        status=req.status.value,
        review_comment=req.review_comment,
        created_at=req.created_at,
    )
