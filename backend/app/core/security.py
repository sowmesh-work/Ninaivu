from typing import Any
from jose import jwt, JWTError
from app.config import settings


def decode_supabase_token(token: str) -> dict[str, Any]:
    """Verify and decode a Supabase-issued JWT. Raises JWTError if invalid."""
    return jwt.decode(
        token,
        settings.supabase_jwt_secret,
        algorithms=["HS256"],
        audience="authenticated",
    )
