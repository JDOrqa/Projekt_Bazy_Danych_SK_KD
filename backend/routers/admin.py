# Plik: routers/admin.py
# Endpointy dla administratora:
# - zarządzanie użytkownikami (blokada, zmiana roli, usuwanie)
# - zarządzanie rolami (CRUD)
# - zarządzanie uprawnieniami
# - zarządzanie gatunkami (CRUD) – ale to może być osobny router

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from database import get_db
from schemas.user import UserAdminUpdate, UserResponse
from schemas.role import RoleCreate, RoleResponse, RoleUpdate
from schemas.gatunek import GatunekCreate, GatunekResponse, GatunekUpdate
from models.uzytkownik import Uzytkownik
from models.rola import Rola, UzytkownikRola
from models.gatunek import Gatunek
from dependencies.auth import get_current_user, require_permission
from services.audit_log import log_audit

router = APIRouter()

# --- Zarządzanie użytkownikami (tylko Admin) ---
@router.get("/users", response_model=list[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: Uzytkownik = Depends(require_permission("admin.users.view")),
    db: AsyncSession = Depends(get_db)
):
    """Lista wszystkich użytkowników (Admin)."""
    result = await db.execute(select(Uzytkownik).offset(skip).limit(limit))
    return result.scalars().all()

@router.patch("/users/{user_id}/status")
async def change_user_status(
    user_id: int,
    status_data: dict,  # {"status": "aktywny"} lub "zablokowany"
    current_user: Uzytkownik = Depends(require_permission("admin.users.edit")),
    db: AsyncSession = Depends(get_db)
):
    """Zmiana statusu użytkownika (aktywny/zablokowany)."""
    user = await db.get(Uzytkownik, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")
    new_status = status_data.get("status")
    if new_status not in ["aktywny", "zablokowany", "nieaktywny"]:
        raise HTTPException(status_code=400, detail="Nieprawidłowy status")
    user.status = new_status
    await db.commit()
    await log_audit(db, current_user.id, "UZYTKOWNICY", user_id, "UPDATE_STATUS", None, {"status": new_status})
    return {"message": "Status zaktualizowany"}

@router.post("/users/{user_id}/roles")
async def assign_role_to_user(
    user_id: int,
    role_id: int,
    current_user: Uzytkownik = Depends(require_permission("admin.roles.assign")),
    db: AsyncSession = Depends(get_db)
):
    """Przypisanie roli użytkownikowi."""
    user = await db.get(Uzytkownik, user_id)
    role = await db.get(Rola, role_id)
    if not user or not role:
        raise HTTPException(status_code=404, detail="Użytkownik lub rola nie istnieje")
    # Sprawdź czy już ma
    existing = await db.execute(
        select(UzytkownikRola).where(
            UzytkownikRola.uzytkownik_id == user_id,
            UzytkownikRola.rola_id == role_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Użytkownik już ma tę rolę")
    user_role = UzytkownikRola(uzytkownik_id=user_id, rola_id=role_id)
    db.add(user_role)
    await db.commit()
    await log_audit(db, current_user.id, "UZYTKOWNIK_ROLE", 0, "INSERT", None, {"user_id": user_id, "role_id": role_id})
    return {"message": "Rola przypisana"}

@router.delete("/users/{user_id}/roles/{role_id}")
async def remove_role_from_user(
    user_id: int,
    role_id: int,
    current_user: Uzytkownik = Depends(require_permission("admin.roles.assign")),
    db: AsyncSession = Depends(get_db)
):
    """Usuwa rolę użytkownikowi."""
    await db.execute(
        delete(UzytkownikRola).where(
            UzytkownikRola.uzytkownik_id == user_id,
            UzytkownikRola.rola_id == role_id
        )
    )
    await db.commit()
    return {"message": "Rola usunięta"}

# --- Zarządzanie rolami (CRUD) ---
@router.get("/roles", response_model=list[RoleResponse])
async def list_roles(
    current_user: Uzytkownik = Depends(require_permission("admin.roles.view")),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Rola))
    return result.scalars().all()

@router.post("/roles", response_model=RoleResponse)
async def create_role(
    role_data: RoleCreate,
    current_user: Uzytkownik = Depends(require_permission("admin.roles.create")),
    db: AsyncSession = Depends(get_db)
):
    existing = await db.execute(select(Rola).where(Rola.nazwa == role_data.nazwa))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Rola już istnieje")
    new_role = Rola(nazwa=role_data.nazwa, opis=role_data.opis)
    db.add(new_role)
    await db.commit()
    await db.refresh(new_role)
    return new_role

# PUT, DELETE analogicznie

# --- Zarządzanie gatunkami (CRUD) – mogą też mieć dostęp Moderatorzy ---
@router.get("/gatunki", response_model=list[GatunekResponse])
async def list_gatunki(
    skip: int = 0,
    limit: int = 100,
    current_user: Uzytkownik = Depends(get_current_user),  # każdy zalogowany może przeglądać
    db: AsyncSession = Depends(get_db)
):
    """Lista gatunkow (publiczna dla zalogowanych)."""
    result = await db.execute(select(Gatunek).where(Gatunek.deleted_at.is_(None)).offset(skip).limit(limit))
    return result.scalars().all()

@router.post("/gatunki", response_model=GatunekResponse)
async def create_gatunek(
    data: GatunekCreate,
    current_user: Uzytkownik = Depends(require_permission("gatunki.create")),  # Admin lub Moderator
    db: AsyncSession = Depends(get_db)
):
    existing = await db.execute(select(Gatunek).where(Gatunek.nazwa_polska == data.nazwa_polska))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Gatunek już istnieje")
    new_gatunek = Gatunek(**data.dict())
    db.add(new_gatunek)
    await db.commit()
    await db.refresh(new_gatunek)
    await log_audit(db, current_user.id, "GATUNKI", new_gatunek.id, "INSERT", None, data.dict())
    return new_gatunek

@router.put("/gatunki/{gatunek_id}", response_model=GatunekResponse)
async def update_gatunek(
    gatunek_id: int,
    data: GatunekUpdate,
    current_user: Uzytkownik = Depends(require_permission("gatunki.edit")),
    db: AsyncSession = Depends(get_db)
):
    gatunek = await db.get(Gatunek, gatunek_id)
    if not gatunek or gatunek.deleted_at:
        raise HTTPException(status_code=404, detail="Gatunek nie znaleziony")
    for key, value in data.dict(exclude_unset=True).items():
        setattr(gatunek, key, value)
    await db.commit()
    await db.refresh(gatunek)
    await log_audit(db, current_user.id, "GATUNKI", gatunek_id, "UPDATE", None, data.dict())
    return gatunek

@router.delete("/gatunki/{gatunek_id}")
async def delete_gatunek(
    gatunek_id: int,
    current_user: Uzytkownik = Depends(require_permission("gatunki.delete")),
    db: AsyncSession = Depends(get_db)
):
    """Miekkie usuniecie gatunku."""
    gatunek = await db.get(Gatunek, gatunek_id)
    if not gatunek:
        raise HTTPException(status_code=404)
    gatunek.deleted_at = func.now()
    await db.commit()
    await log_audit(db, current_user.id, "GATUNKI", gatunek_id, "DELETE", None, None)
    return {"message": "Gatunek usunięty"}