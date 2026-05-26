# Plik: database.py
# Inicjalizacja silnika SQLAlchemy asynchronicznie i sesji.
# Używane przez: modele, routery, serwisy.

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True,  # dla celów edukacyjnych – loguje zapytania SQL
    future=True # Używamy trybu "future", który jest zalecany dla SQLAlchemy 2.0, nawet jeśli używamy składni 1.x. Zapewnia lepszą kompatybilność i przygotowuje na przyszłe zmiany w SQLAlchemy.
)

AsyncSessionLocal = async_sessionmaker(  # Tworzymy fabrykę sesji asynchronicznych, która będzie używana do tworzenia sesji w funkcjach zależności.
    engine,
    class_=AsyncSession, # Używamy AsyncSession, aby móc korzystać z asynchronicznych operacji na bazie danych.
    expire_on_commit=False # Domyślnie SQLAlchemy wygasza obiekty po commit, co może powodować problemy z asynchronicznym dostępem. Ustawiamy na False, aby obiekty pozostały dostępne po commit.
)

Base = declarative_base() # Podstawowa klasa dla modeli SQLAlchemy. Wszystkie modele będą dziedziczyć po tej klasie.

async def get_db():
    """Dependency injection: zwraca sesję bazy danych."""
    async with AsyncSessionLocal() as session: # Tworzymy nową sesję dla każdego requesta. async with zapewnia, że sesja zostanie poprawnie zamknięta po zakończeniu.
        yield session # Używamy yield, aby FastAPI mogło automatycznie zamknąć sesję po zakończeniu requesta.