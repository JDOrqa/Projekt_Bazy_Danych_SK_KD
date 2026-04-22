from models.uzytkownik import Uzytkownik
from pydantic import BaseModel
from typing import Optional, List, Tuple
from datetime import datetime

class WizytaCreate(BaseModel):
    lowisko_id: int
    data_wizyty: Optional[datetime] = None
    lokalizacja_przybycia: Optional[Tuple[float, float]] = None  #lon, lat
    uwagi: Optional[str] = None

class WizytaResponse(BaseModel):
    id: int
    uzytkownik_id: int
    lowisko_id: int
    data_wizyty: datetime
    lokalizacja_przybycia: Optional[Tuple[float, float]] = None  
    uwagi: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True # To pozwoli na konwersję z obiektów SQLAlchemy do Pydantic bo w routerze będziemy pobierac przez SQLAlchemy i chcemy zwrócić jako Pydantic


class WizytaAggregateResponse(BaseModel):
    uzytkownik_id: int
    lowisko_id: int
    liczba_wizyt: int
    ostatnia_wizyta: Optional[datetime] = None
    updated_at: datetime 

    class Config:
        from_attributes = True