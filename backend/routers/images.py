from fastapi import APIRouter, UploadFile, File, Form, Depends, status
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from dependencies.auth import get_current_user
from models.uzytkownik import Uzytkownik
from models.rola import Rola, UzytkownikRola
from models.zdjecie_ryby import ZdjecieRyby
from sqlalchemy import select
from fastapi import HTTPException
from sqlalchemy.sql import func
import uuid
import os

router = APIRouter()

async def is_admin_or_moderator(user: Uzytkownik, db: AsyncSession) -> bool:
    result = await db.execute(
        select(Rola.nazwa)
        .join(UzytkownikRola, Rola.id == UzytkownikRola.rola_id)
        .where(UzytkownikRola.uzytkownik_id == user.id)
        .where(Rola.nazwa.in_(["Admin", "Moderator"]))
    )
    roles = result.scalars().all()
    return len(roles) > 0

@router.post("/verification/submit", status_code=status.HTTP_201_CREATED)
async def submit_photo_for_verification(
    photo: UploadFile = File(...),
    species_id: Optional[int] = Form(None),
    length_cm: Optional[float] = Form(None),
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Walidacja formatu pliku
    if photo.content_type not in ["image/jpeg", "image/png"]:
        return {"error": "Nieobsługiwany format pliku. Dozwolone: JPEG, PNG."}
    # Generowanie unikalnej nazwy pliku
    file_extension = os.path.splitext(photo.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join("uploads", unique_filename)
    # Zapis pliku na dysku
    with open(file_path, "wb") as buffer:
        buffer.write(await photo.read())
    # Tworzenie rekordu w bazie danych
    new_photo = ZdjecieRyby(
        url_zdjecia=file_path,
        species_id=species_id,
        length_cm=length_cm,
        status=0  # do weryfikacji
    )
    db.add(new_photo)
    await db.commit()
    await db.refresh(new_photo)
    return {
    "id": new_photo.id,
    "url_zdjecia": new_photo.url_zdjecia,
    "species_id": new_photo.species_id,
    "length_cm": new_photo.length_cm,
    "status": new_photo.status,
    "created_at": str(new_photo.created_at)
}

@router.get("/verification/pending")
async def get_pending_photos_for_verification(
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    #sprawdzenie czy użytkownik ma rolę Admin lub Moderator
    if not await is_admin_or_moderator(current_user, db):
        raise HTTPException(status_code=403, detail="Brak uprawnień do przeglądania zdjęć do weryfikacji.")

    #pobieranie zdjęć ze statusem 0 (do weryfikacji)
    result = await db.execute(select(ZdjecieRyby).where(ZdjecieRyby.status == 0))
    pending_photos = result.scalars().all()
    return [
        {
            "id": photo.id,
            "url_zdjecia": photo.url_zdjecia,
            "species_id": photo.species_id,
            "length_cm": photo.length_cm,
            "status": photo.status,
            "created_at": str(photo.created_at)
        }
        for photo in pending_photos
    ]

@router.post("/verification/{photo_id}/review")
async def review_photo_verification(
    photo_id: int,
    action: str = Form(...),  # "approve" lub "reject"
    current_user: Uzytkownik = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    #sprawdzenie czy użytkownik ma rolę Admin lub Moderator
    if not await is_admin_or_moderator(current_user, db):
        raise HTTPException(status_code=403, detail="Brak uprawnień do weryfikacji zdjęć.")

    #pobieranie zdjęcia po ID
    result = await db.execute(select(ZdjecieRyby).where(ZdjecieRyby.id == photo_id))
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=404, detail="Zdjęcie nie znalezione.")
    
    #aktualizacja statusu zdjęcia
    if action == "approve":
        photo.status = 1  # zaakceptowane
    elif action == "reject":
        photo.status = 2  # odrzucone
    else:
        raise HTTPException(status_code=400, detail="Nieprawidłowa akcja. Dozwolone: approve, reject.")
            
    photo.moderator_id = current_user.id
    photo.verified_at = func.now()
    await db.commit()
    return {"message": f"Zdjęcie {'zaakceptowane' if action == 'approve' else 'odrzucone'}."}
