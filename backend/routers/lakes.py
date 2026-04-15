# Plik: routers/lakes.py
# CRUD dla łowisk. Tylko rola 'Właściciel' lub 'Admin' może tworzyć/edytować/usunąć.
# Endpointy: GET (publiczne), POST, PUT, DELETE.

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
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
    
    #Tworzenie nowego łowiska. Wymaga roli 'Właściciel' lub 'Admin'.
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
    
    return LowiskoResponse.from_orm(new_lake)

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

# PUT, DELETE podobnie z wymogiem is_owner_or_admin oraz sprawdzeniem czy właściciel