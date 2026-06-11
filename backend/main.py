# Plik: main.py
# Główny plik aplikacji FastAPI.
# Tworzy tabele, seeduje dane, rejestruje routery.

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func
import logging
from database import engine, AsyncSessionLocal, Base
from routers import auth, users, lakes, catches, images, iot, limits, admin, zarybienia, visits
from models.uzytkownik import Uzytkownik
from models.rola import Rola, UzytkownikRola            
from models.uprawnienie import Uprawnienie, RolaUprawnienie
from models.gatunek import Gatunek
from models.lowisko import Lowisko
from models.metoda_polowu import MetodaPolowu
from models.przyneta import Przyneta
from models.stacja_pomiarowa import StacjaPomiarowa
from models.odczyt_srodowiskowy import OdczytSrodowiskowy
from utils.security import get_password_hash
from routers import measure
from fastapi.staticfiles import StaticFiles
import os

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
            ("Szczupak", "Esox lucius", "https://images.pexels.com/photos/17213802/pexels-photo-17213802.jpeg", "Drapieżnik, wymiar ochronny 50 cm"),
            ("Okoń", "Perca fluviatilis", "https://images.pexels.com/photos/9356834/pexels-photo-9356834.jpeg", "Brak wymiaru, limit 20 szt."),
            ("Karp", "Cyprinus carpio", "https://images.pexels.com/photos/10462564/pexels-photo-10462564.jpeg", "Wymiar 40 cm"),
            ("Leszcz", "Abramis brama", "https://images.pexels.com/photos/16659375/pexels-photo-16659375.jpeg", "Wymiar 25 cm"),
            ("Sandacz", "Sander lucioperca", "https://images.pexels.com/photos/12167832/pexels-photo-12167832.jpeg", "Wymiar 45 cm"),
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

        # Dodatkowy użytkownik testowy
        test_email = "test@test.com"
        test_user_result = await db.execute(select(Uzytkownik).where(Uzytkownik.email == test_email))
        if not test_user_result.scalar_one_or_none():
            hashed = get_password_hash("test123")
            test_user = Uzytkownik(
                email=test_email, 
                haslo_hash=hashed, 
                imie="Test", 
                nazwisko="User", 
                status="aktywny"
            )
            db.add(test_user)
            await db.commit()
            
            # Przypisz rolę Admin dla testu
            test_user_result = await db.execute(select(Uzytkownik).where(Uzytkownik.email == test_email))
            user = test_user_result.scalar_one()
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

            # Przykładowe stacje pomiarowe (po jednej dla każdego typu czujnika)
            station_data = [
                ("Stacja Temperatura", lowiska_data[0][0], ["temperatura"], 21.55, 52.05),
                ("Stacja Tlen", lowiska_data[0][0], ["tlen"], 21.56, 52.05),
                ("Stacja pH", lowiska_data[1][0], ["ph"], 22.05, 51.95),
                ("Stacja Mętność", lowiska_data[1][0], ["metnosc"], 22.06, 51.95),
            ]

            # Znajdź ID łowisk lub pobierz z bazy
            lowisko_map = {}
            result = await db.execute(select(Lowisko))
            for lowisko in result.scalars().all():
                lowisko_map[lowisko.nazwa] = lowisko.id

            for nazwa_stacji, lowisko_nazwa, czujniki, lon, lat in station_data:
                if lowisko_nazwa not in lowisko_map:
                    continue
                lowisko_id = lowisko_map[lowisko_nazwa]
                station_result = await db.execute(
                    select(StacjaPomiarowa).where(StacjaPomiarowa.nazwa == nazwa_stacji)
                )
                if station_result.scalar_one_or_none():
                    continue
                location = func.ST_GeomFromText(f"POINT({lon} {lat})", 4326)
                station = StacjaPomiarowa(
                    lowisko_id=lowisko_id,
                    nazwa=nazwa_stacji,
                    lokalizacja=location,
                    typ_czujnikow=czujniki,
                    last_seen=func.now(),
                )
                db.add(station)
            await db.commit()
            logger.info("Dodano przykładowe stacje pomiarowe.")

            # Przykładowe odczyty dla stacji pomiarowych
            sensor_values = {
                'temperatura': [19.5, 20.2, 20.8, 20.1, 19.9, 20.3, 20.0],
                'tlen': [6.8, 7.0, 7.2, 7.1, 6.9, 7.3, 7.0],
                'ph': [7.2, 7.3, 7.4, 7.3, 7.2, 7.4, 7.3],
                'metnosc': [2.0, 2.1, 2.2, 2.1, 2.0, 2.3, 2.1],
            }

            result = await db.execute(select(StacjaPomiarowa))
            stations = result.scalars().all()
            for station in stations:
                readings_exist = await db.execute(
                    select(OdczytSrodowiskowy.id).where(OdczytSrodowiskowy.stacja_id == station.id).limit(1)
                )
                if readings_exist.first() is not None:
                    continue

                if not station.typ_czujnikow:
                    continue

                for index in range(7):
                    odczyt_date = datetime.utcnow().replace(hour=12, minute=0, second=0, microsecond=0) - timedelta(days=6 - index)
                    odczyt_data = {
                        'stacja_id': station.id,
                        'czas_odczytu': odczyt_date,
                        'temperatura_wody_c': None,
                        'poziom_tlenu_mgl': None,
                        'ph': None,
                        'metnosc_ntu': None,
                    }

                    for sensor_type in station.typ_czujnikow:
                        if sensor_type not in sensor_values:
                            continue
                        sensor_index = index % len(sensor_values[sensor_type])
                        odczyt_data['temperatura_wody_c'] = sensor_values['temperatura'][sensor_index] if sensor_type == 'temperatura' else odczyt_data['temperatura_wody_c']
                        odczyt_data['poziom_tlenu_mgl'] = sensor_values['tlen'][sensor_index] if sensor_type == 'tlen' else odczyt_data['poziom_tlenu_mgl']
                        odczyt_data['ph'] = sensor_values['ph'][sensor_index] if sensor_type == 'ph' else odczyt_data['ph']
                        odczyt_data['metnosc_ntu'] = sensor_values['metnosc'][sensor_index] if sensor_type == 'metnosc' else odczyt_data['metnosc_ntu']

                    odczyt = OdczytSrodowiskowy(**odczyt_data)
                    db.add(odczyt)
            await db.commit()
            logger.info("Dodano przykładowe odczyty dla stacji pomiarowych.")
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
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
# CORS – dla frontendu React
app.add_middleware(
    CORSMiddleware,  # Dodaje middleware do aplikacji FastAPI (obsługa CORS)

    allow_origins=["*"],
    # Zezwala na wszystkie originy w środowisku deweloperskim.

    allow_credentials=False,  
    

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
app.include_router(zarybienia.router, prefix="/api/zarybienia", tags=["zarybienia"])
app.include_router(measure.router, prefix="/api/measure", tags=["pomiar"])

@app.get("/")
async def root():
    return {"message": "System Zarządzania Łowiskami - API działa"}

@app.get("/health")
async def health():
    return {"status": "ok"}