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

	class Config:
		env_file = ".env"
		extra = "ignore"


def get_settings() -> Settings:
	return Settings()
