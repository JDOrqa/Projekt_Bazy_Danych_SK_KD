# Plik: routers/users.py
# Endpointy: profil użytkownika, dashboard statystyk, zmiana hasła.

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from database import get_db
from schemas.user import UserProfile, UserUpdate, ChangePassword
from dependencies.auth import get_current_user
from models.uzytkownik import Uzytkownik
from models.rola import Rola, UzytkownikRola
from models.sesja_polowu import SesjaPolowu
from models.zlowiona_ryba import ZlowionaRyba
from models.lowisko import Lowisko
from models.gatunek import Gatunek
from utils.security import get_password_hash, verify_password
from services.audit_log import log_audit
from typing import List
router = APIRouter()

async def get_user_roles(user_id: int, db: AsyncSession) -> list[str]:
    result = await db.execute(
        select(Rola.nazwa)
        .join(UzytkownikRola, UzytkownikRola.rola_id == Rola.id)
        .where(UzytkownikRola.uzytkownik_id == user_id)
    )
    return [row[0] for row in result.all()]

@router.get("/me", response_model=UserProfile)
async def get_my_profile(
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    roles = await get_user_roles(current_user.id, db)
    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        imie=current_user.imie,
        nazwisko=current_user.nazwisko,
        nr_licencji=current_user.nr_licencji,
        status=current_user.status,
        roles=roles
    )

@router.put("/me", response_model=UserProfile)
async def update_my_profile(
    update_data: UserUpdate,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    update_fields = update_data.dict(exclude_none=True)
    for field_name, value in update_fields.items():
        setattr(current_user, field_name, value)
    await db.commit()
    await db.refresh(current_user)
    await log_audit(db, current_user.id, "UZYTKOWNICY", current_user.id, "UPDATE", None, update_fields)
    roles = await get_user_roles(current_user.id, db)
    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        imie=current_user.imie,
        nazwisko=current_user.nazwisko,
        nr_licencji=current_user.nr_licencji,
        status=current_user.status,
        roles=roles
    )

@router.post("/change-password")
async def change_password(
    data: ChangePassword,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not verify_password(data.old_password, current_user.haslo_hash):
        raise HTTPException(status_code=400, detail="Nieprawidłowe stare hasło")
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Nowe hasła nie są identyczne")
    current_user.haslo_hash = get_password_hash(data.new_password)
    await db.commit()
    await log_audit(db, current_user.id, "UZYTKOWNICY", current_user.id, "UPDATE_PASSWORD", None, None)
    return {"message": "Hasło zmienione"}

@router.get("/dashboard")
async def get_dashboard_stats(
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = current_user.id

    # 1. Liczba sesji – raw SQL
    result = await db.execute(
    text('SELECT COUNT(*) FROM "SESJE_POLOWU" WHERE uzytkownik_id = :user_id'),
    {"user_id": user_id}
)
    liczba_sesji = result.scalar()

    # 2. Liczba ryb – raw SQL z JOIN
    result = await db.execute(
    text("""
        SELECT COUNT(*)
        FROM "ZLOWIONE_RYBY"
        JOIN "SESJE_POLOWU" ON "ZLOWIONE_RYBY".sesja_id = "SESJE_POLOWU".id
        WHERE "SESJE_POLOWU".uzytkownik_id = :user_id
    """),
    {"user_id": user_id}
)
    liczba_ryb = result.scalar()

    # 3. Ulubione łowisko – raw SQL z GROUP BY
    result = await db.execute(
    text("""
        SELECT "LOWISKA".nazwa, COUNT(*) as liczba
        FROM "SESJE_POLOWU"
        JOIN "LOWISKA" ON "SESJE_POLOWU".lowisko_id = "LOWISKA".id
        WHERE "SESJE_POLOWU".uzytkownik_id = :user_id
        GROUP BY "LOWISKA".id
        ORDER BY liczba DESC
        LIMIT 1
    """),
    {"user_id": user_id}
)
    ulubione = result.first()
    ulubione_nazwa = ulubione[0] if ulubione else None

    # 4. Ostatnie 5 połowów – raw SQL z trzema tabelami
    result = await db.execute(
    text("""
        SELECT
            "ZLOWIONE_RYBY".id,
            "ZLOWIONE_RYBY".waga_kg,
            "ZLOWIONE_RYBY".dlugosc_cm,
            "ZLOWIONE_RYBY".wypuszczona,
            "ZLOWIONE_RYBY".czas_zlowienia,
            "GATUNKI".nazwa_polska,
            "SESJE_POLOWU".start_czas
        FROM "ZLOWIONE_RYBY"
        JOIN "GATUNKI" ON "ZLOWIONE_RYBY".gatunek_id = "GATUNKI".id
        JOIN "SESJE_POLOWU" ON "ZLOWIONE_RYBY".sesja_id = "SESJE_POLOWU".id
        WHERE "SESJE_POLOWU".uzytkownik_id = :user_id
        ORDER BY "ZLOWIONE_RYBY".created_at DESC
        LIMIT 5
    """),
    {"user_id": user_id}
)
    rows = result.all()
    ostatnie_polowy = []
    for row in rows:
        ostatnie_polowy.append({
            "gatunek": row[5],           # nazwa_polska
            "waga_kg": float(row[1]) if row[1] is not None else None,
            "data": row[6]               # start_czas
        })

    return {
        "liczba_sesji": liczba_sesji,
        "liczba_zlowionych_ryb": liczba_ryb,
        "ulubione_lowisko": ulubione_nazwa,
        "ostatnie_polowy": ostatnie_polowy
    }