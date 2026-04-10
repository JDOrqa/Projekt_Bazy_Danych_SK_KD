# Plik: database.py
# Inicjalizacja silnika SQLAlchemy asynchronicznie i sesji.
# Używane przez: modele, routery, serwisy.

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True,  # dla celów edukacyjnych – loguje zapytania SQL
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    """Dependency injection: zwraca sesję bazy danych."""
    async with AsyncSessionLocal() as session:
        yield session