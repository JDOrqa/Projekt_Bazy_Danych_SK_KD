# Plik: routers/auth.py
# Endpointy: rejestracja, logowanie, odświeżanie tokena, potwierdzenie email.
# Używane przez frontend (Login.js, Register.js, EmailVerify.js)
# Komentarze wyjaśniają każdy krok.

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr, Field, validator 
from datetime import timedelta
import secrets

from database import get_db
from schemas.auth import UserCreate, Token, EmailVerifyRequest
from services.email import send_verification_email  # mock – zakładamy, że istnieje
from utils.security import (
    get_password_hash, verify_password, create_access_token,
    create_refresh_token, decode_token, get_user_by_email,
    save_refresh_token, verify_refresh_token, revoke_refresh_token
)
from models.uzytkownik import Uzytkownik
from models.rola import Rola, UzytkownikRola
from dependencies.auth import get_current_user

router = APIRouter()

# Prosta pamięć dla tokenów weryfikacyjnych 
verification_tokens = {}  # {user_id: token}


def generate_verification_token(user_id: int) -> str:
    #Generuje losowy token dla weryfikacji email."""
    token = secrets.token_urlsafe(32)
    verification_tokens[user_id] = token
    return token

def verify_email_token(user_id: int, token: str) -> bool:
    #Sprawdza czy token jest poprawny."""
    stored = verification_tokens.get(user_id)
    if stored and stored == token:
        del verification_tokens[user_id]
        return True
    return False

@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    
   # Rejestracja nowego użytkownika.
   # - Sprawdza czy email już istnieje.
    #- Hashuje hasło.
   # - Zapisuje użytkownika ze statusem 'nieaktywny'.
   # - Przypisuje domyślną rolę 'Wędkarz'.
   # - Wysyła link weryfikacyjny (email w tle).
    
    # 1. Sprawdź czy użytkownik o podanym emailu już istnieje 
    existing = await get_user_by_email(db, user_data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email już zarejestrowany")
    
    # 2. Hash hasła
    hashed = get_password_hash(user_data.password)
    
    # 3. Utwórz nowego użytkownika 
    new_user = Uzytkownik(
        email=user_data.email,
        haslo_hash=hashed,
        imie=user_data.imie,
        nazwisko=user_data.nazwisko,
        nr_licencji=user_data.nr_licencji,
        status="aktywny"
    )
    db.add(new_user)
    await db.flush()  # aby uzyskać new_user.id
    
    # 4. Przypisz domyślną rolę "Wędkarz" 
    result = await db.execute(select(Rola).where(Rola.nazwa == "Wędkarz"))
    wedkarz_role = result.scalar_one_or_none()
    if wedkarz_role:
        user_role = UzytkownikRola(uzytkownik_id=new_user.id, rola_id=wedkarz_role.id)
        db.add(user_role)
    
    await db.commit()
    await db.refresh(new_user)
    
    # 5. Wygeneruj token weryfikacyjny i wyślij email w tle
    token = generate_verification_token(new_user.id)
    background_tasks.add_task(send_verification_email, user_data.email, new_user.id, token)
    
    return {"message": "Rejestracja udana. Sprawdź skrzynkę email, aby aktywować konto."}

@router.get("/verify-email")
async def verify_email(user_id: int, token: str, db: AsyncSession = Depends(get_db)):
    
   # Potwierdzenie adresu email – wywoływane po kliknięciu w link z maila.
   # Aktywuje konto użytkownika.
    
    # 1. Sprawdź czy token jest poprawny
    if not verify_email_token(user_id, token):
        raise HTTPException(status_code=400, detail="Nieprawidłowy lub wygasły token weryfikacyjny")
    
    # 2. Pobierz użytkownika
    user = await db.get(Uzytkownik, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")
    
    if user.status != "nieaktywny":
        raise HTTPException(status_code=400, detail="Konto już aktywowane")
    
    # 3. Zmień status na aktywny
    user.status = "aktywny"
    await db.commit()
    
    return {"message": "Email potwierdzony. Możesz się teraz zalogować."}

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    
   # Logowanie użytkownika (grant_type=password).
   # Zwraca access_token (ważny 60 sekund) oraz refresh_token (ważny 7 dni).
   # W przypadku nieprawidłowych danych lub nieaktywnego konta zwraca 401.
    
    # 1. Pobierz użytkownika po emailu
    user = await get_user_by_email(db, form_data.username)
    if not user or not verify_password(form_data.password, user.haslo_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy email lub hasło",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 2. Sprawdź czy konto jest aktywne
    if user.status != "aktywny":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Konto nieaktywne. Potwierdź email lub skontaktuj się z administratorem.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. Utwórz tokeny
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    # 4. Zapisz refresh_token (w pamięci lub bazie)
    await save_refresh_token(db, user.id, refresh_token)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }
class RefreshTokenRequest(BaseModel):
    refresh_token: str
@router.post("/refresh", response_model=Token)
async def refresh_access_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    refresh_token = request.refresh_token
    
   # Odświeżenie access_token przy użyciu ważnego refresh_token.
   # Rotacja: generuje nowy access_token oraz nowy refresh_token (unieważnia stary).
    
    # 1. Dekoduj refresh token
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy refresh token"
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Brak identyfikatora użytkownika")
    
    # 2. Sprawdź czy refresh token jest zapisany i ważny
    if not await verify_refresh_token(db, int(user_id), refresh_token):
        raise HTTPException(status_code=401, detail="Refresh token unieważniony")
    
    # 3. Generuj nowe tokeny (rotacja)
    new_access = create_access_token(data={"sub": user_id})
    new_refresh = create_refresh_token(data={"sub": user_id})
    
    # 4. Unieważnij stary refresh token i zapisz nowy
    await revoke_refresh_token(db, int(user_id), refresh_token)
    await save_refresh_token(db, int(user_id), new_refresh)
    
    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer"
    }

@router.post("/logout")
async def logout(
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    
  #  Wylogowanie – unieważnia refresh_token zalogowanego użytkownika.
   # Access token wygaśnie sam po 60 sekundach.
    
    await revoke_refresh_token(db, current_user.id, None)  # usuń wszystkie refresh tokeny dla usera
    return {"message": "Pomyślnie wylogowano"}