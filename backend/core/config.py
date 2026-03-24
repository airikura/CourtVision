from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gcs_bucket_name: str
    google_application_credentials: str = ""

    gemini_api_key: str

    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
