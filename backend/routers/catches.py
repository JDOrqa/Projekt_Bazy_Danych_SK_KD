from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime
from services.limits_validator import LimitValidator
from database import get_db
from dependencies.auth import get_current_user
from models.uzytkownik import Uzytkownik
from models.sesja_polowu import SesjaPolowu
from models.zlowiona_ryba import ZlowionaRyba
from models.lowisko import Lowisko
from models.gatunek import Gatunek
from models.metoda_polowu import MetodaPolowu
from models.przyneta import Przyneta
from models.zdjecie_ryby import ZdjecieRyby
from models.wynik_przetwarzania import WynikPrzetwarzania

from schemas.sesja import (
    SesjaStartRequest, SesjaEndRequest, SesjaUpdateRequest,
    SesjaResponse, SesjaDetailResponse
)
from schemas.ryba import (
    ZlowionaRybaCreateRequest, ZlowionaRybaUpdateRequest,
    ZlowionaRybaResponse
)

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
        "data_rozpoczecia": sesja.start_czas,
        "data_zakonczenia": sesja.koniec_czas,
        "uwagi": sesja.uwagi,
        "created_at": sesja.created_at if hasattr(sesja, 'created_at') else None,
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


def _format_ryba_with_photos(ryba, gatunek, metoda, przyneta, zdjecia):
    """Pomocnicza funkcja do budowania słownika ryby z listą zdjęć."""
    return {
        "id": ryba.id,
        "sesja_id": ryba.sesja_id,
        "gatunek_id": ryba.gatunek_id,
        "waga_g": ryba.waga_kg,
        "dlugosc_cm": ryba.dlugosc_cm,
        "metoda_id": ryba.metoda_id,
        "przyneta_id": ryba.przyneta_id,
        "wypuszczona": ryba.wypuszczona,
        "czas_zlowienia": ryba.czas_zlowienia,
        "uwagi": ryba.uwagi,
        "nazwa_gatunku": gatunek.nazwa_polska if gatunek else None,
        "nazwa_metody": metoda.nazwa if metoda else None,
        "nazwa_przynety": przyneta.nazwa if przyneta else None,
        "zdjecia": zdjecia,            # lista URLi zdjęć
        "zdjecie_url": None,
    }


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
            SesjaPolowu.koniec_czas.is_(None)
        )
    )
    if aktywna.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Masz już aktywną sesję")

    sesja = SesjaPolowu(
        uzytkownik_id=current_user.id,
        lowisko_id=request.lowisko_id,
        start_czas=datetime.utcnow(),
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
    if sesja.koniec_czas:
        raise HTTPException(status_code=400, detail="Sesja została już zakończona")

    sesja.koniec_czas = datetime.utcnow()
    sesja.koniec_gps = gps_point(request.koniec_gps_lat, request.koniec_gps_lon)
    await db.commit()
    await db.refresh(sesja)
    return format_sesja_response(sesja)


@router.get("/sesje/aktywna", response_model=SesjaDetailResponse)
async def get_active_session(
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(SesjaPolowu).where(
            SesjaPolowu.uzytkownik_id == current_user.id,
            SesjaPolowu.koniec_czas.is_(None)
        )
    )
    sesja = result.scalar_one_or_none()
    if not sesja:
        raise HTTPException(status_code=404, detail="Brak aktywnej sesji")
    
    lowisko = await db.get(Lowisko, sesja.lowisko_id)
    ryby_result = await db.execute(
        select(ZlowionaRyba).where(ZlowionaRyba.sesja_id == sesja.id)
    )
    ryby = ryby_result.scalars().all()
    
    ryby_responses = []
    for r in ryby:
        g = await db.get(Gatunek, r.gatunek_id) if r.gatunek_id else None
        m = await db.get(MetodaPolowu, r.metoda_id) if r.metoda_id else None
        p = await db.get(Przyneta, r.przyneta_id) if r.przyneta_id else None
        photos = await db.execute(
            select(ZdjecieRyby.url_zdjecia).where(ZdjecieRyby.zlowiona_ryba_id == r.id)
        )
        photo_urls = [url for (url,) in photos.all()]
        ryby_responses.append(_format_ryba_with_photos(r, g, m, p, photo_urls))
    
    response_data = format_sesja_response(sesja).dict()
    response_data["zlowione_ryby"] = ryby_responses
    response_data["nazwa_lowiska"] = lowisko.nazwa if lowisko else None
    response_data["nazwa_uzytkownika"] = current_user.email
    
    return SesjaDetailResponse(**response_data)


@router.get("/sesje", response_model=List[SesjaResponse])
async def list_sessions(
    aktywna_only: bool = False,
    limit: int = 50,
    offset: int = 0,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    q = select(SesjaPolowu).where(SesjaPolowu.uzytkownik_id == current_user.id)
    if aktywna_only:
        q = q.where(SesjaPolowu.koniec_czas.is_(None))
    q = q.order_by(SesjaPolowu.start_czas.desc()).offset(offset).limit(limit)
    result = await db.execute(q)
    return [format_sesja_response(s) for s in result.scalars().all()]


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
        photos = await db.execute(
            select(ZdjecieRyby.url_zdjecia).where(ZdjecieRyby.zlowiona_ryba_id == r.id)
        )
        photo_urls = [url for (url,) in photos.all()]
        ryby_responses.append(_format_ryba_with_photos(r, g, m, p, photo_urls))

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

class ZlowionaRybaCreateRequestWithResult(ZlowionaRybaCreateRequest):
    wynik_id: Optional[int] = None   # ID wyniku pomiaru z tabeli WYNIKI_PRZETWARZANIA


@router.post("/sesje/{sesja_id}/ryby", status_code=status.HTTP_201_CREATED)
async def add_fish(
    sesja_id: int,
    request: ZlowionaRybaCreateRequestWithResult,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    sesja = await db.get(SesjaPolowu, sesja_id)
    if not sesja or sesja.uzytkownik_id != current_user.id:
        raise HTTPException(status_code=404, detail="Sesja nie istnieje lub nie należy do Ciebie")
    if sesja.koniec_czas:
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

    # Jeśli podano wynik_id, pobierz dane z pomiaru
    if request.wynik_id:
        wynik = await db.get(WynikPrzetwarzania, request.wynik_id)
        if wynik:
            if request.dlugosc_cm is None and wynik.dlugosc_oszacowana_cm is not None:
                request.dlugosc_cm = wynik.dlugosc_oszacowana_cm

    # ===== WALIDACJA LIMITÓW =====
    warnings, wymusi_wypuszczenie = await LimitValidator.validate_catch(
        db=db,
        uzytkownik_id=current_user.id,
        sesja_id=sesja_id,
        gatunek_id=request.gatunek_id,
        dlugosc_cm=request.dlugosc_cm,
        lowisko_id=sesja.lowisko_id,
    )

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

    ryba = ZlowionaRyba(
        sesja_id=sesja_id,
        gatunek_id=request.gatunek_id,
        waga_kg=request.waga_g,
        dlugosc_cm=request.dlugosc_cm,
        metoda_id=request.metoda_id,
        przyneta_id=request.przyneta_id,
        wypuszczona=request.wypuszczona,
        uwagi=request.uwagi,
        czas_zlowienia=datetime.utcnow(),
    )
    db.add(ryba)
    await db.flush()

    # Jeśli istnieje wynik, powiąż zdjęcie z tą rybą
    if request.wynik_id:
        wynik = await db.get(WynikPrzetwarzania, request.wynik_id)
        if wynik and wynik.zdjecie_id:
            zdjecie = await db.get(ZdjecieRyby, wynik.zdjecie_id)
            if zdjecie:
                zdjecie.zlowiona_ryba_id = ryba.id
                db.add(zdjecie)

    await db.commit()
    await db.refresh(ryba)

    photos = await db.execute(
        select(ZdjecieRyby.url_zdjecia).where(ZdjecieRyby.zlowiona_ryba_id == ryba.id)
    )
    photo_urls = [url for (url,) in photos.all()]

    return ZlowionaRybaResponse(
        id=ryba.id,
        sesja_id=ryba.sesja_id,
        gatunek_id=ryba.gatunek_id,
        waga_g=ryba.waga_kg,
        dlugosc_cm=ryba.dlugosc_cm,
        metoda_id=ryba.metoda_id,
        przyneta_id=ryba.przyneta_id,
        wypuszczona=ryba.wypuszczona,
        zdjecie_url=None,
        uwagi=ryba.uwagi,
        czas_zlowienia=ryba.czas_zlowienia,
        nazwa_gatunku=gatunek.nazwa_polska,
        nazwa_metody=metoda.nazwa if metoda else None,
        nazwa_przynety=przyneta.nazwa if przyneta else None,
    )


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
        photos = await db.execute(
            select(ZdjecieRyby.url_zdjecia).where(ZdjecieRyby.zlowiona_ryba_id == r.id)
        )
        photo_urls = [url for (url,) in photos.all()]
        ryba_dict = _format_ryba_with_photos(r, g, m, p, photo_urls)
        responses.append(ZlowionaRybaResponse(**ryba_dict))
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
    photos = await db.execute(
        select(ZdjecieRyby.url_zdjecia).where(ZdjecieRyby.zlowiona_ryba_id == ryba.id)
    )
    photo_urls = [url for (url,) in photos.all()]
    ryba_dict = _format_ryba_with_photos(ryba, g, m, p, photo_urls)
    return ZlowionaRybaResponse(**ryba_dict)


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