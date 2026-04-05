from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
	app_name: str = Field(default="Fitbuddy Backend")

	database_url: str = Field(
		default="postgresql+psycopg://postgres:root123@localhost:5432/postgres",
		validation_alias="DATABASE_URL",
	)

	jwt_secret_key: str = Field(default="devsupersecret", validation_alias="JWT_SECRET_KEY")
	jwt_algorithm: str = Field(default="HS256", validation_alias="JWT_ALGORITHM")
	access_token_expire_minutes: int = Field(default=60, validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES")
	refresh_token_expire_days: int = Field(default=30, validation_alias="REFRESH_TOKEN_EXPIRE_DAYS")
	auth_cookie_secure: bool = Field(default=False, validation_alias="AUTH_COOKIE_SECURE")
	frontend_base_url: str = Field(default="http://localhost:3000", validation_alias="FRONTEND_BASE_URL")
	google_client_id: str = Field(default="", validation_alias="GOOGLE_CLIENT_ID")
	google_client_secret: str = Field(default="", validation_alias="GOOGLE_CLIENT_SECRET")
	google_redirect_uri: str = Field(default="http://localhost:8000/api/auth/google/callback", validation_alias="GOOGLE_REDIRECT_URI")

	cerebras_api_key: str = Field(default="", validation_alias="CEREBRAS_API_KEY")
	cerebras_base_url: str = Field(default="https://api.cerebras.ai/v1", validation_alias="CEREBRAS_BASE_URL")
	cerebras_model: str = Field(default="llama-3.3-70b", validation_alias="CEREBRAS_MODEL")
	cerebras_timeout_seconds: int = Field(default=45, validation_alias="CEREBRAS_TIMEOUT_SECONDS")
	cerebras_retry_attempts: int = Field(default=2, validation_alias="CEREBRAS_RETRY_ATTEMPTS")
	cerebras_retry_backoff_seconds: float = Field(default=0.6, validation_alias="CEREBRAS_RETRY_BACKOFF_SECONDS")

	class Config:
		env_file = ".env"
		extra = "ignore"


def get_settings() -> Settings:
	return Settings()
