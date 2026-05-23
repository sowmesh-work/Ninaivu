import uuid
from sqlalchemy import Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False, unique=True)

    page_tags: Mapped[list["PageTag"]] = relationship("PageTag", back_populates="tag")


class PageTag(Base):
    __tablename__ = "page_tags"

    page_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pages.id", ondelete="CASCADE"), primary_key=True)
    tag_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)

    page: Mapped["Page"] = relationship("Page", back_populates="page_tags")
    tag: Mapped["Tag"] = relationship("Tag", back_populates="page_tags")
