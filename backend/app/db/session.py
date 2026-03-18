from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import QueuePool

from app.core.config import get_settings


settings = get_settings()


class Base(DeclarativeBase):
	pass


def _create_engine():
	url = settings.database_url
	connect_args = {}
	if url.startswith("sqlite"):
		connect_args = {"check_same_thread": False}
	return create_engine(
		url,
		poolclass=QueuePool,
		pool_pre_ping=True,
		connect_args=connect_args,
	)


engine = _create_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
