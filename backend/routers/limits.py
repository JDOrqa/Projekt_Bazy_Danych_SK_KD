# Plik: routers/limits.py
# CRUD dla limitów połowowych. Admin i Właściciel mogą zarządzać limitami.
# Endpointy: GET (publiczne dla zalogowanych), POST, PUT, DELETE (admin/właściciel).

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional
from datetime import date

from database import get_db
from dependencies.auth import get_current_user
from models.uzytkownik import Uzytkownik
from models.rola import Rola, UzytkownikRola
from models.limit_polowowy import LimitPolowowy
from models.lowisko import Lowisko
from models.gatunek import Gatunek
from schemas.limit import (
    LimitPolowowyCreate, LimitPolowowyUpdate, LimitPolowowyResponse
)
from services.audit_log import log_audit

router = APIRouter()


async def is_owner_or_admin(user: Uzytkownik, db: AsyncSession) -> bool:
    result = await db.execute(
        select(Rola.nazwa)
        .join(UzytkownikRola, Rola.id == UzytkownikRola.rola_id)
        .where(UzytkownikRola.uzytkownik_id == user.id)
        .where(Rola.nazwa.in_(["Właściciel", "Admin"]))
    )
    return len(result.scalars().all()) > 0


def format_limit_response(limit: LimitPolowowy, nazwa_gatunku: str = None, nazwa_lowiska: str = None) -> dict:
    sezon = None
    if limit.sezon_ochronny is not None:
        try:
            sezon = [str(limit.sezon_ochronny.lower), str(limit.sezon_ochronny.upper)]
        except Exception:
            sezon = None
    return {
        "id": limit.id,
        "lowisko_id": limit.lowisko_id,
        "gatunek_id": limit.gatunek_id,
        "wymiar_min_cm": float(limit.wymiar_min_cm) if limit.wymiar_min_cm is not None else None,
        "wymiar_max_cm": float(limit.wymiar_max_cm) if limit.wymiar_max_cm is not None else None,
        "limit_dzienny": limit.limit_dzienny,
        "limit_tygodniowy": limit.limit_tygodniowy,
        "limit_roczny": limit.limit_roczny,
        "sezon_ochronny": sezon,
        "created_at": limit.created_at,
        "updated_at": limit.updated_at,
        "nazwa_gatunku": nazwa_gatunku,
        "nazwa_lowiska": nazwa_lowiska,
    }


# GET /limits – lista wszystkich limitów (opcjonalnie filtruj po łowisku)
@router.get("/", response_model=List[LimitPolowowyResponse])
async def list_limits(
    lowisko_id: Optional[int] = None,
    gatunek_id: Optional[int] = None,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lista limitów połowowych. Opcjonalne filtrowanie po łowisku lub gatunku."""
    q = select(LimitPolowowy)
    if lowisko_id is not None:
        q = q.where(LimitPolowowy.lowisko_id == lowisko_id)
    if gatunek_id is not None:
        q = q.where(LimitPolowowy.gatunek_id == gatunek_id)
    q = q.order_by(LimitPolowowy.lowisko_id, LimitPolowowy.gatunek_id)
    result = await db.execute(q)
    limits = result.scalars().all()

    response = []
    for lim in limits:
        gatunek = await db.get(Gatunek, lim.gatunek_id)
        lowisko = await db.get(Lowisko, lim.lowisko_id)
        response.append(LimitPolowowyResponse(
            **format_limit_response(
                lim,
                nazwa_gatunku=gatunek.nazwa_polska if gatunek else None,
                nazwa_lowiska=lowisko.nazwa if lowisko else None,
            )
        ))
    return response


# GET /limits/{limit_id} – szczegóły jednego limitu
@router.get("/{limit_id}", response_model=LimitPolowowyResponse)
async def get_limit(
    limit_id: int,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    limit = await db.get(LimitPolowowy, limit_id)
    if not limit:
        raise HTTPException(status_code=404, detail="Limit nie istnieje")
    gatunek = await db.get(Gatunek, limit.gatunek_id)
    lowisko = await db.get(Lowisko, limit.lowisko_id)
    return LimitPolowowyResponse(
        **format_limit_response(
            limit,
            nazwa_gatunku=gatunek.nazwa_polska if gatunek else None,
            nazwa_lowiska=lowisko.nazwa if lowisko else None,
        )
    )


# POST /limits – tworzenie nowego limitu (Admin lub Właściciel)
@router.post("/", response_model=LimitPolowowyResponse, status_code=status.HTTP_201_CREATED)
async def create_limit(
    data: LimitPolowowyCreate,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Tworzy nowy limit połowowy. Wymaga roli Admin lub Właściciel."""
    if not await is_owner_or_admin(current_user, db):
        raise HTTPException(status_code=403, detail="Brak uprawnień do zarządzania limitami")

    # Sprawdź czy łowisko i gatunek istnieją
    lowisko = await db.get(Lowisko, data.lowisko_id)
    if not lowisko or lowisko.deleted_at:
        raise HTTPException(status_code=404, detail="Łowisko nie istnieje")

    gatunek = await db.get(Gatunek, data.gatunek_id)
    if not gatunek or gatunek.deleted_at:
        raise HTTPException(status_code=404, detail="Gatunek nie istnieje")

    # Sprawdź czy limit dla tej pary (łowisko, gatunek) już istnieje
    existing = await db.execute(
        select(LimitPolowowy).where(
            and_(
                LimitPolowowy.lowisko_id == data.lowisko_id,
                LimitPolowowy.gatunek_id == data.gatunek_id
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Limit dla tego gatunku na tym łowisku już istnieje. Użyj PUT aby zaktualizować."
        )

    # Konwersja sezon_ochronny (tuple) na daterange PostgreSQL
    sezon = None
    if data.sezon_ochronny:
        from psycopg2.extras import DateRange
        sezon = DateRange(data.sezon_ochronny[0], data.sezon_ochronny[1])

    limit = LimitPolowowy(
        lowisko_id=data.lowisko_id,
        gatunek_id=data.gatunek_id,
        wymiar_min_cm=data.wymiar_min_cm,
        wymiar_max_cm=data.wymiar_max_cm,
        limit_dzienny=data.limit_dzienny,
        limit_tygodniowy=data.limit_tygodniowy,
        limit_roczny=data.limit_roczny,
        sezon_ochronny=sezon,
    )
    db.add(limit)
    await db.commit()
    await db.refresh(limit)

    await log_audit(db, current_user.id, "LIMITY_POLOWOWE", limit.id, "INSERT", None, data.dict())

    return LimitPolowowyResponse(
        **format_limit_response(
            limit,
            nazwa_gatunku=gatunek.nazwa_polska,
            nazwa_lowiska=lowisko.nazwa,
        )
    )


# PUT /limits/{limit_id} – aktualizacja limitu
@router.put("/{limit_id}", response_model=LimitPolowowyResponse)
async def update_limit(
    limit_id: int,
    data: LimitPolowowyUpdate,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Aktualizuje limit połowowy. Wymaga roli Admin lub Właściciel."""
    if not await is_owner_or_admin(current_user, db):
        raise HTTPException(status_code=403, detail="Brak uprawnień do zarządzania limitami")

    limit = await db.get(LimitPolowowy, limit_id)
    if not limit:
        raise HTTPException(status_code=404, detail="Limit nie istnieje")

    if data.wymiar_min_cm is not None:
        limit.wymiar_min_cm = data.wymiar_min_cm
    if data.wymiar_max_cm is not None:
        limit.wymiar_max_cm = data.wymiar_max_cm
    if data.limit_dzienny is not None:
        limit.limit_dzienny = data.limit_dzienny
    if data.limit_tygodniowy is not None:
        limit.limit_tygodniowy = data.limit_tygodniowy
    if data.limit_roczny is not None:
        limit.limit_roczny = data.limit_roczny
    if data.sezon_ochronny is not None:
        from psycopg2.extras import DateRange
        limit.sezon_ochronny = DateRange(data.sezon_ochronny[0], data.sezon_ochronny[1])
    elif 'sezon_ochronny' in data.dict(exclude_unset=False) and data.sezon_ochronny is None:
        limit.sezon_ochronny = None

    await db.commit()
    await db.refresh(limit)

    await log_audit(db, current_user.id, "LIMITY_POLOWOWE", limit_id, "UPDATE", None, data.dict(exclude_unset=True))

    gatunek = await db.get(Gatunek, limit.gatunek_id)
    lowisko = await db.get(Lowisko, limit.lowisko_id)
    return LimitPolowowyResponse(
        **format_limit_response(
            limit,
            nazwa_gatunku=gatunek.nazwa_polska if gatunek else None,
            nazwa_lowiska=lowisko.nazwa if lowisko else None,
        )
    )


# DELETE /limits/{limit_id} – usunięcie limitu
@router.delete("/{limit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_limit(
    limit_id: int,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Usuwa limit połowowy. Wymaga roli Admin lub Właściciel."""
    if not await is_owner_or_admin(current_user, db):
        raise HTTPException(status_code=403, detail="Brak uprawnień do zarządzania limitami")

    limit = await db.get(LimitPolowowy, limit_id)
    if not limit:
        raise HTTPException(status_code=404, detail="Limit nie istnieje")

    await db.delete(limit)
    await db.commit()
    await log_audit(db, current_user.id, "LIMITY_POLOWOWE", limit_id, "DELETE", None, None)
