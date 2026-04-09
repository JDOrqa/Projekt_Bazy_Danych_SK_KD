from fastapi import APIRouter, Depends, HTTPException  
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
import crud, schemas
from jwt_utils import get_current_user
import models

router = APIRouter(prefix="/api/lowiska", tags=["lowiska"])

@router.get("/", response_model=list[schemas.LowiskoOut])
async def list_lowiska(db: AsyncSession = Depends(get_db)):
    return await crud.get_lowiska(db)

@router.get("/{lowisko_id}", response_model=schemas.LowiskoOut)
async def get_lowisko(lowisko_id: int, db: AsyncSession = Depends(get_db)):
    lowisko = await crud.get_lowisko_by_id(db, lowisko_id)
    if not lowisko:
        raise HTTPException(status_code=404, detail="Łowisko nie znalezione")
    return lowisko

@router.post("/", response_model=schemas.LowiskoOut)
async def create_lowisko(
    lowisko: schemas.LowiskoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.Uzytkownik = Depends(get_current_user)
):
    return await crud.create_lowisko(db, lowisko, current_user.id)

@router.put("/{lowisko_id}", response_model=schemas.LowiskoOut)
async def update_lowisko(
    lowisko_id: int,
    lowisko: schemas.LowiskoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.Uzytkownik = Depends(get_current_user)
):
    existing_lowisko = await crud.get_lowisko_by_id(db, lowisko_id)
    if not existing_lowisko:
        raise HTTPException(status_code=404, detail="Łowisko nie znalezione")
    
    # Sprawdzić czy użytkownik jest właścicielem łowiska
    if existing_lowisko.wlasciciel_id != current_user.id:
        raise HTTPException(status_code=403, detail="Nie masz uprawnień do edycji tego łowiska")
    
    return await crud.update_lowisko(db, lowisko_id, lowisko)

@router.delete("/{lowisko_id}")
async def delete_lowisko(
    lowisko_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.Uzytkownik = Depends(get_current_user)
):
    lowisko = await crud.get_lowisko_by_id(db, lowisko_id)
    if not lowisko:
        raise HTTPException(status_code=404, detail="Łowisko nie znalezione")
    
    # Sprawdzić czy użytkownik jest właścicielem łowiska
    if lowisko.wlasciciel_id != current_user.id:
        raise HTTPException(status_code=403, detail="Nie masz uprawnień do usunięcia tego łowiska")
    
    await crud.delete_lowisko(db, lowisko_id)
    return {"detail": "Łowisko zostało usunięte"}