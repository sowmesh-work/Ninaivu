from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import pages
from app.api.routes.auth import router as auth_router
from app.api.routes.admin import router as admin_router
from app.api.routes.edit_requests import router as edit_requests_router
from app.api.routes.access_requests import router as access_requests_router
from app.database import engine, Base
from app.config import settings
import app.models  # noqa: F401 — ensure all models are registered


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="ninaivu",
    description="Knowledge graph + RAG API",
    version="0.1.0",
    lifespan=lifespan,
)

allowed_origins = ["http://localhost:3000"]
if settings.frontend_url and settings.frontend_url not in allowed_origins:
    allowed_origins.append(settings.frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,   # required for cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pages.router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(edit_requests_router, prefix="/api")
app.include_router(access_requests_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ninaivu"}
