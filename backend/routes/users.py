from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
import crud, schemas
from jwt_utils import get_current_user  # <--- ZMIENIONE

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("/me", response_model=schemas.UserOut)
async def read_users_me(current_user=Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=schemas.UserOut)
async def update_me(user_update: dict, current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Aktualizuj tylko pola które są dozwolone
    allowed_fields = {'imie', 'nazwisko', 'nr_licencji'}
    update_data = {k: v for k, v in user_update.items() if k in allowed_fields and v is not None}
    
    if not update_data:
        return current_user
    
    return await crud.update_user(db, current_user.id, update_data)

@router.delete("/me")
async def delete_me(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await crud.delete_user(db, current_user.id)
    return {"detail": "Konto zostało usunięte"}