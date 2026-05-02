from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime

from database import get_db
from dependencies.auth import get_current_user
from models.uzytkownik import Uzytkownik
from models.sesja_polowu import SesjaPolowu
from models.zlowiona_ryba import ZlowionaRyba
from models.lowisko import Lowisko
from models.gatunek import Gatunek
from models.metoda_polowu import MetodaPolowu
from models.przyneta import Przyneta

from schemas.sesja import (
    SesjaStartRequest, SesjaEndRequest, SesjaUpdateRequest,
    SesjaResponse, SesjaDetailResponse
)
from schemas.ryba import (
    ZlowionaRybaCreateRequest, ZlowionaRybaUpdateRequest,
    ZlowionaRybaResponse
)
from services.limits_validator import LimitValidator

from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import Point

router = APIRouter()


def gps_point(lat, lon):
    if lat is not None and lon is not None:
        return from_shape(Point(lon, lat), srid=4326)
    return None


def format_sesja_response(sesja: SesjaPolowu) -> SesjaResponse:
    data = {
        "id": sesja.id,
        "uzytkownik_id": sesja.uzytkownik_id,
        "lowisko_id": sesja.lowisko_id,
        "data_rozpoczecia": sesja.data_rozpoczecia,
        "data_zakonczenia": sesja.data_zakonczenia,
        "uwagi": sesja.uwagi,
        "created_at": sesja.created_at,
        "start_gps_lat": None,
        "start_gps_lon": None,
        "koniec_gps_lat": None,
        "koniec_gps_lon": None,
    }
    if sesja.start_gps is not None:
        pt = to_shape(sesja.start_gps)
        data["start_gps_lat"] = pt.y
        data["start_gps_lon"] = pt.x
    if sesja.koniec_gps is not None:
        pt = to_shape(sesja.koniec_gps)
        data["koniec_gps_lat"] = pt.y
        data["koniec_gps_lon"] = pt.x
    return SesjaResponse(**data)


def format_ryba_response(ryba: ZlowionaRyba, gatunek=None, metoda=None, przyneta=None) -> ZlowionaRybaResponse:
    return ZlowionaRybaResponse(
        id=ryba.id,
        sesja_id=ryba.sesja_id,
        gatunek_id=ryba.gatunek_id,
        waga_g=ryba.waga_g,
        dlugosc_cm=ryba.dlugosc_cm,
        metoda_id=ryba.metoda_id,
        przyneta_id=ryba.przyneta_id,
        wypuszczona=ryba.wypuszczona,
        powod_wypuszczenia=ryba.powod_wypuszczenia,
        narusza_limit=ryba.narusza_limit,
        powod_naruszenia=ryba.powod_naruszenia,
        ostrzezenie_wyswietlone=ryba.ostrzezenie_wyswietlone,
        zdjecie_url=ryba.zdjecie_url,
        uwagi=ryba.uwagi,
        czas_zlowienia=ryba.czas_zlowienia,
        nazwa_gatunku=gatunek.nazwa_polska if gatunek else None,
        nazwa_metody=metoda.nazwa if metoda else None,
        nazwa_przynety=przyneta.nazwa if przyneta else None,
    )


# ============== SŁOWNIKI ==============

@router.get("/metody")
async def list_metody(
    db: AsyncSession = Depends(get_db),
    current_user: Uzytkownik = Depends(get_current_user)
):
    result = await db.execute(select(MetodaPolowu).order_by(MetodaPolowu.nazwa))
    return [{"id": m.id, "nazwa": m.nazwa} for m in result.scalars().all()]


@router.get("/przynety")
async def list_przynety(
    db: AsyncSession = Depends(get_db),
    current_user: Uzytkownik = Depends(get_current_user)
):
    result = await db.execute(select(Przyneta).order_by(Przyneta.nazwa))
    return [{"id": p.id, "nazwa": p.nazwa} for p in result.scalars().all()]


# ============== SESJE ==============

@router.post("/sesje/start", response_model=SesjaResponse, status_code=status.HTTP_201_CREATED)
async def start_session(
    request: SesjaStartRequest,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    lowisko = await db.get(Lowisko, request.lowisko_id)
    if not lowisko:
        raise HTTPException(status_code=404, detail="Łowisko nie istnieje")

    aktywna = await db.execute(
        select(SesjaPolowu).where(
            SesjaPolowu.uzytkownik_id == current_user.id,
            SesjaPolowu.data_zakonczenia.is_(None)
        )
    )
    if aktywna.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Masz już aktywną sesję")

    sesja = SesjaPolowu(
        uzytkownik_id=current_user.id,
        lowisko_id=request.lowisko_id,
        start_gps=gps_point(request.start_gps_lat, request.start_gps_lon),
        uwagi=request.uwagi,
    )
    db.add(sesja)
    await db.commit()
    await db.refresh(sesja)
    return format_sesja_response(sesja)


@router.post("/sesje/{sesja_id}/end", response_model=SesjaResponse)
async def end_session(
    sesja_id: int,
    request: SesjaEndRequest,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    sesja = await db.get(SesjaPolowu, sesja_id)
    if not sesja or sesja.uzytkownik_id != current_user.id:
        raise HTTPException(status_code=404, detail="Sesja nie istnieje lub nie należy do Ciebie")
    if sesja.data_zakonczenia:
        raise HTTPException(status_code=400, detail="Sesja została już zakończona")

    sesja.data_zakonczenia = datetime.utcnow()
    sesja.koniec_gps = gps_point(request.koniec_gps_lat, request.koniec_gps_lon)
    await db.commit()
    await db.refresh(sesja)
    return format_sesja_response(sesja)

# historia sesji, z opcją filtrowania tylko aktywnych, paginacją limit/offset i sortowaniem najnowsze pierwsze
@router.get("/sesje", response_model=List[SesjaResponse])#
async def list_sessions(
    aktywna_only: bool = False,
    limit: int = 50,
    offset: int = 0,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    q = select(SesjaPolowu).where(SesjaPolowu.uzytkownik_id == current_user.id)
    if aktywna_only:
        q = q.where(SesjaPolowu.data_zakonczenia.is_(None))
    q = q.order_by(SesjaPolowu.data_rozpoczecia.desc()).offset(offset).limit(limit)
    result = await db.execute(q)
    return [format_sesja_response(s) for s in result.scalars().all()]



@router.get("/sesje/aktywna", response_model=SesjaResponse)
async def get_active_session(
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(SesjaPolowu).where(
            SesjaPolowu.uzytkownik_id == current_user.id,
            SesjaPolowu.data_zakonczenia.is_(None)
        )
    )
    sesja = result.scalar_one_or_none()
    if not sesja:
        raise HTTPException(status_code=404, detail="Brak aktywnej sesji")
    return format_sesja_response(sesja)


@router.get("/sesje/{sesja_id}", response_model=SesjaDetailResponse)
async def get_session_details(
    sesja_id: int,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    sesja = await db.get(SesjaPolowu, sesja_id)
    if not sesja or sesja.uzytkownik_id != current_user.id:
        raise HTTPException(status_code=404, detail="Sesja nie istnieje lub nie należy do Ciebie")

    ryby_result = await db.execute(
        select(ZlowionaRyba).where(ZlowionaRyba.sesja_id == sesja_id)
    )
    ryby = ryby_result.scalars().all()

    ryby_responses = []
    for r in ryby:
        g = await db.get(Gatunek, r.gatunek_id) if r.gatunek_id else None
        m = await db.get(MetodaPolowu, r.metoda_id) if r.metoda_id else None
        p = await db.get(Przyneta, r.przyneta_id) if r.przyneta_id else None
        ryby_responses.append(format_ryba_response(r, g, m, p).dict())

    lowisko = await db.get(Lowisko, sesja.lowisko_id)

    response_data = format_sesja_response(sesja).dict()
    response_data["zlowione_ryby"] = ryby_responses
    response_data["nazwa_lowiska"] = lowisko.nazwa if lowisko else None
    response_data["nazwa_uzytkownika"] = current_user.email
    return SesjaDetailResponse(**response_data)





@router.patch("/sesje/{sesja_id}", response_model=SesjaResponse)
async def update_session(
    sesja_id: int,
    request: SesjaUpdateRequest,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    sesja = await db.get(SesjaPolowu, sesja_id)
    if not sesja or sesja.uzytkownik_id != current_user.id:
        raise HTTPException(status_code=404, detail="Sesja nie istnieje lub nie należy do Ciebie")

    if request.lowisko_id is not None:
        lowisko = await db.get(Lowisko, request.lowisko_id)
        if not lowisko:
            raise HTTPException(status_code=404, detail="Łowisko nie istnieje")
        sesja.lowisko_id = request.lowisko_id
    if request.uwagi is not None:
        sesja.uwagi = request.uwagi

    await db.commit()
    await db.refresh(sesja)
    return format_sesja_response(sesja)


@router.delete("/sesje/{sesja_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    sesja_id: int,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    sesja = await db.get(SesjaPolowu, sesja_id)
    if not sesja or sesja.uzytkownik_id != current_user.id:
        raise HTTPException(status_code=404, detail="Sesja nie istnieje lub nie należy do Ciebie")
    await db.delete(sesja)
    await db.commit()


# ============== ZŁOWIONE RYBY ==============

@router.post("/sesje/{sesja_id}/ryby", status_code=status.HTTP_201_CREATED)
async def add_fish(
    sesja_id: int,
    request: ZlowionaRybaCreateRequest,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Dodaj złowioną rybę do sesji.

    Logika walidacji:
    - Jeśli ryba narusza limity (za mała, za duża, chroniona, no-kill, limit dzienny)
      i użytkownik NIE zaznaczył wypuszczona=True → zwraca HTTP 422 z listą ostrzeżeń.
      Frontend musi pokazać ostrzeżenia i wymusić zaznaczenie "wypuszczona".
    - Jeśli użytkownik zaznaczył wypuszczona=True (świadomie) → ryba jest zapisywana
      z flagą narusza_limit i powodem.
    """
    sesja = await db.get(SesjaPolowu, sesja_id)
    if not sesja or sesja.uzytkownik_id != current_user.id:
        raise HTTPException(status_code=404, detail="Sesja nie istnieje lub nie należy do Ciebie")
    if sesja.data_zakonczenia:
        raise HTTPException(status_code=400, detail="Nie można dodawać ryb do zakończonej sesji")

    gatunek = await db.get(Gatunek, request.gatunek_id)
    if not gatunek:
        raise HTTPException(status_code=404, detail="Gatunek nie istnieje")

    metoda = await db.get(MetodaPolowu, request.metoda_id) if request.metoda_id else None
    if request.metoda_id and not metoda:
        raise HTTPException(status_code=404, detail="Metoda połowu nie istnieje")

    przyneta = await db.get(Przyneta, request.przyneta_id) if request.przyneta_id else None
    if request.przyneta_id and not przyneta:
        raise HTTPException(status_code=404, detail="Przynęta nie istnieje")

    # ===== WALIDACJA LIMITÓW =====
    warnings, wymusi_wypuszczenie = await LimitValidator.validate_catch(
        db=db,
        uzytkownik_id=current_user.id,
        sesja_id=sesja_id,
        gatunek_id=request.gatunek_id,
        dlugosc_cm=request.dlugosc_cm,
        lowisko_id=sesja.lowisko_id,
    )

    # Jeśli ryba MUSI być wypuszczona, a użytkownik tego nie zaznaczył → odrzuć
    if wymusi_wypuszczenie and not request.wypuszczona:
        raise HTTPException(
            status_code=422,
            detail={
                "typ": "wymuszenie_wypuszczenia",
                "wiadomosc": "Ta ryba musi zostać wypuszczona. Zaznacz 'Wypuszczona' aby potwierdzić.",
                "ostrzezenia": [
                    {"typ": w.typ_ostrzezenia, "wiadomosc": w.wiadomosc}
                    for w in warnings
                ],
            }
        )

    # Ustal powód wypuszczenia na podstawie ostrzeżeń
    powod_wypuszczenia = None
    if request.wypuszczona and warnings:
        powod_wypuszczenia = ", ".join(w.typ_ostrzezenia for w in warnings)

    ryba = ZlowionaRyba(
        sesja_id=sesja_id,
        gatunek_id=request.gatunek_id,
        waga_g=request.waga_g,
        dlugosc_cm=request.dlugosc_cm,
        metoda_id=request.metoda_id,
        przyneta_id=request.przyneta_id,
        wypuszczona=request.wypuszczona,
        powod_wypuszczenia=powod_wypuszczenia or request.powod_wypuszczenia,
        narusza_limit=wymusi_wypuszczenie,
        powod_naruszenia=", ".join(w.typ_ostrzezenia for w in warnings) if warnings else None,
        ostrzezenie_wyswietlone=bool(warnings),
        zdjecie_url=request.zdjecie_url,
        uwagi=request.uwagi,
    )
    db.add(ryba)
    await db.commit()
    await db.refresh(ryba)

    # Aktualizuj historię limitów (nieblokująco)
    await LimitValidator.update_history(
        db=db,
        uzytkownik_id=current_user.id,
        gatunek_id=request.gatunek_id,
        lowisko_id=sesja.lowisko_id,
        wypuszczona=request.wypuszczona,
    )

    return format_ryba_response(ryba, gatunek, metoda, przyneta).dict()


@router.get("/sesje/{sesja_id}/ryby", response_model=List[ZlowionaRybaResponse])
async def list_fish(
    sesja_id: int,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    sesja = await db.get(SesjaPolowu, sesja_id)
    if not sesja or sesja.uzytkownik_id != current_user.id:
        raise HTTPException(status_code=404, detail="Sesja nie istnieje lub nie należy do Ciebie")

    result = await db.execute(
        select(ZlowionaRyba).where(ZlowionaRyba.sesja_id == sesja_id)
        .order_by(ZlowionaRyba.czas_zlowienia.desc())
    )
    ryby = result.scalars().all()

    responses = []
    for r in ryby:
        g = await db.get(Gatunek, r.gatunek_id) if r.gatunek_id else None
        m = await db.get(MetodaPolowu, r.metoda_id) if r.metoda_id else None
        p = await db.get(Przyneta, r.przyneta_id) if r.przyneta_id else None
        responses.append(format_ryba_response(r, g, m, p))
    return responses


@router.patch("/ryby/{ryba_id}", response_model=ZlowionaRybaResponse)
async def update_fish(
    ryba_id: int,
    request: ZlowionaRybaUpdateRequest,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    ryba = await db.get(ZlowionaRyba, ryba_id)
    if not ryba:
        raise HTTPException(status_code=404, detail="Ryba nie istnieje")
    sesja = await db.get(SesjaPolowu, ryba.sesja_id)
    if not sesja or sesja.uzytkownik_id != current_user.id:
        raise HTTPException(status_code=403, detail="Brak uprawnień")

    for field, value in request.dict(exclude_unset=True).items():
        setattr(ryba, field, value)

    await db.commit()
    await db.refresh(ryba)
    g = await db.get(Gatunek, ryba.gatunek_id) if ryba.gatunek_id else None
    m = await db.get(MetodaPolowu, ryba.metoda_id) if ryba.metoda_id else None
    p = await db.get(Przyneta, ryba.przyneta_id) if ryba.przyneta_id else None
    return format_ryba_response(ryba, g, m, p)


@router.delete("/ryby/{ryba_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fish(
    ryba_id: int,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    ryba = await db.get(ZlowionaRyba, ryba_id)
    if not ryba:
        raise HTTPException(status_code=404, detail="Ryba nie istnieje")
    sesja = await db.get(SesjaPolowu, ryba.sesja_id)
    if not sesja or sesja.uzytkownik_id != current_user.id:
        raise HTTPException(status_code=403, detail="Brak uprawnień")

    await db.delete(ryba)
    await db.commit()
