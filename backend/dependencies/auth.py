# Plik: dependencies/auth.py
# Zawiera funkcje do pobierania aktualnego użytkownika z JWT oraz sprawdzania uprawnień (RBAC).
# Używane przez wszystkie chronione endpointy.

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError

from database import get_db
from models.uzytkownik import Uzytkownik
from models.rola import Rola, UzytkownikRola
from models.uprawnienie import Uprawnienie, RolaUprawnienie
from utils.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=True)

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Uzytkownik:
    
    #Pobiera użytkownika na podstawie tokena JWT (access_token).
    #Rzuca 401 jeśli token nieprawidłowy, wygasły lub użytkownik nieaktywny.
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Nieprawidłowe dane uwierzytelniające",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        if payload is None or payload.get("type") != "access":
            raise credentials_exception
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await db.get(Uzytkownik, int(user_id))
    if user is None or user.status != "aktywny":
        raise credentials_exception
    return user

async def has_permission(user: Uzytkownik, required_permission: str, db: AsyncSession) -> bool:
  
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