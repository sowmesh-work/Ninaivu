import uuid
from datetime import datetime
from sqlalchemy import Text, ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Link(Base):
    __tablename__ = "links"
    __table_args__ = (
        UniqueConstraint("source_page_id", "target_page_id", "relationship_type"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_page_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pages.id", ondelete="CASCADE"), nullable=False)
    target_page_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pages.id", ondelete="CASCADE"), nullable=False)
    relationship_type: Mapped[str] = mapped_column(Text, nullable=False, default="wiki")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    source_page: Mapped["Page"] = relationship("Page", foreign_keys=[source_page_id], back_populates="outgoing_links")
    target_page: Mapped["Page"] = relationship("Page", foreign_keys=[target_page_id], back_populates="incoming_links")
