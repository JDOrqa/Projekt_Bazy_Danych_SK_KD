# Plik: dependencies/auth.py
# Zawiera funkcje do pobierania aktualnego użytkownika z JWT oraz sprawdzania uprawnień (RBAC).
# Używane przez wszystkie chronione endpointy.

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError
from typing import List
from database import get_db
from models.uzytkownik import Uzytkownik
from models.rola import Rola, UzytkownikRola
from models.uprawnienie import Uprawnienie, RolaUprawnienie
from utils.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=True) # Używamy tego schematu do pobierania tokena z nagłówka Authorization 
# Frontend wysyła Authorization: Bearer <token>. oauth2_scheme wyciąga ten token i przekazuje go do funkcji get_current_user. Ty sam weryfikujesz JWT i zwracasz użytkownika.
#Weryfikacja JWT i zwracanie użytkownika odbywa się w pliku backend/dependencies/auth.py w funkcji get_current_user.
#Krok po kroku:
#Funkcja get_current_user pobiera token JWT z nagłówka Authorization (dzięki OAuth2PasswordBearer).
#Wywołuje decode_token(token) z utils.security – ta funkcja używa jwt.decode do weryfikacji podpisu i ważności tokena.
#Jeśli token jest poprawny i ma typ access, odczytuje user_id z pola sub.
#Następnie pobiera użytkownika z bazy: user = await db.get(Uzytkownik, int(user_id)).
#Sprawdza, czy użytkownik istnieje i czy jego status to aktywny.
#Zwraca obiekt Uzytkownik (lub rzuca wyjątek 401).
#Bearer to rodzaj schematu autoryzacji w nagłówku Authorization HTTP.
#Gdy klient (np. frontend) chce udowodnić, że jest zalogowany, wysyła:Authorization: Bearer <token_jwt>


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Uzytkownik:
    
    #Pobiera użytkownika na podstawie tokena JWT (access_token).
    #Rzuca 401 jeśli token nieprawidłowy, wygasły lub użytkownik nieaktywny.
    
    credentials_exception = HTTPException( # definiujemy wyjątek, który zostanie rzucony w przypadku problemów z uwierzytelnianiem
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Nieprawidłowe dane uwierzytelniające",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token) # dekodujemy token, jeśli jest nieprawidłowy lub wygasły, decode_token zwróci None
        if payload is None or payload.get("type") != "access": # sprawdzamy, czy token jest typu access (nie refresh)
            raise credentials_exception # jeśli token jest nieprawidłowy, wygasły lub nie jest typu access, rzucamy wyjątek 401
        user_id: str = payload.get("sub") # pobieramy user_id z pola sub w payloadzie tokena
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await db.get(Uzytkownik, int(user_id)) # pobieramy użytkownika z bazy danych na podstawie user_id
    if user is None or user.status != "aktywny":
        raise credentials_exception
    return user

async def has_permission(user: Uzytkownik, required_permission: str, db: AsyncSession) -> bool: # funkcja pomocnicza do sprawdzania uprawnień użytkownika
  
   # Sprawdza, czy użytkownik (poprzez swoje role) posiada dane uprawnienie.
    
    # Pobierz role użytkownika
    result = await db.execute(
        select(Rola).join(UzytkownikRola).where(UzytkownikRola.uzytkownik_id == user.id)
    )
    roles = result.scalars().all()
    for role in roles:
        # Sprawdź uprawnienia dla każdej roli
        perm_result = await db.execute(
            select(Uprawnienie).join(RolaUprawnienie).where(RolaUprawnienie.rola_id == role.id)
        )
        permissions = perm_result.scalars().all()
        if any(p.kod == required_permission for p in permissions):
            return True
    return False

def require_permission(permission: str):
    
   # Dependency do sprawdzania uprawnień – użyj jako Depends(require_permission("lake.create"))
    
    async def permission_checker(
        current_user: Uzytkownik = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
    ):
        if not await has_permission(current_user, permission, db):
            raise HTTPException(status_code=403, detail="Brak uprawnień do wykonania tej operacji")
        return current_user
    return permission_checker