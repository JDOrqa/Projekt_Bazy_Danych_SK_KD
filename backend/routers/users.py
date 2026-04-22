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

router = APIRouter()  # tworzy instancję routera do grupowania endpointów

async def get_user_roles(user_id: int, db: AsyncSession) -> list[str]:  # funkcja zwraca listę nazw ról użytkownika
    result = await db.execute(  # wykonuje zapytanie asynchronicznie
        select(Rola.nazwa)  # wybiera tylko kolumnę nazwa z tabeli Rola
        .join(UzytkownikRola, UzytkownikRola.rola_id == Rola.id)  # łączy role z przypisaniami
        .where(UzytkownikRola.uzytkownik_id == user_id)  # filtruje po id użytkownika
    )
    return [row[0] for row in result.all()]  # zwraca listę samych nazw (pierwszy element każdej krotki)

@router.get("/me", response_model=UserProfile)  # GET /api/users/me – zwraca profil zalogowanego
async def get_my_profile(
    current_user: Uzytkownik = Depends(get_current_user),  # pobiera użytkownika z tokena JWT
    db: AsyncSession = Depends(get_db)  # wstrzykuje sesję bazy danych
):
    """Pobiera dane zalogowanego użytkownika wraz z jego rolami."""
    roles = await get_user_roles(current_user.id, db)  # pobiera listę ról
    return UserProfile(  # tworzy obiekt odpowiedzi zgodny ze schematem
        id=current_user.id,
        email=current_user.email,
        imie=current_user.imie,
        nazwisko=current_user.nazwisko,
        nr_licencji=current_user.nr_licencji,
        status=current_user.status,
        roles=roles
    )

@router.put("/me", response_model=UserProfile)  # PUT /api/users/me – aktualizacja profilu
async def update_my_profile(
    update_data: UserUpdate,  # dane do aktualizacji (wszystkie opcjonalne)
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Aktualizacja danych profilu (bez zmiany hasła)."""
    update_fields = update_data.dict(exclude_none=True)  # pomija pola z wartością None
    for field_name, value in update_fields.items():  # iteruje po przesłanych polach
        setattr(current_user, field_name, value)  # dynamicznie ustawia atrybut obiektu
    await db.commit()  # zatwierdza zmiany w bazie
    await db.refresh(current_user)  # odświeża obiekt (np. daty aktualizacji)
    await log_audit(db, current_user.id, "UZYTKOWNICY", current_user.id, "UPDATE", None, update_fields)  # loguje operację
    roles = await get_user_roles(current_user.id, db)  # ponownie pobiera role (mogły się zmienić)
    return UserProfile(  # zwraca zaktualizowany profil
        id=current_user.id,
        email=current_user.email,
        imie=current_user.imie,
        nazwisko=current_user.nazwisko,
        nr_licencji=current_user.nr_licencji,
        status=current_user.status,
        roles=roles
    )

@router.post("/change-password")  # POST /api/users/change-password – zmiana hasła
async def change_password(
    data: ChangePassword,  # stare hasło, nowe, potwierdzenie
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Zmiana hasła – wymaga podania starego hasła."""
    if not verify_password(data.old_password, current_user.haslo_hash):  # sprawdza czy stare hasło poprawne
        raise HTTPException(status_code=400, detail="Nieprawidłowe stare hasło")  # błąd 400
    if data.new_password != data.confirm_password:  # sprawdza czy nowe i potwierdzenie są identyczne
        raise HTTPException(status_code=400, detail="Nowe hasła nie są identyczne")
    current_user.haslo_hash = get_password_hash(data.new_password)  # hashuje nowe hasło i zapisuje
    await db.commit()  # zatwierdza zmianę
    await log_audit(db, current_user.id, "UZYTKOWNICY", current_user.id, "UPDATE_PASSWORD", None, None)  # loguje
    return {"message": "Hasło zmienione"}  # zwraca komunikat sukcesu

@router.get("/dashboard")  # GET /api/users/dashboard – statystyki użytkownika
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
    )  # SELECT COUNT(*) FROM SESJA_POLOWU WHERE uzytkownik_id = ?
    # Liczba ryb (złączenie z sesjami, żeby policzyć tylko ryby użytkownika)
    ryby_count = await db.execute(
        select(func.count())
        .select_from(ZlowionaRyba)
        .join(SesjaPolowu)
        .where(SesjaPolowu.uzytkownik_id == current_user.id)
    )  # SELECT COUNT(*) FROM ZLOWIONA_RYBA JOIN SESJA_POLOWU ...
    # Ulubione łowisko – najwięcej sesji (grupowanie po łowisku, zliczanie sesji, sortowanie malejąco, pierwszy)
    fav_lake = await db.execute(
        select(Lowisko.nazwa, func.count(SesjaPolowu.id))
        .join(SesjaPolowu, Lowisko.id == SesjaPolowu.lowisko_id)
        .where(SesjaPolowu.uzytkownik_id == current_user.id)
        .group_by(Lowisko.id)
        .order_by(func.count().desc())
        .limit(1)
    )
    favorite = fav_lake.first()  # pobiera pierwszy wiersz (może być None)
    # Ostatnie 5 połowów – złączenie: złowiona ryba -> gatunek (nazwa) i sesja (data)
    recent = await db.execute(
        select(ZlowionaRyba, Gatunek.nazwa_polska, SesjaPolowu.data_rozpoczecia)
        .join(Gatunek, ZlowionaRyba.gatunek_id == Gatunek.id)
        .join(SesjaPolowu, ZlowionaRyba.sesja_id == SesjaPolowu.id)
        .where(SesjaPolowu.uzytkownik_id == current_user.id)
        .order_by(ZlowionaRyba.created_at.desc())
        .limit(5)
    )
    # Tworzy listę słowników: gatunek, waga, data (dla każdego wiersza)
    recent_catches = [{"gatunek": r[1], "waga_g": r[0].waga_g, "data": r[2]} for r in recent.all()]
    
    return {  # zwraca obiekt JSON ze statystykami
        "liczba_sesji": sesje_count.scalar(),  # pierwsza wartość z zapytania
        "liczba_zlowionych_ryb": ryby_count.scalar(),
        "ulubione_lowisko": favorite[0] if favorite else None,  # nazwa łowiska lub None
        "ostatnie_polowy": recent_catches
    }