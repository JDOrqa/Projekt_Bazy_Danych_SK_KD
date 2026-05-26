import asyncio
import os
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context


from database import Base
from models import *  

# Konfiguracja logowania na podstawie pliku alembic.ini (jeśli istnieje)
if context.config.config_file_name is not None:
    fileConfig(context.config.config_file_name)

# Metadane modeli – to jest kluczowe dla autogeneracji
target_metadata = Base.metadata
exclude_tables = [
    'spatial_ref_sys',
    'countysub_lookup',
    'geocode_settings_default',
    'zip_state_loc',
    'direction_lookup',
    'street_type_lookup',
    'zip_state',
    'addrfeat',
    'loader_lookuptables',
    'tabblock',
    'tabblock20',
    'geocode_settings',
    'topology',
    'place_lookup',
    'pagc_gaz',
    'zip_lookup_base',
    'place',
    'pagc_rules',
    'tract',
    'secondary_unit_lookup',
    'zip_lookup_all',
    'state',
    'edges',
    'addr',
    'zip_lookup',
    'bg',
    'pagc_lex',
    'state_lookup',
    'county',
    'loader_variables',
    'cousub',
    'featnames',
    'loader_platform',
    'faces',
    'zcta5',
    'layer',
    'county_lookup',
]

# Funkcja decydująca, czy obiekt ma być uwzględniony w migracji
def include_object(object, name, type_, reflected, compare_to):
    if type_ == "table" and name in exclude_tables:
        return False
  
    return True
def run_migrations_offline():
    """Uruchom migracje w trybie offline (bez połączenia z bazą)."""
    url = os.getenv("DATABASE_URL")
    if not url:
        raise ValueError("Brak zmiennej środowiskowej DATABASE_URL")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection):
    """Funkcja pomocnicza uruchamiana na synchronicznym połączeniu."""
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_migrations_online():
    """Uruchom migracje w trybie online (asynchronicznie)."""
    # Pobierz URL bazy ze zmiennej środowiskowej
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("Brak zmiennej środowiskowej DATABASE_URL")

    # Ustaw URL w konfiguracji Alembic
    config = context.config
    config.set_main_option("sqlalchemy.url", database_url)

    # Stwórz asynchroniczny silnik
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()

# Wybór trybu na podstawie kontekstu Alembic
if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())