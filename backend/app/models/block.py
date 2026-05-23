import uuid
from datetime import datetime
from sqlalchemy import Text, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class Block(Base):
    __tablename__ = "blocks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    page_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pages.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[str] = mapped_column(Text, nullable=False, default="paragraph")
    content: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    block_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    page: Mapped["Page"] = relationship("Page", back_populates="blocks")
    chunks: Mapped[list["Chunk"]] = relationship("Chunk", back_populates="block", cascade="all, delete-orphan")
