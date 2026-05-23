import uuid
import enum
from datetime import datetime
from sqlalchemy import Text, DateTime, Enum as SAEnum, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class EditRequestStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"


class EditRequest(Base):
    __tablename__ = "edit_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    page_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pages.id", ondelete="CASCADE"), nullable=False)
    author_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    proposed_title: Mapped[str | None] = mapped_column(Text, nullable=True)
    proposed_blocks: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[EditRequestStatus] = mapped_column(
        SAEnum(EditRequestStatus, name="edit_request_status"),
        nullable=False,
        default=EditRequestStatus.pending,
    )
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    review_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    page: Mapped["Page"] = relationship("Page")
    author: Mapped["User"] = relationship("User", foreign_keys=[author_id], back_populates="edit_requests")
    reviewer: Mapped["User | None"] = relationship("User", foreign_keys=[reviewed_by])
