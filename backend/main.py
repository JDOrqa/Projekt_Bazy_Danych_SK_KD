# Plik: main.py
# Główny plik aplikacji FastAPI.
# Tworzy tabele, seeduje dane, rejestruje routery.

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func
import logging

from database import engine, AsyncSessionLocal, Base
from routers import auth, users, lakes, catches, images, iot, limits, admin, visits
from models.uzytkownik import Uzytkownik
from models.rola import Rola, UzytkownikRola            
from models.uprawnienie import Uprawnienie, RolaUprawnienie
from models.gatunek import Gatunek
from models.lowisko import Lowisko
from models.metoda_polowu import MetodaPolowu
from models.przyneta import Przyneta
from utils.security import get_password_hash


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Funkcja seedująca dane (role, uprawnienia, gatunki, użytkowników)
async def seed_database(db: AsyncSession):
    """Dodaje podstawowe dane do bazy, jeśli tabele są puste"""
    logger.info("Sprawdzanie i uzupełnianie danych początkowych...")
    
    try:
        # 1. Role
        roles_data = [
            ("Wędkarz", "Podstawowa rola – może rejestrować połowy, przeglądać łowiska"),
            ("Właściciel", "Może tworzyć i zarządzać swoimi łowiskami"),
            ("Moderator", "Może weryfikować zdjęcia ryb, edytować gatunki"),
            ("Admin", "Pełny dostęp do systemu – zarządzanie użytkownikami, rolami, logami")
        ]
        for nazwa, opis in roles_data:
            result = await db.execute(select(Rola).where(Rola.nazwa == nazwa))
            existing = result.scalar_one_or_none()
            if not existing:
                db.add(Rola(nazwa=nazwa, opis=opis))
        await db.commit()
        
        # 2. Uprawnienia
        permissions = [
            ("lake.create", "Tworzenie łowiska", "łowiska"),
            ("lake.edit", "Edycja łowiska", "łowiska"),
            ("lake.delete", "Usuwanie łowiska", "łowiska"),
            ("gatunki.view", "Przegląd gatunków", "gatunki"),
            ("gatunki.create", "Dodawanie gatunków", "gatunki"),
            ("gatunki.edit", "Edycja gatunków", "gatunki"),
            ("gatunki.delete", "Usuwanie gatunków", "gatunki"),
            ("admin.users.view", "Podgląd użytkowników", "admin"),
            ("admin.users.edit", "Edycja użytkowników", "admin"),
            ("admin.roles.view", "Podgląd ról", "admin"),
            ("admin.roles.assign", "Przypisywanie ról", "admin"),
            ("images.verify", "Weryfikacja zdjęć", "images"),
            ("audit.view", "Przegląd logów", "audit"),
            ("population.create", "Dodawanie wpisów populacji", "populacja"),
            ("population.delete", "Usuwanie wpisów populacji", "populacja"),
        ]
        for kod, nazwa, modul in permissions:
            result = await db.execute(select(Uprawnienie).where(Uprawnienie.kod == kod))
            existing = result.scalar_one_or_none()
            if not existing:
                db.add(Uprawnienie(kod=kod, nazwa=nazwa, modul=modul))
        await db.commit()
        
        # 3. Przypisz uprawnienia do ról
        admin_role_result = await db.execute(select(Rola).where(Rola.nazwa == "Admin"))
        admin_role = admin_role_result.scalar_one_or_none()
        
        owner_role_result = await db.execute(select(Rola).where(Rola.nazwa == "Właściciel"))
        owner_role = owner_role_result.scalar_one_or_none()
        
        moderator_role_result = await db.execute(select(Rola).where(Rola.nazwa == "Moderator"))
        moderator_role = moderator_role_result.scalar_one_or_none()
        
        if admin_role:
            all_perms_result = await db.execute(select(Uprawnienie))
            all_perms = all_perms_result.scalars().all()
            for perm in all_perms:
                result = await db.execute(
                    select(RolaUprawnienie).where(
                        (RolaUprawnienie.rola_id == admin_role.id) & 
                        (RolaUprawnienie.uprawnienie_id == perm.id)
                    )
                )
                if not result.scalar_one_or_none():
                    db.add(RolaUprawnienie(rola_id=admin_role.id, uprawnienie_id=perm.id))
        
        if owner_role:
            owner_perms = ['lake.create', 'lake.edit', 'lake.delete', 'population.create', 'population.delete']
            for kod in owner_perms:
                perm_result = await db.execute(select(Uprawnienie).where(Uprawnienie.kod == kod))
                perm = perm_result.scalar_one_or_none()
                if perm:
                    result = await db.execute(
                        select(RolaUprawnienie).where(
                            (RolaUprawnienie.rola_id == owner_role.id) & 
                            (RolaUprawnienie.uprawnienie_id == perm.id)
                        )
                    )
                    if not result.scalar_one_or_none():
                        db.add(RolaUprawnienie(rola_id=owner_role.id, uprawnienie_id=perm.id))
        
        if moderator_role:
            mod_perms = ['gatunki.create', 'gatunki.edit', 'gatunki.delete', 'images.verify']
            for kod in mod_perms:
                perm_result = await db.execute(select(Uprawnienie).where(Uprawnienie.kod == kod))
                perm = perm_result.scalar_one_or_none()
                if perm:
                    result = await db.execute(
                        select(RolaUprawnienie).where(
                            (RolaUprawnienie.rola_id == moderator_role.id) & 
                            (RolaUprawnienie.uprawnienie_id == perm.id)
                        )
                    )
                    if not result.scalar_one_or_none():
                        db.add(RolaUprawnienie(rola_id=moderator_role.id, uprawnienie_id=perm.id))
        await db.commit()
        
        # 4. Gatunki
        gatunki = [
            ("Szczupak", "Esox lucius", "https://upload.wikimedia.org/wikipedia/commons/0/03/HandlingBigPike.JPG", "Drapieżnik, wymiar ochronny 50 cm"),
            ("Okoń", "Perca fluviatilis", "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Perca_fluviatilis_2008_G1.jpg/640px-Perca_fluviatilis_2008_G1.jp", "Brak wymiaru, limit 20 szt."),
            ("Karp", "Cyprinus carpio", "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Cyprinus_carpio-King_Carp.jpg/640px-Cyprinus_carpio-King_Carp.jpg", "Wymiar 40 cm"),
            ("Leszcz", "Abramis brama", "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Abramis_brama_by_RpM.JPG/640px-Abramis_brama_by_RpM.JPG", "Wymiar 25 cm"),
            ("Sandacz", "Sander lucioperca", "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Hal_-_Sander_lucioperca_-_1.jpg/640px-Hal_-_Sander_lucioperca_-_1.jpg", "Wymiar 45 cm"),
        ]
        for nazwa, lacina, url, opis in gatunki:
            result = await db.execute(select(Gatunek).where(Gatunek.nazwa_polska == nazwa))
            if not result.scalar_one_or_none():
                db.add(Gatunek(nazwa_polska=nazwa, nazwa_lacina=lacina, url_zdjecia=url, opis=opis))
        await db.commit()
        
        # 5. Metody połowu i przynęty
        metody = ["Spinning", "Grunt", "Muchówka", "Spławik"]
        for m in metody:
            result = await db.execute(select(MetodaPolowu).where(MetodaPolowu.nazwa == m))
            if not result.scalar_one_or_none():
                db.add(MetodaPolowu(nazwa=m))
        
        przynety = ["Wobler", "Gumka", "Robak", "Kukurydza", "Pellet"]
        for p in przynety:
            result = await db.execute(select(Przyneta).where(Przyneta.nazwa == p))
            if not result.scalar_one_or_none():
                db.add(Przyneta(nazwa=p))
        await db.commit()
        
        # 6. Użytkownik admin
        admin_email = "admin@example.com"
        admin_user_result = await db.execute(select(Uzytkownik).where(Uzytkownik.email == admin_email))
        if not admin_user_result.scalar_one_or_none():
            hashed = get_password_hash("admin123")
            admin_user = Uzytkownik(
                email=admin_email, 
                haslo_hash=hashed, 
                imie="Admin", 
                nazwisko="Systemowy", 
                status="aktywny"
            )
            db.add(admin_user)
            await db.commit()
            
            # Przypisz rolę Admin
            admin_user_result = await db.execute(select(Uzytkownik).where(Uzytkownik.email == admin_email))
            user = admin_user_result.scalar_one()
            if admin_role:
                result = await db.execute(
                    select(UzytkownikRola).where(
                        (UzytkownikRola.uzytkownik_id == user.id) & 
                        (UzytkownikRola.rola_id == admin_role.id)
                    )
                )
                if not result.scalar_one_or_none():
                    db.add(UzytkownikRola(uzytkownik_id=user.id, rola_id=admin_role.id))
                    await db.commit()

         # 7. Przykładowe łowiska (jeśli brak)
        lowiska_data = [
            ("Jezioro Białe", "jezioro", 
             "POLYGON((21.5 52.0, 21.6 52.0, 21.6 52.1, 21.5 52.1, 21.5 52.0))", 
             150.5, 12.3, "Piękne jezioro z czystą wodą."),
            ("Rzeka Czarna", "rzeka", 
             "POLYGON((22.0 51.9, 22.2 51.9, 22.2 52.0, 22.0 52.0, 22.0 51.9))", 
             80.0, 4.5, "Rzeka o bystrym nurcie, dobra na spinning."),
        ]
        # Pobierz właściciela (np. admina lub pierwszego użytkownika)
        owner_result = await db.execute(select(Uzytkownik).where(Uzytkownik.email == "admin@example.com"))
        owner = owner_result.scalar_one_or_none()
        if not owner:
            # Jeśli admin nie istnieje (nietypowe), weź pierwszego użytkownika
            owner_result = await db.execute(select(Uzytkownik).limit(1))
            owner = owner_result.scalar_one_or_none()
        
        if owner:
            for nazwa, typ, wkt, powierzchnia, glebokosc, opis in lowiska_data:
                # Sprawdź czy łowisko już istnieje
                result = await db.execute(select(Lowisko).where(Lowisko.nazwa == nazwa))
                if not result.scalar_one_or_none():
                    # Konwersja WKT na geometrię PostGIS
                    geom = func.ST_GeomFromText(wkt, 4326)
                    lowisko = Lowisko(
                        nazwa=nazwa,
                        typ=typ,
                        granice=geom,
                        powierzchnia_ha=powierzchnia,
                        glebokosc_max=glebokosc,
                        opis=opis,
                        wlasciciel_id=owner.id
                    )
                    db.add(lowisko)
            await db.commit()
            logger.info("Dodano przykładowe łowiska.")
        else:
            logger.warning("Brak użytkownika – nie można dodać łowisk.")
        
        logger.info("Seedowanie zakończone.")
        
    except Exception as e:
        logger.error(f"Błąd podczas seedowania bazy: {e}")
        await db.rollback()
        raise

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Funkcja wykonywana przy starcie i zamknięciu aplikacji"""
    # Tworzenie tabel (jeśli nie istnieją)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Seed danych
    async with AsyncSessionLocal() as db:
        await seed_database(db)
    logger.info("Aplikacja uruchomiona, baza gotowa.")
    yield
    # Przy zamykaniu
    await engine.dispose()
    logger.info("Aplikacja zamknięta.")

app = FastAPI(
    title="System Zarządzania Łowiskami",
    description="API dla wędkarzy i zarządców łowisk",
    version="1.0.0",
    lifespan=lifespan
)

# CORS – dla frontendu React
app.add_middleware(
    CORSMiddleware,  # Dodaje middleware do aplikacji FastAPI (obsługa CORS)

    allow_origins=["http://localhost:3000"],  
    # Lista adresów (origin), które mogą wysyłać zapytania do backendu
    # Tutaj: tylko frontend działający na http://localhost:3000

    allow_credentials=True,  
    # Pozwala wysyłać ciasteczka (cookies), nagłówki autoryzacyjne itp.
    # np. sesje, tokeny w cookie

    allow_methods=["*"],  
    # Zezwala na wszystkie metody HTTP:
    # GET, POST, PUT, DELETE, PATCH itd.

    allow_headers=["*"],  
    # Zezwala na wszystkie nagłówki HTTP w zapytaniach
    # np. Authorization, Content-Type itd.
)

# Rejestracja routerów
app.include_router(auth.router, prefix="/api/auth", tags=["autoryzacja"])
app.include_router(users.router, prefix="/api/users", tags=["użytkownicy"])
app.include_router(lakes.router, prefix="/api/lakes", tags=["łowiska"])
app.include_router(catches.router, prefix="/api/catches", tags=["połowy"])
app.include_router(visits.router, prefix="/api/visits", tags=["wizyty"])
app.include_router(images.router, prefix="/api/images", tags=["zdjęcia"])
app.include_router(iot.router, prefix="/api/iot", tags=["IoT"])
app.include_router(limits.router, prefix="/api/limits", tags=["limity"])
app.include_router(admin.router, prefix="/api/admin", tags=["administracja"])

@app.get("/")
async def root():
    return {"message": "System Zarządzania Łowiskami - API działa"}

@app.get("/health")
async def health():
    return {"status": "ok"}