# Plik: schemas/ryba.py
# Schematy dla złowionej ryby (ZlowionaRyba).
# Używane przez: routers/catches.py

from pydantic import BaseModel, Field, validator
from typing import Optional, Tuple
from datetime import datetime

class ZlowionaRybaBase(BaseModel):
    sesja_id: int
    gatunek_id: int
    metoda_id: Optional[int] = None
    przyneta_id: Optional[int] = None
    waga_kg: Optional[float] = Field(None, gt=0, le=500)
    dlugosc_cm: Optional[float] = Field(None, gt=0, le=300)
    wypuszczona: bool = True
    pozycja_gps: Optional[Tuple[float, float]] = None
    czas_zlowienia: datetime
    uwagi: Optional[str] = Field(None, max_length=2000)

    @validator('waga_kg', 'dlugosc_cm')
    def positive_value(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Wartość musi być większa od 0')
        return v

class ZlowionaRybaCreate(ZlowionaRybaBase):
    pass

class ZlowionaRybaResponse(ZlowionaRybaBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True