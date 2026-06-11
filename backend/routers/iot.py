from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from database import get_db
from dependencies.auth import get_current_user
from models.stacja_pomiarowa import StacjaPomiarowa
from models.odczyt_srodowiskowy import OdczytSrodowiskowy
from models.lowisko import Lowisko
from models.uzytkownik import Uzytkownik
from models.rola import Rola, UzytkownikRola
from schemas.iot import StacjaPomiarowaResponse, OdczytSrodowiskowyResponse, StacjaPomiarowaCreate, ManualReadingCreate

router = APIRouter()

SENSOR_COLUMN_MAP = {
    "temperatura": OdczytSrodowiskowy.temperatura_wody_c,
    "tlen": OdczytSrodowiskowy.poziom_tlenu_mgl,
    "ph": OdczytSrodowiskowy.ph,
    "metnosc": OdczytSrodowiskowy.metnosc_ntu,
}


async def _is_admin(current_user: Uzytkownik, db: AsyncSession) -> bool:
    result = await db.execute(
        select(Rola.nazwa)
        .join(UzytkownikRola)
        .where(UzytkownikRola.uzytkownik_id == current_user.id)
    )
    user_roles = result.scalars().all()
    return "Admin" in user_roles or "Właściciel" in user_roles

@router.get("/stations", response_model=List[StacjaPomiarowaResponse])
async def list_stations(
    lowisko_id: Optional[int] = Query(None),
    nazwa: Optional[str] = Query(None),
    sensor_type: Optional[str] = Query(None),
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(StacjaPomiarowa)
    if lowisko_id is not None:
        query = query.where(StacjaPomiarowa.lowisko_id == lowisko_id)
    if nazwa is not None:
        query = query.where(StacjaPomiarowa.nazwa.ilike(f"%{nazwa}%"))
    if sensor_type is not None:
        query = query.where(StacjaPomiarowa.typ_czujnikow.contains([sensor_type]))
    query = query.order_by(StacjaPomiarowa.nazwa)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/stations", response_model=StacjaPomiarowaResponse, status_code=201)
async def create_station(
    station_data: StacjaPomiarowaCreate,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not await _is_admin(current_user, db):
        raise HTTPException(status_code=403, detail="Tylko administrator może tworzyć stacje")
    lowisko = await db.get(Lowisko, station_data.lowisko_id)
    if not lowisko:
        raise HTTPException(status_code=400, detail="Łowisko nie istnieje")
    station = StacjaPomiarowa(
        lowisko_id=station_data.lowisko_id,
        nazwa=station_data.nazwa,
        lokalizacja=None,
        typ_czujnikow=station_data.typ_czujnikow,
        last_seen=func.now(),
    )
    db.add(station)
    await db.commit()
    await db.refresh(station)
    return station


@router.get("/stations/{station_id}", response_model=StacjaPomiarowaResponse)
async def get_station(
    station_id: int,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    station = await db.get(StacjaPomiarowa, station_id)
    if not station:
        raise HTTPException(status_code=404, detail="Stacja nie znaleziona")
    return station


@router.get("/readings", response_model=List[OdczytSrodowiskowyResponse])
async def list_readings(
    station_id: Optional[int] = Query(None),
    lowisko_id: Optional[int] = Query(None),
    sensor_type: Optional[str] = Query(None),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(OdczytSrodowiskowy)
    if station_id is not None:
        query = query.where(OdczytSrodowiskowy.stacja_id == station_id)
    if lowisko_id is not None:
        query = query.join(StacjaPomiarowa, OdczytSrodowiskowy.stacja_id == StacjaPomiarowa.id)
        query = query.where(StacjaPomiarowa.lowisko_id == lowisko_id)
    if sensor_type is not None:
        sensor_column = SENSOR_COLUMN_MAP.get(sensor_type.lower())
        if sensor_column is None:
            raise HTTPException(status_code=400, detail="Nieznany typ czujnika")
        query = query.where(sensor_column.is_not(None))
    if from_date is not None:
        query = query.where(OdczytSrodowiskowy.czas_odczytu >= from_date)
    if to_date is not None:
        query = query.where(OdczytSrodowiskowy.czas_odczytu <= to_date)
    query = query.order_by(desc(OdczytSrodowiskowy.czas_odczytu)).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/readings/manual", response_model=OdczytSrodowiskowyResponse, status_code=201)
async def add_manual_reading(
    data: ManualReadingCreate,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not await _is_admin(current_user, db):
        raise HTTPException(status_code=403, detail="Tylko administrator może dodawać odczyty")
    station = await db.get(StacjaPomiarowa, data.station_id)
    if not station:
        raise HTTPException(status_code=404, detail="Stacja nie istnieje")
    reading = OdczytSrodowiskowy(
        stacja_id=data.station_id,
        czas_odczytu=data.reading_time,
        temperatura_wody_c=data.water_temp_c,
        poziom_tlenu_mgl=data.oxygen_mgl,
        ph=data.ph,
        metnosc_ntu=data.turbidity_ntu,
    )
    db.add(reading)
    await db.commit()
    await db.refresh(reading)
    return reading