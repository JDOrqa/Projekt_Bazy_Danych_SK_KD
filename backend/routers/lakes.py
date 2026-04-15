# Plik: routers/lakes.py
# CRUD dla łowisk. Tylko rola 'Właściciel' lub 'Admin' może tworzyć/edytować/usunąć.
# Endpointy: GET (publiczne), POST, PUT, DELETE.

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import Polygon
from database import get_db
from schemas.lowisko import LowiskoCreate, LowiskoResponse, LowiskoUpdate
from models.lowisko import Lowisko
from dependencies.auth import get_current_user, require_permission
from models.uzytkownik import Uzytkownik
from models.rola import UzytkownikRola, Rola
from services.audit_log import log_audit

router = APIRouter()

# Sprawdzenie czy użytkownik ma rolę Właściciel lub Admin
async def is_owner_or_admin(user: Uzytkownik, db: AsyncSession) -> bool:
    result = await db.execute(
        select(Rola.nazwa)
        .join(UzytkownikRola, Rola.id == UzytkownikRola.rola_id)
        .where(UzytkownikRola.uzytkownik_id == user.id)
        .where(Rola.nazwa.in_(["Właściciel", "Admin"]))
    )
    roles = result.scalars().all()
    return len(roles) > 0

def geometry_to_coords(geometry):
    # Konwertuje geometrię PostGIS (WKBElement) na listę punktów [(lon, lat), ...].
    if geometry is None:
        return []
    shape = to_shape(geometry)
    if shape.geom_type == 'Polygon':
        # Zewnętrzny pierścień wielokąta
        coords = list(shape.exterior.coords)
        return [(x, y) for x, y in coords]
    return []

@router.post("/", response_model=LowiskoResponse, status_code=status.HTTP_201_CREATED)
async def create_lake(
    lake_data: LowiskoCreate,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Tworzenie nowego łowiska. Wymaga roli 'Właściciel' lub 'Admin'.
    # Walidacja: nazwa unikalna, powierzchnia >0, geometria poprawna.

    # Sprawdź uprawnienia
    if not await is_owner_or_admin(current_user, db):
        raise HTTPException(status_code=403, detail="Brak uprawnień do tworzenia łowisk")
    
    # Sprawdź czy nazwa już istnieje (miękkie usuwanie pomijamy)
    existing = await db.execute(select(Lowisko).where(Lowisko.nazwa == lake_data.nazwa, Lowisko.deleted_at.is_(None)))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Łowisko o tej nazwie już istnieje")
    
    # Konwersja listy współrzędnych na geometrię PostGIS (Polygon)
    try:
        polygon = Polygon(lake_data.granice)  # lista [(lon,lat), ...]
        geom = from_shape(polygon, srid=4326)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Nieprawidłowa geometria: {str(e)}")
    
    new_lake = Lowisko(
        nazwa=lake_data.nazwa,
        typ=lake_data.typ,
        granice=geom,
        powierzchnia_ha=lake_data.powierzchnia_ha,
        glebokosc_max=lake_data.glebokosc_max,
        opis=lake_data.opis,
        wlasciciel_id=current_user.id
    )
    db.add(new_lake)
    await db.commit()
    await db.refresh(new_lake)
    
    # Log audytu
    await log_audit(db, current_user.id, "LOWISKA", new_lake.id, "INSERT", None, lake_data.dict())
    
    # Konwersja geometrii na listę współrzędnych przed zwróceniem odpowiedzi
    lake_dict = {
        "id": new_lake.id,
        "nazwa": new_lake.nazwa,
        "typ": new_lake.typ,
        "granice": geometry_to_coords(new_lake.granice),  # <-- DODANA KONWERSJA
        "powierzchnia_ha": new_lake.powierzchnia_ha,
        "glebokosc_max": new_lake.glebokosc_max,
        "opis": new_lake.opis,
        "wlasciciel_id": new_lake.wlasciciel_id,
        "created_at": new_lake.created_at,
        "updated_at": new_lake.updated_at,
    }
    return LowiskoResponse(**lake_dict)

# GET /lakes – publiczne (bez autoryzacji)
@router.get("/", response_model=list[LowiskoResponse])
async def list_lakes(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    """Lista wszystkich aktywnych łowisk (publiczna)."""
    result = await db.execute(
        select(Lowisko).where(Lowisko.deleted_at.is_(None)).offset(skip).limit(limit)
    )
    lakes = result.scalars().all()
    response = []
    for lake in lakes:
        lake_dict = {
            "id": lake.id,
            "nazwa": lake.nazwa,
            "typ": lake.typ,
            "granice": geometry_to_coords(lake.granice),
            "powierzchnia_ha": lake.powierzchnia_ha,
            "glebokosc_max": lake.glebokosc_max,
            "opis": lake.opis,
            "wlasciciel_id": lake.wlasciciel_id,
            "created_at": lake.created_at,
            "updated_at": lake.updated_at,
        }
        response.append(LowiskoResponse(**lake_dict))
    return response
@router.get("/{lake_id}", response_model=LowiskoResponse)
async def get_lake(lake_id: int, db: AsyncSession = Depends(get_db)):
    """Pobiera szczegóły jednego łowiska (publiczne)."""
    lake = await db.get(Lowisko, lake_id)
    if not lake or lake.deleted_at:
        raise HTTPException(status_code=404, detail="Łowisko nie znalezione")
    
    lake_dict = {
        "id": lake.id,
        "nazwa": lake.nazwa,
        "typ": lake.typ,
        "granice": geometry_to_coords(lake.granice),
        "powierzchnia_ha": lake.powierzchnia_ha,
        "glebokosc_max": lake.glebokosc_max,
        "opis": lake.opis,
        "wlasciciel_id": lake.wlasciciel_id,
        "created_at": lake.created_at,
        "updated_at": lake.updated_at,
    }
    return LowiskoResponse(**lake_dict)

@router.delete("/{lake_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lake(
    lake_id: int,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Usuwa łowisko (miękkie usunięcie – ustawia deleted_at). Wymaga uprawnień właściciela lub admina."""
    lake = await db.get(Lowisko, lake_id)
    if not lake or lake.deleted_at:
        raise HTTPException(status_code=404, detail="Łowisko nie znalezione")
    
    # Sprawdź uprawnienia
    if not await is_owner_or_admin(current_user, db) and lake.wlasciciel_id != current_user.id:
        raise HTTPException(status_code=403, detail="Brak uprawnień do usunięcia tego łowiska")
    
    # Miękkie usunięcie
    lake.deleted_at = func.now()
    await db.commit()
    
    # Log audytu
    await log_audit(db, current_user.id, "LOWISKA", lake_id, "DELETE", None, None)

@router.put("/{lake_id}", response_model=LowiskoResponse)
async def update_lake(
    lake_id: int,
    lake_data: LowiskoUpdate,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Sprawdź czy łowisko istnieje
    lake = await db.get(Lowisko, lake_id)
    if not lake or lake.deleted_at:
        raise HTTPException(status_code=404, detail="Łowisko nie znalezione")
    
    # Sprawdź uprawnienia (właściciel lub admin)
    if not await is_owner_or_admin(current_user, db) and lake.wlasciciel_id != current_user.id:
        raise HTTPException(status_code=403, detail="Brak uprawnień do edycji")
    
    # Aktualizacja pól
    if lake_data.nazwa is not None:
        lake.nazwa = lake_data.nazwa
    if lake_data.typ is not None:
        lake.typ = lake_data.typ
    if lake_data.powierzchnia_ha is not None:
        lake.powierzchnia_ha = lake_data.powierzchnia_ha
    if lake_data.glebokosc_max is not None:
        lake.glebokosc_max = lake_data.glebokosc_max
    if lake_data.opis is not None:
        lake.opis = lake_data.opis
    if lake_data.granice is not None:
        try:
            polygon = Polygon(lake_data.granice)
            lake.granice = from_shape(polygon, srid=4326)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Nieprawidłowa geometria: {str(e)}")
    
    await db.commit()
    await db.refresh(lake)
    await log_audit(db, current_user.id, "LOWISKA", lake_id, "UPDATE", None, lake_data.dict())
    
    # Konwersja geometrii do odpowiedzi
    lake_dict = {
        "id": lake.id,
        "nazwa": lake.nazwa,
        "typ": lake.typ,
        "granice": geometry_to_coords(lake.granice),
        "powierzchnia_ha": lake.powierzchnia_ha,
        "glebokosc_max": lake.glebokosc_max,
        "opis": lake.opis,
        "wlasciciel_id": lake.wlasciciel_id,
        "created_at": lake.created_at,
        "updated_at": lake.updated_at,
    }
    return LowiskoResponse(**lake_dict)

# PUT, DELETE podobnie z wymogiem is_owner_or_admin oraz sprawdzeniem czy właściciel