# Plik: utils/security.py
# Funkcje pomocnicze: hashowanie haseł, tworzenie/weryfikacja JWT,
# obsługa refresh tokenów (w pamięci – uproszczone, ale można rozwinąć z bazą).

from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.uzytkownik import Uzytkownik
from models.rola import Rola, UzytkownikRola
from typing import Optional, Dict

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto") #bycrypt do hashowania 


refresh_tokens_store: Dict[int, str] = {} # Prosty słownik do przechowywania refresh tokenów (user_id: token)

def get_password_hash(password: str) -> str:
    """Hashuje hasło przy użyciu bcrypt (max 72 bajty)"""
    # Ogranicz do 72 bajtów dla bcrypt
    password_truncated = password[:72] if len(password) > 72 else password
    return pwd_context.hash(password_truncated)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Weryfikuje hasło z hashem"""
    # Ogranicz do 72 bajtów dla bcrypt
    password_truncated = plain_password[:72] if len(plain_password) > 72 else plain_password
    return pwd_context.verify(password_truncated, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None) -> str: # data to słownik z danymi, które chcemy zakodować w tokenie (np. user_id), expires_delta to opcjonalny czas ważności tokena
    """Tworzy JWT access token (krótkotrwały)"""
    to_encode = data.copy() # tworzymy kopię danych, które chcemy zakodować w tokenie
    if expires_delta:
        expire = datetime.utcnow() + expires_delta # jeśli expires_delta jest podany, ustawiamy czas wygaśnięcia na aktualny czas + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)    # jeśli expires_delta nie jest podany, ustawiamy czas wygaśnięcia na ACCESS_TOKEN_EXPIRE_MINUTES z ustawień
    to_encode.update({"exp": expire, "type": "access"}) # dodajemy do danych pole exp z czasem wygaśnięcia tokena oraz pole type z wartością "access", aby odróżnić tokeny dostępu od refresh tokenów
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM) # tworzymy JWT, który zawiera dane z to_encode, podpisany kluczem SECRET_KEY i algorytmem określonym w settings.ALGORITHM
    return encoded_jwt

def create_refresh_token(data: dict) -> str: # data to słownik z danymi, które chcemy zakodować w tokenie (np. user_id)
    """Tworzy JWT refresh token (dłuższy czas życia)"""
    to_encode = data.copy() # tworzymy kopię danych, które chcemy zakodować w tokenie
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS) # ustawiamy czas wygaśnięcia na REFRESH_TOKEN_EXPIRE_DAYS z ustawień (np. 7 dni) 
    to_encode.update({"exp": expire, "type": "refresh"}) # dodajemy do danych pole exp z czasem wygaśnięcia tokena oraz pole type z wartością "refresh", aby odróżnić tokeny dostępu od refresh tokenów
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM) # tworzymy JWT, który zawiera dane z to_encode, podpisany kluczem SECRET_KEY i algorytmem określonym w settings.ALGORITHM
    return encoded_jwt

def decode_token(token: str) -> dict:
    """Dekoduje JWT i zwraca payload(dane zapisane w tokenie). W przypadku błędu zwraca None"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]) # 
        return payload
    except JWTError:
        return None

async def get_user_by_email(db: AsyncSession, email: str) -> Optional[Uzytkownik]:
    """Pobiera użytkownika na podstawie emaila"""
    result = await db.execute(select(Uzytkownik).where(Uzytkownik.email == email))
    return result.scalar_one_or_none()

async def save_refresh_token(db: AsyncSession, user_id: int, refresh_token: str) -> None:
    """Zapisuje refresh token (tu w słowniku, ale można w tabeli)"""
    refresh_tokens_store[user_id] = refresh_token

async def verify_refresh_token(db: AsyncSession, user_id: int, token: str) -> bool:
    """Sprawdza czy refresh token jest ważny i zgodny z zapisanym"""
    stored = refresh_tokens_store.get(user_id)
    return stored == token

async def revoke_refresh_token(db: AsyncSession, user_id: int, token: str) -> None:
    """Unieważnia refresh token"""
    if refresh_tokens_store.get(user_id) == token:
        del refresh_tokens_store[user_id]

async def init_db_roles(db: AsyncSession) -> None:
    """Inicjalizuje podstawowe role i uprawnienia w bazie (seed)"""
    from models.rola import Rola, UzytkownikRola
    from models.uprawnienie import Uprawnienie, RolaUprawnienie
    # Sprawdź czy role istnieją
    for role_name in ["Wędkarz", "Właściciel", "Moderator", "Admin"]:
        exists = await db.execute(select(Rola).where(Rola.nazwa == role_name))
        if not exists.scalar_one_or_none():
            db.add(Rola(nazwa=role_name, opis=f"Rola {role_name}"))
    await db.commit()