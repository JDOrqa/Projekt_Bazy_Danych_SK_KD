# Plik: routers/users.py
# Endpointy: profil użytkownika, dashboard statystyk, zmiana hasła.

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
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
    """Pobiera dane zalogowanego użytkownika wraz z jego rolami."""
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
    """Aktualizacja danych profilu (bez zmiany hasła)."""
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
    """Zmiana hasła – wymaga podania starego hasła."""
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
    """
    Dashboard użytkownika – statystyki:
    - liczba sesji połowów
    - liczba złowionych ryb
    - ulubione łowisko (najczęściej odwiedzane)
    - ostatnie 5 połowów
    """
    # Liczba sesji
    sesje_count = await db.execute(
        select(func.count()).select_from(SesjaPolowu).where(SesjaPolowu.uzytkownik_id == current_user.id)
    )
    # Liczba ryb
    ryby_count = await db.execute(
        select(func.count())
        .select_from(ZlowionaRyba)
        .join(SesjaPolowu)
        .where(SesjaPolowu.uzytkownik_id == current_user.id)
    )
    # Ulubione łowisko – najwięcej sesji
    fav_lake = await db.execute(
        select(Lowisko.nazwa, func.count(SesjaPolowu.id))
        .join(SesjaPolowu, Lowisko.id == SesjaPolowu.lowisko_id)
        .where(SesjaPolowu.uzytkownik_id == current_user.id)
        .group_by(Lowisko.id)
        .order_by(func.count().desc())
        .limit(1)
    )
    favorite = fav_lake.first()
    # Ostatnie 5 połowów (z gatunkiem, wagą, datą)
    recent = await db.execute(
        select(ZlowionaRyba, Gatunek.nazwa_polska, SesjaPolowu.start_czas)
        .join(Gatunek, ZlowionaRyba.gatunek_id == Gatunek.id)
        .join(SesjaPolowu, ZlowionaRyba.sesja_id == SesjaPolowu.id)
        .where(SesjaPolowu.uzytkownik_id == current_user.id)
        .order_by(ZlowionaRyba.created_at.desc())
        .limit(5)
    )
    recent_catches = [{"gatunek": r[1], "waga_kg": r[0].waga_kg, "data": r[2]} for r in recent.all()]
    
    return {
        "liczba_sesji": sesje_count.scalar(),
        "liczba_zlowionych_ryb": ryby_count.scalar(),
        "ulubione_lowisko": favorite[0] if favorite else None,
        "ostatnie_polowy": recent_catches
    }
