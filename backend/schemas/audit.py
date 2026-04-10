# Plik: schemas/audit.py
# Schematy dla logów audytu (tylko odczyt – nie można tworzyć ani modyfikować).
# Używane przez: routers/admin.py (podgląd logów)

from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class LogAudytuResponse(BaseModel):
    id: int
    uzytkownik_id: int
    tabela: str
    rekord_id: int
    akcja: str  # INSERT, UPDATE, DELETE
    stare_dane: Optional[Dict[str, Any]] = None
    nowe_dane: Optional[Dict[str, Any]] = None
    data_czas: datetime

    class Config:
        from_attributes = True

# Klasa do filtrowania logów (query params)
class LogAudytuFilter(BaseModel):
    tabela: Optional[str] = None
    akcja: Optional[str] = None
    uzytkownik_id: Optional[int] = None
    od_datetime: Optional[datetime] = None
    do_datetime: Optional[datetime] = None