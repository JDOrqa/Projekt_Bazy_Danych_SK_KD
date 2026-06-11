# Plik: routers/admin.py
# Panel administratora – zarządzanie użytkownikami, rolami, uprawnieniami, gatunkami.

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, delete, func
from typing import List, Optional
from database import get_db
from dependencies.auth import get_current_user, require_permission
from models.uzytkownik import Uzytkownik
from models.rola import Rola, UzytkownikRola
from models.uprawnienie import Uprawnienie, RolaUprawnienie
from models.gatunek import Gatunek
from schemas.user import UserResponse
from schemas.role import RoleCreate, RoleResponse, RoleUpdate
from schemas.gatunek import GatunekCreate, GatunekResponse, GatunekUpdate
from services.audit_log import log_audit

router = APIRouter()

# ===================== ZARZĄDZANIE UŻYTKOWNIKAMI =====================

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: Uzytkownik = Depends(require_permission("admin.users.view")),
    db: AsyncSession = Depends(get_db) 

    # Funkcja COALESCE w SQL przyjmuje listę wartości lub kolumn i zwraca pierwszą wartość, która nie jest pusta (NULL).
):
    """Lista użytkowników z ich rolami (raw query z json_agg to funkcja agregująca, która pobiera wartości z wielu wierszy bazy danych i łączy je w jedną tablicę JSON)."""
    sql = """
        SELECT 
            u."id", u."email", u."imie", u."nazwisko", u."nr_licencji", u."status",
            COALESCE(
                (SELECT json_agg(r."nazwa") 
                 FROM "UZYTKOWNIK_ROLE" ur 
                 JOIN "ROLE" r ON ur."rola_id" = r."id" 
                 WHERE ur."uzytkownik_id" = u."id"),  
                '[]'::json
            ) as roles
        FROM "UZYTKOWNICY" u
        WHERE u."deleted_at" IS NULL
        ORDER BY u."id"
        LIMIT :limit OFFSET :skip
    """
    result = await db.execute(text(sql), {"limit": limit, "skip": skip})
    rows = result.mappings().all()
    
    response = []
    for row in rows:
        response.append(UserResponse(
            id=row["id"],
            email=row["email"],
            imie=row["imie"],
            nazwisko=row["nazwisko"],
            nr_licencji=row["nr_licencji"],
            status=row["status"],
            roles=row["roles"] if row["roles"] else []
        ))
    return response

@router.patch("/users/{user_id}/status")
async def change_user_status(
    user_id: int,
    status_data: dict,
    current_user: Uzytkownik = Depends(require_permission("admin.users.edit")),
    db: AsyncSession = Depends(get_db)
):
   
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
    role_id: int = Query(...),
    current_user: Uzytkownik = Depends(require_permission("admin.roles.assign")),
    db: AsyncSession = Depends(get_db)
):
    # ORM (można zostawić)
    user = await db.get(Uzytkownik, user_id)
    role = await db.get(Rola, role_id)
    if not user or not role:
        raise HTTPException(status_code=404, detail="Użytkownik lub rola nie istnieje")
    # Sprawdzenie czy już ma (raw query)
    check_sql = text("""
        SELECT 1 FROM "UZYTKOWNIK_ROLE" 
        WHERE "uzytkownik_id" = :uid AND "rola_id" = :rid
    """)
    exists = await db.execute(check_sql, {"uid": user_id, "rid": role_id})
    if exists.first():
        raise HTTPException(status_code=400, detail="Użytkownik już ma tę rolę")
    # Insert raw
    insert_sql = text("""
        INSERT INTO "UZYTKOWNIK_ROLE" ("uzytkownik_id", "rola_id")
        VALUES (:uid, :rid)
    """)
    await db.execute(insert_sql, {"uid": user_id, "rid": role_id})
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
    # Raw delete
    sql = text("""
        DELETE FROM "UZYTKOWNIK_ROLE"
        WHERE "uzytkownik_id" = :uid AND "rola_id" = :rid
    """)
    await db.execute(sql, {"uid": user_id, "rid": role_id})
    await db.commit()
    return {"message": "Rola usunięta"}

# ===================== ZARZĄDZANIE ROLAMI =====================

@router.get("/roles", response_model=List[RoleResponse])
async def list_roles(
    current_user: Uzytkownik = Depends(require_permission("admin.roles.view")),
    db: AsyncSession = Depends(get_db)
):
    sql = text("""
        SELECT "id", "nazwa", "opis", "created_at"
        FROM "ROLE"
        ORDER BY "id"
    """)
    result = await db.execute(sql)
    rows = result.mappings().all()
    return [RoleResponse(**row) for row in rows]

@router.post("/roles", response_model=RoleResponse)
async def create_role(
    role_data: RoleCreate,
    current_user: Uzytkownik = Depends(require_permission("admin.roles.create")),
    db: AsyncSession = Depends(get_db)
):
    # Sprawdź czy istnieje
    check_sql = text("SELECT 1 FROM \"ROLE\" WHERE \"nazwa\" = :nazwa")
    exists = await db.execute(check_sql, {"nazwa": role_data.nazwa})
    if exists.first():
        raise HTTPException(status_code=400, detail="Rola już istnieje")
    # Insert raw
    insert_sql = text("""
        INSERT INTO "ROLE" ("nazwa", "opis")
        VALUES (:nazwa, :opis)
        RETURNING "id", "nazwa", "opis", "created_at"
    """)
    result = await db.execute(insert_sql, {"nazwa": role_data.nazwa, "opis": role_data.opis})
    row = result.mappings().first()
    await db.commit()
    await log_audit(db, current_user.id, "ROLE", row["id"], "INSERT", None, role_data.dict())
    return RoleResponse(**row)

@router.put("/roles/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: int,
    role_data: RoleUpdate,
    current_user: Uzytkownik = Depends(require_permission("admin.roles.edit")),
    db: AsyncSession = Depends(get_db)
):
    # Sprawdź czy rola istnieje
    check_sql = text("SELECT 1 FROM \"ROLE\" WHERE \"id\" = :rid")
    exists = await db.execute(check_sql, {"rid": role_id})
    if not exists.first():
        raise HTTPException(404, "Rola nie istnieje")
    # Aktualizacja
    update_sql = text("""
        UPDATE "ROLE" 
        SET "nazwa" = COALESCE(:nazwa, "nazwa"),
            "opis" = COALESCE(:opis, "opis")
        WHERE "id" = :rid
        RETURNING "id", "nazwa", "opis", "created_at"
    """)
    result = await db.execute(update_sql, {
        "rid": role_id,
        "nazwa": role_data.nazwa,
        "opis": role_data.opis
    })
    row = result.mappings().first()
    await db.commit()
    await log_audit(db, current_user.id, "ROLE", role_id, "UPDATE", None, role_data.dict())
    return RoleResponse(**row)

@router.delete("/roles/{role_id}")
async def delete_role(
    role_id: int,
    current_user: Uzytkownik = Depends(require_permission("admin.roles.delete")),
    db: AsyncSession = Depends(get_db)
):
    delete_sql = text("DELETE FROM \"ROLE\" WHERE \"id\" = :rid")
    result = await db.execute(delete_sql, {"rid": role_id})
    if result.rowcount == 0:
        raise HTTPException(404, "Rola nie istnieje")
    await db.commit()
    await log_audit(db, current_user.id, "ROLE", role_id, "DELETE", None, None)
    return {"message": "Rola usunięta"}

# ===================== ZARZĄDZANIE GATUNKAMI =====================

@router.get("/gatunki", response_model=List[GatunekResponse])
async def list_gatunki(
    skip: int = 0,
    limit: int = 100,
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    sql = text("""
        SELECT "id", "nazwa_polska", "nazwa_lacina", "url_zdjecia", "opis", "created_at", "updated_at"
        FROM "GATUNKI"
        WHERE "deleted_at" IS NULL
        ORDER BY "nazwa_polska"
        LIMIT :limit OFFSET :skip
    """)
    result = await db.execute(sql, {"limit": limit, "skip": skip})
    rows = result.mappings().all()
    return [GatunekResponse(**row) for row in rows]

@router.post("/gatunki", response_model=GatunekResponse)
async def create_gatunek(
    data: GatunekCreate,
    current_user: Uzytkownik = Depends(require_permission("gatunki.create")),
    db: AsyncSession = Depends(get_db)
):
    # Sprawdź czy istnieje
    check_sql = text("SELECT 1 FROM \"GATUNKI\" WHERE \"nazwa_polska\" = :nazwa")
    exists = await db.execute(check_sql, {"nazwa": data.nazwa_polska})
    if exists.first():
        raise HTTPException(status_code=400, detail="Gatunek już istnieje")
    # Insert raw
    insert_sql = text("""
        INSERT INTO "GATUNKI" ("nazwa_polska", "nazwa_lacina", "url_zdjecia", "opis")
        VALUES (:nazwa_polska, :nazwa_lacina, :url_zdjecia, :opis)
        RETURNING "id", "nazwa_polska", "nazwa_lacina", "url_zdjecia", "opis", "created_at", "updated_at"
    """)
    result = await db.execute(insert_sql, data.dict())
    row = result.mappings().first()
    await db.commit()
    await log_audit(db, current_user.id, "GATUNKI", row["id"], "INSERT", None, data.dict())
    return GatunekResponse(**row)

@router.put("/gatunki/{gatunek_id}", response_model=GatunekResponse)
async def update_gatunek(
    gatunek_id: int,
    data: GatunekUpdate,
    current_user: Uzytkownik = Depends(require_permission("gatunki.edit")),
    db: AsyncSession = Depends(get_db)
):
    # Sprawdź czy istnieje i nie jest usunięty
    check_sql = text("SELECT 1 FROM \"GATUNKI\" WHERE \"id\" = :gid AND \"deleted_at\" IS NULL")
    exists = await db.execute(check_sql, {"gid": gatunek_id})
    if not exists.first():
        raise HTTPException(status_code=404, detail="Gatunek nie znaleziony")
    
    update_sql = text("""
        UPDATE "GATUNKI"
        SET "nazwa_polska" = COALESCE(:nazwa_polska, "nazwa_polska"),
            "nazwa_lacina" = COALESCE(:nazwa_lacina, "nazwa_lacina"),
            "url_zdjecia" = COALESCE(:url_zdjecia, "url_zdjecia"),
            "opis" = COALESCE(:opis, "opis")
        WHERE "id" = :gid
        RETURNING "id", "nazwa_polska", "nazwa_lacina", "url_zdjecia", "opis", "created_at", "updated_at"
    """)
    result = await db.execute(update_sql, {**data.dict(exclude_unset=True), "gid": gatunek_id})
    row = result.mappings().first()
    await db.commit()
    await log_audit(db, current_user.id, "GATUNKI", gatunek_id, "UPDATE", None, data.dict(exclude_unset=True))
    return GatunekResponse(**row)

@router.delete("/gatunki/{gatunek_id}")
async def delete_gatunek(
    gatunek_id: int,
    current_user: Uzytkownik = Depends(require_permission("gatunki.delete")),
    db: AsyncSession = Depends(get_db)
):
    # Miękkie usunięcie – ustawienie deleted_at
    update_sql = text("""
        UPDATE "GATUNKI"
        SET "deleted_at" = NOW()
        WHERE "id" = :gid AND "deleted_at" IS NULL
        RETURNING "id"
    """)
    result = await db.execute(update_sql, {"gid": gatunek_id})
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Gatunek nie znaleziony")
    await db.commit()
    await log_audit(db, current_user.id, "GATUNKI", gatunek_id, "DELETE", None, None)
    return {"message": "Gatunek usunięty"}