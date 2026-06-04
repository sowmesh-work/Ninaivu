from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


class UserOut(BaseModel):
    id: str
    email: str
    display_name: str
    role: str

    class Config:
        from_attributes = True


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return UserOut(
        id=str(current_user.id),
        email=current_user.email,
        display_name=current_user.display_name,
        role=current_user.role.value,
    )
