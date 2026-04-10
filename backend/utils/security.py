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

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Prosta pamięć podręczna refresh tokenów (w produkcji użyć Redis lub tabeli)
refresh_tokens_store: Dict[int, str] = {}

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

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """Tworzy JWT access token (krótkotrwały)"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Tworzy JWT refresh token (dłuższy czas życia)"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> dict:
    """Dekoduje JWT i zwraca payload. W przypadku błędu zwraca None"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
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