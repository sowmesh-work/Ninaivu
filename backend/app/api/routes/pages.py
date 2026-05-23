import uuid
import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, or_, func
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models.page import Page
from app.models.block import Block
from app.models.link import Link
from app.models.user import User
from app.dependencies import get_current_user, require_editor, require_viewer

router = APIRouter(prefix="/pages", tags=["pages"])


# ---------- Schemas ----------

class BlockIn(BaseModel):
    id: Optional[uuid.UUID] = None
    type: str = "paragraph"
    content: dict = {}
    block_index: int = 0


class PageCreate(BaseModel):
    title: str
    blocks: list[BlockIn] = []


class PageUpdate(BaseModel):
    title: Optional[str] = None
    blocks: Optional[list[BlockIn]] = None


class BlockOut(BaseModel):
    id: uuid.UUID
    type: str
    content: dict
    block_index: int

    class Config:
        from_attributes = True


class PageOut(BaseModel):
    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime
    blocks: list[BlockOut] = []

    class Config:
        from_attributes = True


class PageSummary(BaseModel):
    id: uuid.UUID
    title: str
    updated_at: datetime

    class Config:
        from_attributes = True


class BacklinkOut(BaseModel):
    id: uuid.UUID
    title: str

    class Config:
        from_attributes = True


# ---------- Helpers ----------

WIKI_LINK_RE = re.compile(r"\[\[([^\]]+)\]\]")


def extract_wiki_links(blocks: list[Block]) -> set[str]:
    """Pull all [[Page Title]] references from block content."""
    titles: set[str] = set()
    for block in blocks:
        # Walk the Tiptap JSON to find text nodes
        _collect_text(block.content, titles)
    return titles


def _collect_text(node: dict, titles: set[str]) -> None:
    if isinstance(node, dict):
        if node.get("type") == "text":
            text = node.get("text", "")
            for m in WIKI_LINK_RE.finditer(text):
                titles.add(m.group(1).strip())
        for child in node.get("content", []):
            _collect_text(child, titles)


async def sync_wiki_links(page: Page, db: AsyncSession) -> None:
    """Recompute wiki-link edges for a page after a save."""
    titles = extract_wiki_links(page.blocks)

    # Delete old wiki links from this page
    await db.execute(
        delete(Link).where(
            Link.source_page_id == page.id,
            Link.relationship_type == "wiki",
        )
    )

    # Re-create links for each referenced title
    for title in titles:
        result = await db.execute(select(Page).where(Page.title == title))
        target = result.scalar_one_or_none()
        if target and target.id != page.id:
            db.add(Link(source_page_id=page.id, target_page_id=target.id, relationship_type="wiki"))

    await db.flush()


# ---------- Routes ----------

@router.get("/", response_model=list[PageSummary])
async def list_pages(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_viewer),   # any authenticated user can list
):
    result = await db.execute(select(Page).order_by(Page.updated_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=PageOut, status_code=status.HTTP_201_CREATED)
async def create_page(body: PageCreate, db: AsyncSession = Depends(get_db), _: User = Depends(require_editor)):
    page = Page(title=body.title)
    db.add(page)
    await db.flush()  # get page.id

    for i, b in enumerate(body.blocks):
        block = Block(page_id=page.id, type=b.type, content=b.content, block_index=i)
        db.add(block)

    await db.flush()
    await db.refresh(page, ["blocks"])
    await sync_wiki_links(page, db)
    await db.commit()
    await db.refresh(page, ["blocks"])
    return page


@router.get("/search", response_model=list[PageSummary])
async def search_pages(q: str, db: AsyncSession = Depends(get_db), _: User = Depends(require_viewer)):
    """Full-text trigram search over page titles."""
    result = await db.execute(
        select(Page)
        .where(Page.title.ilike(f"%{q}%"))
        .order_by(Page.updated_at.desc())
        .limit(20)
    )
    return result.scalars().all()


@router.get("/{page_id}", response_model=PageOut)
async def get_page(page_id: uuid.UUID, db: AsyncSession = Depends(get_db), _: User = Depends(require_viewer)):
    result = await db.execute(select(Page).where(Page.id == page_id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    await db.refresh(page, ["blocks"])
    return page


@router.put("/{page_id}", response_model=PageOut)
async def update_page(page_id: uuid.UUID, body: PageUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(require_editor)):
    result = await db.execute(select(Page).where(Page.id == page_id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    if body.title is not None:
        page.title = body.title

    if body.blocks is not None:
        # Delete existing blocks and replace
        await db.execute(delete(Block).where(Block.page_id == page_id))
        for i, b in enumerate(body.blocks):
            block = Block(page_id=page.id, type=b.type, content=b.content, block_index=i)
            db.add(block)

    await db.flush()
    await db.refresh(page, ["blocks"])
    await sync_wiki_links(page, db)
    await db.commit()
    await db.refresh(page, ["blocks"])
    return page


@router.delete("/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_page(page_id: uuid.UUID, db: AsyncSession = Depends(get_db), _: User = Depends(require_editor)):
    result = await db.execute(select(Page).where(Page.id == page_id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    await db.delete(page)
    await db.commit()


@router.get("/{page_id}/backlinks", response_model=list[BacklinkOut])
async def get_backlinks(page_id: uuid.UUID, db: AsyncSession = Depends(get_db), _: User = Depends(require_viewer)):
    """Return all pages that link TO this page."""
    result = await db.execute(
        select(Page)
        .join(Link, Link.source_page_id == Page.id)
        .where(Link.target_page_id == page_id)
    )
    return result.scalars().all()
