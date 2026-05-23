from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://ninaivu:ninaivu@localhost:5433/ninaivu"
    openai_api_key: str = ""

    # Auth
    jwt_secret_key: str = "change-me-in-production-use-a-long-random-string"
    jwt_algorithm: str = "HS256"
    jwt_expire_days: int = 7
    cookie_name: str = "ninaivu_token"

    class Config:
        env_file = ".env"


settings = Settings()
