# Plik: schemas/sesja.py
# Schematy dla sesji połowu (SesjaPolowu).
# Używane przez: routers/catches.py

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Tuple
from datetime import datetime

class SesjaBase(BaseModel):
    lowisko_id: int
    start_czas: datetime
    koniec_czas: Optional[datetime] = None
    start_gps: Optional[Tuple[float, float]] = None  # (lon, lat)
    koniec_gps: Optional[Tuple[float, float]] = None
    uwagi: Optional[str] = Field(None, max_length=2000)

    @validator('koniec_czas')
    def validate_end_time(cls, v, values):
        if v and 'start_czas' in values and v < values['start_czas']:
            raise ValueError('Czas zakończenia nie może być wcześniejszy niż start')
        return v

class SesjaCreate(SesjaBase):
    pass

class SesjaUpdate(BaseModel):
    koniec_czas: Optional[datetime] = None
    koniec_gps: Optional[Tuple[float, float]] = None
    uwagi: Optional[str] = None

class SesjaResponse(SesjaBase):
    id: int
    uzytkownik_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True