# Plik: schemas/limit.py
# Schematy dla limitów połowowych (LimitPolowowy).
# Używane przez: routers/limits.py

from pydantic import BaseModel, Field, validator
from typing import Optional, Tuple
from datetime import date, datetime

class LimitPolowowyBase(BaseModel):
    lowisko_id: int
    gatunek_id: int
    wymiar_min_cm: Optional[float] = Field(None, gt=0)
    limit_dzienny: Optional[int] = Field(None, ge=0)
    sezon_ochronny: Optional[Tuple[date, date]] = None  # (data_start, data_end) – zamieniane na daterange

    @validator('sezon_ochronny')
    def validate_date_range(cls, v):
        if v and v[0] > v[1]:
            raise ValueError('Data początkowa nie może być późniejsza niż końcowa')
        return v

class LimitPolowowyCreate(LimitPolowowyBase):
    pass

class LimitPolowowyUpdate(BaseModel):
    wymiar_min_cm: Optional[float] = None
    limit_dzienny: Optional[int] = None
    sezon_ochronny: Optional[Tuple[date, date]] = None

class LimitPolowowyResponse(LimitPolowowyBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True