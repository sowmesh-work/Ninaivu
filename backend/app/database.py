import ssl
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from app.config import settings

# Strip any ssl param from URL — handled via connect_args
db_url = settings.database_url.split("?")[0]

ssl_context = ssl.create_default_context()

# NullPool + statement_cache_size=0 is required for pgbouncer transaction mode
engine = create_async_engine(
    db_url,
    echo=False,
    poolclass=NullPool,
    connect_args={
        "ssl": ssl_context,
        "statement_cache_size": 0,
    },
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
