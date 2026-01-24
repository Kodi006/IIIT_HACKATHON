"""
SQLite Database Configuration
Uses SQLAlchemy for ORM
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Database file will be created in backend directory
DATABASE_URL = "sqlite:///./clinical_copilot.db"

# Create engine with SQLite-specific settings
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # Required for SQLite with FastAPI
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables"""
    from app.models.db_models import AnalysisRecord  # Import to register model
    Base.metadata.create_all(bind=engine)
