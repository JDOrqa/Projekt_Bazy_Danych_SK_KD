from fastapi import APIRouter, Depends
from jwt_utils import get_current_user  # <--- ZMIENIONE

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/stats")
async def get_stats(current_user=Depends(get_current_user)):
    return {
        "liczba_sesji": 0,
        "liczba_ryb": 0,
        "ostatnia_aktywnosc": None
    }