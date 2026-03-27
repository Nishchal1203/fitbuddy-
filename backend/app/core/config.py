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
