from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://ninaivu:ninaivu@localhost:5433/ninaivu"
    openai_api_key: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
