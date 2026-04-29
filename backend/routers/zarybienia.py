# Plik: routers/zarybienia.py
# CRUD dla zarybień. Admin i Właściciel mogą zarządzać zarzybieniami.
# Endpointy: GET (zalogowani), POST, PUT, DELETE (admin/właściciel).

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from database import get_db
from dependencies.auth import get_current_user
from models.uzytkownik import Uzytkownik
from models.rola import Rola, UzytkownikRola
from models.zarybienie import Zarybienie
from models.lowisko import Lowisko
from models.gatunek import Gatunek
from schemas.zarybienie import ZarybienieTworz, ZarybieniAktualizuj, ZarybieniOdpowiedz
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


def format_zarybienie(z: Zarybienie, nazwa_gatunku: str = None, nazwa_lowiska: str = None) -> dict:
    return {
        "id": z.id,
        "lowisko_id": z.lowisko_id,
        "gatunek_id": z.gatunek_id,
        "data_zarybienia": z.data_zarybienia,
        "ilosc": z.ilosc,
        "koszt": float(z.koszt) if z.koszt is not None else None,
        "uwagi": z.uwagi,
        "created_at": z.created_at,
        "nazwa_gatunku": nazwa_gatunku,
        "nazwa_lowiska": nazwa_lowiska,
    }


# GET /zarybienia – lista zarybień (opcjonalnie filtruj po łowisku)
@router.get("/", response_model=List[ZarybieniOdpowiedz])
async def list_zarybienia(
    lowisko_id: Optional[int] = None,
    gatunek_id: Optional[int] = None,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lista zarybień. Opcjonalne filtrowanie po łowisku lub gatunku."""
    q = select(Zarybienie)
    if lowisko_id is not None:
        q = q.where(Zarybienie.lowisko_id == lowisko_id)
    if gatunek_id is not None:
        q = q.where(Zarybienie.gatunek_id == gatunek_id)
    q = q.order_by(Zarybienie.data_zarybienia.desc())
    result = await db.execute(q)
    zarybienia = result.scalars().all()

    response = []
    for z in zarybienia:
        gatunek = await db.get(Gatunek, z.gatunek_id)
        lowisko = await db.get(Lowisko, z.lowisko_id)
        response.append(ZarybieniOdpowiedz(
            **format_zarybienie(
                z,
                nazwa_gatunku=gatunek.nazwa_polska if gatunek else None,
                nazwa_lowiska=lowisko.nazwa if lowisko else None,
            )
        ))
    return response


# GET /zarybienia/{id} – szczegóły jednego zarybienia
@router.get("/{zarybienie_id}", response_model=ZarybieniOdpowiedz)
async def get_zarybienie(
    zarybienie_id: int,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    z = await db.get(Zarybienie, zarybienie_id)
    if not z:
        raise HTTPException(status_code=404, detail="Zarybienie nie istnieje")
    gatunek = await db.get(Gatunek, z.gatunek_id)
    lowisko = await db.get(Lowisko, z.lowisko_id)
    return ZarybieniOdpowiedz(
        **format_zarybienie(
            z,
            nazwa_gatunku=gatunek.nazwa_polska if gatunek else None,
            nazwa_lowiska=lowisko.nazwa if lowisko else None,
        )
    )


# POST /zarybienia – dodanie zarybienia (Admin lub Właściciel)
@router.post("/", response_model=ZarybieniOdpowiedz, status_code=status.HTTP_201_CREATED)
async def create_zarybienie(
    data: ZarybienieTworz,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Dodaje zarybienie. Wymaga roli Admin lub Właściciel."""
    if not await is_owner_or_admin(current_user, db):
        raise HTTPException(status_code=403, detail="Brak uprawnień do zarządzania zarzybieniami")

    lowisko = await db.get(Lowisko, data.lowisko_id)
    if not lowisko or lowisko.deleted_at:
        raise HTTPException(status_code=404, detail="Łowisko nie istnieje")

    gatunek = await db.get(Gatunek, data.gatunek_id)
    if not gatunek or gatunek.deleted_at:
        raise HTTPException(status_code=404, detail="Gatunek nie istnieje")

    z = Zarybienie(
        lowisko_id=data.lowisko_id,
        gatunek_id=data.gatunek_id,
        data_zarybienia=data.data_zarybienia,
        ilosc=data.ilosc,
        koszt=data.koszt,
        uwagi=data.uwagi,
    )
    db.add(z)
    await db.commit()
    await db.refresh(z)

    await log_audit(db, current_user.id, "ZARYBIENIA", z.id, "INSERT", None, data.dict())

    return ZarybieniOdpowiedz(
        **format_zarybienie(z, nazwa_gatunku=gatunek.nazwa_polska, nazwa_lowiska=lowisko.nazwa)
    )


# PUT /zarybienia/{id} – aktualizacja zarybienia
@router.put("/{zarybienie_id}", response_model=ZarybieniOdpowiedz)
async def update_zarybienie(
    zarybienie_id: int,
    data: ZarybieniAktualizuj,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Aktualizuje zarybienie. Wymaga roli Admin lub Właściciel."""
    if not await is_owner_or_admin(current_user, db):
        raise HTTPException(status_code=403, detail="Brak uprawnień do zarządzania zarzybieniami")

    z = await db.get(Zarybienie, zarybienie_id)
    if not z:
        raise HTTPException(status_code=404, detail="Zarybienie nie istnieje")

    for field, value in data.dict(exclude_unset=True).items():
        setattr(z, field, value)

    await db.commit()
    await db.refresh(z)

    await log_audit(db, current_user.id, "ZARYBIENIA", zarybienie_id, "UPDATE", None, data.dict(exclude_unset=True))

    gatunek = await db.get(Gatunek, z.gatunek_id)
    lowisko = await db.get(Lowisko, z.lowisko_id)
    return ZarybieniOdpowiedz(
        **format_zarybienie(
            z,
            nazwa_gatunku=gatunek.nazwa_polska if gatunek else None,
            nazwa_lowiska=lowisko.nazwa if lowisko else None,
        )
    )


# DELETE /zarybienia/{id} – usunięcie zarybienia
@router.delete("/{zarybienie_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_zarybienie(
    zarybienie_id: int,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Usuwa zarybienie. Wymaga roli Admin lub Właściciel."""
    if not await is_owner_or_admin(current_user, db):
        raise HTTPException(status_code=403, detail="Brak uprawnień do zarządzania zarzybieniami")

    z = await db.get(Zarybienie, zarybienie_id)
    if not z:
        raise HTTPException(status_code=404, detail="Zarybienie nie istnieje")

    await db.delete(z)
    await db.commit()
    await log_audit(db, current_user.id, "ZARYBIENIA", zarybienie_id, "DELETE", None, None)
