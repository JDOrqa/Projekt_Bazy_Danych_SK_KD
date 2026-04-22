from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import datetime
from typing import Optional, List
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import Point
from database import get_db
from models.historia_wizyt import HistoriaWizyt
from models.lowisko import Lowisko
from models.uzytkownik import Uzytkownik
from dependencies.auth import get_current_user
from schemas.visit import WizytaCreate, WizytaResponse
from zoneinfo import ZoneInfo

router = APIRouter()

@router.post("/", response_model=WizytaResponse, status_code=201)
async def register_wizyta(
    visit_data: WizytaCreate,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    current_now_pl = datetime.now(ZoneInfo("Europe/Warsaw")).replace(tzinfo=None)
    # Sprawdź czy łowisko istnieje
    lake = await db.get(Lowisko, visit_data.lowisko_id)
    if not lake or lake.deleted_at:
        raise HTTPException(status_code=404, detail="Łowisko nie znalezione")

    # Konwersja współrzędnych na punkt PostGIS
    point = None
    if visit_data.lokalizacja_przybycia:
        point = from_shape(Point(visit_data.lokalizacja_przybycia), srid=4326)

    # Utwórz nową wizytę
    new_visit = HistoriaWizyt(
        uzytkownik_id=current_user.id,
        lowisko_id=visit_data.lowisko_id,
        data_wizyty=visit_data.data_wizyty or current_now_pl,
        lokalizacja_przybycia=point,
        uwagi=visit_data.uwagi
    )
    db.add(new_visit)
    await db.commit()
    await db.refresh(new_visit)

    # Konwersja geometrii na listę współrzędnych dla odpowiedzi
    coords = None
    if new_visit.lokalizacja_przybycia:
        point_shape = to_shape(new_visit.lokalizacja_przybycia)
        coords = [point_shape.x, point_shape.y]

    return WizytaResponse(
        id=new_visit.id,
        uzytkownik_id=new_visit.uzytkownik_id,
        lowisko_id=new_visit.lowisko_id,
        data_wizyty=new_visit.data_wizyty,
        lokalizacja_przybycia=coords,
        uwagi=new_visit.uwagi,
        created_at=new_visit.created_at
    )


@router.get("/", response_model=List[WizytaResponse])
async def get_visits(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    lowisko_id: Optional[int] = Query(None),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Pobiera historię wizyt zalogowanego użytkownika z filtrowaniem i paginacją."""
    query = select(HistoriaWizyt).where(HistoriaWizyt.uzytkownik_id == current_user.id)

    if lowisko_id is not None:
        query = query.where(HistoriaWizyt.lowisko_id == lowisko_id)
    if from_date is not None:
        query = query.where(HistoriaWizyt.data_wizyty >= from_date)
    if to_date is not None:
        query = query.where(HistoriaWizyt.data_wizyty <= to_date)

    query = query.order_by(desc(HistoriaWizyt.data_wizyty)).offset(skip).limit(limit)

    result = await db.execute(query)
    visits = result.scalars().all()

    response_list = []
    for v in visits:
        coords = None
        if v.lokalizacja_przybycia:
            point_shape = to_shape(v.lokalizacja_przybycia)
            coords = [point_shape.x, point_shape.y]
        response_list.append(WizytaResponse(
            id=v.id,
            uzytkownik_id=v.uzytkownik_id,
            lowisko_id=v.lowisko_id,
            data_wizyty=v.data_wizyty,
            lokalizacja_przybycia=coords,
            uwagi=v.uwagi,
            created_at=v.created_at
        ))
    return response_list