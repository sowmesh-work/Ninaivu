import uuid
from datetime import datetime
from sqlalchemy import Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class Page(Base):
    __tablename__ = "pages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    blocks: Mapped[list["Block"]] = relationship("Block", back_populates="page", cascade="all, delete-orphan", order_by="Block.block_index")
    outgoing_links: Mapped[list["Link"]] = relationship("Link", foreign_keys="Link.source_page_id", back_populates="source_page", cascade="all, delete-orphan")
    incoming_links: Mapped[list["Link"]] = relationship("Link", foreign_keys="Link.target_page_id", back_populates="target_page")
    chunks: Mapped[list["Chunk"]] = relationship("Chunk", back_populates="page", cascade="all, delete-orphan")
    page_tags: Mapped[list["PageTag"]] = relationship("PageTag", back_populates="page", cascade="all, delete-orphan")
