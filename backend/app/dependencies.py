import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.core.security import decode_supabase_token
from app.models.user import User, Role

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not credentials:
        raise credentials_exc

    try:
        payload = decode_supabase_token(credentials.credentials)
        supabase_id: str = payload.get("sub", "")
        email: str = payload.get("email", "")
        if not supabase_id:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    # Look up by supabase_id
    result = await db.execute(select(User).where(User.supabase_id == uuid.UUID(supabase_id)))
    user = result.scalar_one_or_none()

    # First-time login — auto-create profile
    if user is None:
        display_name = (
            payload.get("user_metadata", {}).get("display_name")
            or payload.get("user_metadata", {}).get("full_name")
            or payload.get("user_metadata", {}).get("name")
            or email.split("@")[0]
        )
        # Check if email already exists (legacy user)
        existing = await db.execute(select(User).where(User.email == email))
        user = existing.scalar_one_or_none()
        if user:
            # Link existing user to Supabase ID
            user.supabase_id = uuid.UUID(supabase_id)
        else:
            user = User(
                supabase_id=uuid.UUID(supabase_id),
                email=email,
                display_name=display_name,
                role=Role.viewer,
            )
            db.add(user)
        await db.commit()
        await db.refresh(user)

    if not user.is_active:
        raise credentials_exc

    return user


async def get_current_user_optional(
    db: AsyncSession = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> User | None:
    if not credentials:
        return None
    try:
        payload = decode_supabase_token(credentials.credentials)
        supabase_id: str = payload.get("sub", "")
        if not supabase_id:
            return None
        result = await db.execute(select(User).where(User.supabase_id == uuid.UUID(supabase_id)))
        user = result.scalar_one_or_none()
        return user if (user and user.is_active) else None
    except Exception:
        return None


def require_roles(*roles: Role):
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
