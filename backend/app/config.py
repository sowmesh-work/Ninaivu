from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://ninaivu:ninaivu@localhost:5433/ninaivu"
    openai_api_key: str = ""

    # Supabase Auth
    supabase_jwt_secret: str = "your-supabase-jwt-secret"
    supabase_url: str = ""

    # CORS
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
