from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import pages

app = FastAPI(
    title="ninaivu",
    description="Knowledge graph + RAG API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pages.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ninaivu"}
