import uuid
from fastapi import Cookie, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.core.security import decode_access_token
from app.models.user import User, Role
from app.config import settings


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    ninaivu_token: str | None = Cookie(default=None, alias=settings.cookie_name),
) -> User:
    """Extract and validate the JWT from the httpOnly cookie."""
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
    )
    if not ninaivu_token:
        raise credentials_exc
    try:
        payload = decode_access_token(ninaivu_token)
        user_id: str = payload.get("sub", "")
        if not user_id:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise credentials_exc
    return user


async def get_current_user_optional(
    db: AsyncSession = Depends(get_db),
    ninaivu_token: str | None = Cookie(default=None, alias=settings.cookie_name),
) -> User | None:
    """Like get_current_user but returns None instead of raising."""
    if not ninaivu_token:
        return None
    try:
        payload = decode_access_token(ninaivu_token)
        user_id: str = payload.get("sub", "")
        if not user_id:
            return None
        result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
        user = result.scalar_one_or_none()
        return user if (user and user.is_active) else None
    except Exception:
        return None


def require_roles(*roles: Role):
    """Factory that returns a dependency requiring the user to have one of the given roles."""
    async def _guard(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role: {[r.value for r in roles]}",
            )
        return current_user
    return _guard


require_viewer      = require_roles(Role.viewer, Role.contributor, Role.editor, Role.admin)
require_contributor = require_roles(Role.contributor, Role.editor, Role.admin)
require_editor      = require_roles(Role.editor, Role.admin)
require_admin       = require_roles(Role.admin)
