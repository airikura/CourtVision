from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gcs_bucket_name: str
    google_application_credentials: str = ""

    gemini_api_key: str

    frontend_url: str = "http://localhost:3000"

    # Database
    database_url: str = "sqlite+aiosqlite:///./courtvision.db"

    # JWT
    jwt_secret_key: str = "change-me-to-a-random-secret-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_days: int = 7

    # Google OAuth
    google_client_id: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
