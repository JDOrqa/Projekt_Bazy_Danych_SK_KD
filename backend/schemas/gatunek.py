# Plik: schemas/gatunek.py
# Schematy dla gatunków ryb. Używane przez: routers/admin.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class GatunekBase(BaseModel):
    nazwa_polska: str
    nazwa_lacina: str
    url_zdjecia: Optional[str] = None
    opis: Optional[str] = None

class GatunekCreate(GatunekBase):
    pass

class GatunekUpdate(BaseModel):
    nazwa_polska: Optional[str] = None
    nazwa_lacina: Optional[str] = None
    url_zdjecia: Optional[str] = None
    opis: Optional[str] = None

class GatunekResponse(GatunekBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True # pozwala na tworzenie obiektu z atrybutów modelu (np. z SQLAlchemy)